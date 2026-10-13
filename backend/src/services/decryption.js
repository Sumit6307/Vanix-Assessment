/**
 * Packet Decryption Service
 * Handles AES-256-GCM decryption of encrypted packets from the gateway
 * 
 * SECURITY: The AES key is read from the AES_KEY environment variable.
 * This module never logs the key or the full plaintext.
 * 
 * BONUS FEATURE - KEY ROTATION:
 * Supports key changeover seamlessly by accepting packets encrypted with either:
 * 1. The primary AES_KEY
 * 2. Comma-separated keys in AES_KEY (e.g., "new_key,old_key")
 * 3. The fallback AES_KEY_OLD environment variable
 */

const crypto = require('crypto');

/**
 * Get list of candidate keys for decryption (supports key rotation)
 * @returns {Buffer[]} Array of 32-byte key Buffers
 */
function getCandidateKeys() {
  const rawKey = process.env.AES_KEY;
  if (!rawKey) {
    throw new Error('AES_KEY environment variable is not set');
  }

  const candidateHexes = [];

  // Support comma-separated keys in AES_KEY
  if (rawKey.includes(',')) {
    rawKey.split(',').forEach(k => {
      const trimmed = k.trim();
      if (trimmed) candidateHexes.push(trimmed);
    });
  } else {
    candidateHexes.push(rawKey.trim());
  }

  // Support separate AES_KEY_OLD variable
  if (process.env.AES_KEY_OLD) {
    const oldKey = process.env.AES_KEY_OLD.trim();
    if (oldKey && !candidateHexes.includes(oldKey)) {
      candidateHexes.push(oldKey);
    }
  }

  // Validate all candidate keys
  const keys = candidateHexes.map(hex => {
    if (hex.length !== 64) {
      throw new Error(`AES_KEY must be a 64-character hex string (32 bytes), got length ${hex.length}`);
    }
    return Buffer.from(hex, 'hex');
  });

  return keys;
}

/**
 * Decrypt an encrypted packet body using AES-256-GCM
 * 
 * @param {Object} body - The encrypted packet body
 * @param {string} body.gatewayId - Gateway identifier
 * @param {string} body.iv - 12-byte nonce, base64 encoded
 * @param {string} body.ciphertext - Encrypted plaintext, base64 encoded
 * @param {string} body.tag - 16-byte GCM authentication tag, base64 encoded
 * @returns {{ plaintext: string, parsed: Object }} The decrypted plaintext JSON string and parsed object
 * @throws {Error} If decryption fails, tag verification fails, or key is missing
 */
function decryptPacket(body) {
  // Validate required fields
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body: must be a JSON object');
  }
  if (!body.iv || !body.ciphertext || !body.tag) {
    throw new Error('Missing required fields: iv, ciphertext, tag');
  }

  const keys = getCandidateKeys();

  const iv = Buffer.from(body.iv, 'base64');
  const ciphertext = Buffer.from(body.ciphertext, 'base64');
  const tag = Buffer.from(body.tag, 'base64');

  // Validate IV length (12 bytes for GCM)
  if (iv.length !== 12) {
    throw new Error(`Invalid IV length: expected 12 bytes, got ${iv.length}`);
  }

  // Validate tag length (16 bytes for GCM)
  if (tag.length !== 16) {
    throw new Error(`Invalid tag length: expected 16 bytes, got ${tag.length}`);
  }

  let lastError = null;

  // Try each candidate key (primary new key first, then old key)
  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      let plaintext = decipher.update(ciphertext, null, 'utf8');
      plaintext += decipher.final('utf8');

      // Parse the plaintext as JSON
      let parsed;
      try {
        parsed = JSON.parse(plaintext);
      } catch (e) {
        throw new Error('Decrypted plaintext is not valid JSON');
      }

      return { plaintext, parsed };
    } catch (error) {
      lastError = error;
      // If tag verification fails, try next key in rotation list
      continue;
    }
  }

  // If all candidate keys failed
  if (lastError && (lastError.message.includes('Unsupported state') || lastError.message.includes('unable to authenticate'))) {
    throw new Error('Decryption failed: authentication tag verification failed (data may be tampered)');
  }
  throw lastError || new Error('Decryption failed');
}

module.exports = { decryptPacket };
