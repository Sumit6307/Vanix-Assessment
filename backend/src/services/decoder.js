/**
 * Packet Decoder Service
 * Decodes the 256-byte binary packet format from field devices
 * 
 * Packet format (after decryption, the "data" array contains 256 bytes):
 * 
 * Bytes 0-1:    Header (0xA5, 0x5A)
 * Byte 2:       Format version (always 2)
 * Byte 3:       Sequence number (0-255, wraps)
 * Bytes 4-7:    Device ID (uint32, little-endian)
 * Bytes 8-11:   Timestamp (uint32, Unix seconds, little-endian)
 * Bytes 12-13:  Temperature (int16, hundredths of °C, little-endian, two's complement)
 * Byte 14:      Battery (uint8, percent 0-100)
 * Byte 15:      Sample count (always 16)
 * Bytes 16-111: Motion samples (16 × 3 × int16) - X, Y, Z in milli-g
 * Bytes 112-127: Device label (16 ASCII chars, zero-padded)
 * Bytes 128-251: Reserved (always 0)
 * Bytes 252-253: Checksum (uint16, sum of bytes 0-251 mod 65536, little-endian)
 * Bytes 254-255: Footer (0x5A, 0xA5)
 */

/**
 * Read a uint16 (little-endian) from the data array
 * @param {number[]} data - The byte array
 * @param {number} offset - Start index
 * @returns {number}
 */
function readUint16LE(data, offset) {
  return data[offset] | (data[offset + 1] << 8);
}

/**
 * Read an int16 (little-endian, two's complement) from the data array
 * @param {number[]} data - The byte array
 * @param {number} offset - Start index
 * @returns {number}
 */
function readInt16LE(data, offset) {
  const val = data[offset] | (data[offset + 1] << 8);
  // Convert to signed: if bit 15 is set, it's negative
  return val >= 0x8000 ? val - 0x10000 : val;
}

/**
 * Read a uint32 (little-endian) from the data array
 * @param {number[]} data - The byte array
 * @param {number} offset - Start index
 * @returns {number}
 */
function readUint32LE(data, offset) {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    ((data[offset + 3] << 24) >>> 0)  // >>> 0 to keep as unsigned
  );
}

/**
 * Decode a 256-byte packet data array into structured fields
 * 
 * @param {number[]} data - Array of exactly 256 integers (0-255)
 * @returns {Object} Decoded packet with all fields
 * @throws {Error} If packet validation fails
 */
function decodePacket(data) {
  // === VALIDATION ===

  // Check data is an array of exactly 256 values
  if (!Array.isArray(data)) {
    throw new Error('Packet data must be an array');
  }
  if (data.length !== 256) {
    throw new Error(`Packet must be exactly 256 bytes, got ${data.length}`);
  }

  // Check all values are integers 0-255
  for (let i = 0; i < 256; i++) {
    if (!Number.isInteger(data[i]) || data[i] < 0 || data[i] > 255) {
      throw new Error(`Invalid byte value at index ${i}: ${data[i]} (must be integer 0-255)`);
    }
  }

  // Check header: 0xA5 0x5A (165, 90)
  if (data[0] !== 0xA5 || data[1] !== 0x5A) {
    throw new Error(`Invalid header: expected [0xA5, 0x5A], got [0x${data[0].toString(16)}, 0x${data[1].toString(16)}]`);
  }

  // Check footer: 0x5A 0xA5 (90, 165)
  if (data[254] !== 0x5A || data[255] !== 0xA5) {
    throw new Error(`Invalid footer: expected [0x5A, 0xA5], got [0x${data[254].toString(16)}, 0x${data[255].toString(16)}]`);
  }

  // Check format version
  if (data[2] !== 2) {
    throw new Error(`Unsupported format version: expected 2, got ${data[2]}`);
  }

  // Verify checksum: sum of bytes 0-251 mod 65536
  let computedChecksum = 0;
  for (let i = 0; i < 252; i++) {
    computedChecksum = (computedChecksum + data[i]) & 0xFFFF; // mod 65536
  }
  const storedChecksum = readUint16LE(data, 252);
  if (computedChecksum !== storedChecksum) {
    throw new Error(`Checksum mismatch: computed ${computedChecksum}, stored ${storedChecksum}`);
  }

  // === DECODE FIELDS ===

  const sequence = data[3];
  const deviceId = readUint32LE(data, 4);
  const timestamp = readUint32LE(data, 8);

  // Temperature: int16 in hundredths of °C
  const tempRaw = readInt16LE(data, 12);
  const temperature = tempRaw / 100; // Convert to °C with decimal

  const battery = data[14];
  const sampleCount = data[15]; // Should always be 16

  // Decode 16 motion samples (each is 3 × int16 = 6 bytes)
  const samples = [];
  for (let i = 0; i < 16; i++) {
    const offset = 16 + i * 6;
    samples.push({
      x: readInt16LE(data, offset),
      y: readInt16LE(data, offset + 2),
      z: readInt16LE(data, offset + 4)
    });
  }

  // Decode device label: 16 ASCII chars, zero-padded
  let label = '';
  for (let i = 112; i < 128; i++) {
    if (data[i] === 0) break;
    label += String.fromCharCode(data[i]);
  }

  return {
    sequence,
    deviceId,
    timestamp,
    temperature,
    battery,
    sampleCount,
    samples,
    label,
    checksum: storedChecksum
  };
}

/**
 * Compute the activity score for a set of motion samples
 * Activity score = average of |magnitude - 1000| over all 16 samples
 * where magnitude = sqrt(X² + Y² + Z²) in milli-g
 * 
 * A device at rest reads about 1000 milli-g (1g of gravity).
 * High activity score means the device is moving significantly.
 * 
 * @param {Array<{x: number, y: number, z: number}>} samples - The 16 motion samples
 * @returns {number} Activity score rounded to 2 decimal places
 */
function computeActivityScore(samples) {
  if (!samples || samples.length === 0) return 0;

  let totalDeviation = 0;
  for (const sample of samples) {
    const magnitude = Math.sqrt(
      sample.x * sample.x +
      sample.y * sample.y +
      sample.z * sample.z
    );
    totalDeviation += Math.abs(magnitude - 1000);
  }

  return Math.round((totalDeviation / samples.length) * 100) / 100;
}

module.exports = { decodePacket, computeActivityScore, readInt16LE, readUint16LE, readUint32LE };
