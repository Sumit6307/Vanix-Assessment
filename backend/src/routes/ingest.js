/**
 * Ingest API Route
 * POST /api/ingest - Receives encrypted packets from the gateway
 */

const express = require('express');
const router = express.Router();
const { ingestPacket } = require('../services/ingest');

/**
 * POST /api/ingest
 * Body: { gatewayId, iv, ciphertext, tag }
 * 
 * Stores raw encrypted packet, decrypts, decodes, stores reading, checks alerts.
 * Returns 201 for new readings, 200 for duplicates, 400 for validation errors.
 */
router.post('/', (req, res) => {
  try {
    const { gatewayId, iv, ciphertext, tag } = req.body;

    // Validate required fields
    if (!iv || !ciphertext || !tag) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Request body must include iv, ciphertext, and tag'
      });
    }

    // Bonus Feature: Gateway API Key Authentication
    const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
    const expectedKey = process.env.GATEWAY_API_KEY || 'vanix-gateway-key-2026';
    if (process.env.ENFORCE_GATEWAY_KEY === 'true') {
      if (!apiKey || (apiKey !== expectedKey && apiKey !== `Bearer ${expectedKey}`)) {
        return res.status(401).json({
          error: 'Unauthorized',
          details: 'Valid Gateway API key required in X-API-Key or Authorization header'
        });
      }
    }

    const result = ingestPacket(req.body);

    if (result.status === 'duplicate') {
      return res.status(200).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    // Decryption or validation failures → 400
    if (
      error.message.includes('Decryption failed') ||
      error.message.includes('Invalid') ||
      error.message.includes('Checksum') ||
      error.message.includes('Unsupported') ||
      error.message.includes('Packet') ||
      error.message.includes('Missing') ||
      error.message.includes('must be')
    ) {
      return res.status(400).json({
        error: 'Bad request',
        details: error.message
      });
    }

    console.error('[INGEST ERROR]', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;
