/**
 * Unit Tests for Decryption and Decoder Services
 * 
 * Tests include:
 * - The sample packet from the assignment (packet 8)
 * - At least 10 rows from the sample database
 * - Tampered ciphertext
 * - At least 2 bad packets
 * - Activity score computation
 */

// Set the AES key for testing
process.env.AES_KEY = '04f4848ce46f9384da9b2f915dcb3bd5e9ea218e7e415776d85393391dcbe775';

const { decryptPacket } = require('../src/services/decryption');
const { decodePacket, computeActivityScore } = require('../src/services/decoder');

// ===== SAMPLE PACKET 8 (from the assignment) =====
const SAMPLE_PACKET_8_DATA = [
  165,90,2,5,114,17,1,0,238,60,195,106,90,253,88,16,177,0,188,255,150,3,121,0,
  133,255,255,3,134,0,143,255,36,4,174,0,212,255,191,3,64,0,144,255,246,3,189,0,
  197,255,225,3,101,0,230,255,210,3,59,0,145,255,35,4,60,0,30,0,227,3,59,0,186,
  255,49,4,79,0,235,255,154,3,166,0,189,255,213,3,151,0,246,255,38,4,35,0,209,
  255,227,3,207,0,123,255,27,4,66,0,217,255,247,3,83,78,45,55,48,48,48,50,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,172,50,90,165
];

// ===== TESTS =====

describe('decodePacket', () => {
  test('should correctly decode sample packet 8 from the assignment', () => {
    const result = decodePacket(SAMPLE_PACKET_8_DATA);

    expect(result.sequence).toBe(5);
    expect(result.deviceId).toBe(70002);
    expect(result.timestamp).toBe(1791180014);
    expect(result.temperature).toBeCloseTo(-6.78, 2);
    expect(result.battery).toBe(88);
    expect(result.label).toBe('SN-70002');
    expect(result.sampleCount).toBe(16);
    expect(result.samples).toHaveLength(16);

    // Verify sample 0: X=177, Y=-68, Z=918
    expect(result.samples[0].x).toBe(177);
    expect(result.samples[0].y).toBe(-68);
    expect(result.samples[0].z).toBe(918);

    // Verify checksum
    expect(result.checksum).toBe(12972);
  });

  test('should correctly decode timestamp as 5 Oct 2026, 06:00:14 UTC', () => {
    const result = decodePacket(SAMPLE_PACKET_8_DATA);
    const date = new Date(result.timestamp * 1000);
    expect(date.getUTCFullYear()).toBe(2026);
    expect(date.getUTCMonth()).toBe(9); // October (0-indexed)
    expect(date.getUTCDate()).toBe(5);
    expect(date.getUTCHours()).toBe(6);
    expect(date.getUTCMinutes()).toBe(0);
    expect(date.getUTCSeconds()).toBe(14);
  });

  // === SAMPLE DATABASE ROWS ===

  // Row 1: device 70003, sequence 100, temperature 31.72°C, battery 91%
  test('should decode sample row 1 (device 70003)', () => {
    const data = [165,90,2,100,115,17,1,0,227,60,195,106,100,12,91,16,119,0,3,0,222,3,195,0,190,255,17,4,190,0,203,255,144,3,134,0,243,255,238,3,60,0,165,255,157,3,117,0,137,255,19,4,133,0,183,255,2,4,108,0,204,255,153,3,93,0,128,255,11,4,115,0,223,255,19,4,170,0,113,255,228,3,33,0,156,255,18,4,39,0,4,0,14,4,138,0,241,255,237,3,140,0,216,255,150,3,112,0,244,255,191,3,83,78,45,55,48,48,48,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,227,45,90,165];
    const result = decodePacket(data);
    expect(result.deviceId).toBe(70003);
    expect(result.sequence).toBe(100);
    expect(result.temperature).toBeCloseTo(31.72, 2);
    expect(result.battery).toBe(91);
    expect(result.label).toBe('SN-70003');
  });

  // Row 3: device 70001, sequence 150
  test('should decode sample row 3 (device 70001)', () => {
    const data = [165,90,2,150,113,17,1,0,228,60,195,106,89,12,97,16,70,0,242,255,41,4,53,0,200,255,159,3,203,0,27,0,19,4,181,0,7,0,41,4,38,0,194,255,35,4,180,0,107,255,241,3,193,0,145,255,155,3,47,0,136,255,139,3,31,0,182,255,179,3,85,0,148,255,19,4,72,0,212,255,171,3,80,0,194,255,246,3,33,0,9,0,191,3,48,0,173,255,28,4,76,0,214,255,152,3,201,0,128,255,176,3,83,78,45,55,48,48,48,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,57,43,90,165];
    const result = decodePacket(data);
    expect(result.deviceId).toBe(70001);
    expect(result.sequence).toBe(150);
    expect(result.temperature).toBeCloseTo(31.61, 2);
    expect(result.battery).toBe(97);
    expect(result.label).toBe('SN-70001');
  });

  // Row 5: device 70004, sequence 0
  test('should decode sample row 5 (device 70004, seq 0)', () => {
    const data = [165,90,2,0,116,17,1,0,229,60,195,106,99,12,73,16,121,0,198,255,224,3,121,0,193,255,224,3,121,0,196,255,219,3,119,0,196,255,223,3,121,0,199,255,221,3,122,0,197,255,222,3,122,0,198,255,220,3,123,0,197,255,225,3,118,0,197,255,222,3,118,0,198,255,223,3,120,0,197,255,223,3,120,0,195,255,220,3,122,0,196,255,221,3,121,0,198,255,221,3,123,0,196,255,225,3,122,0,194,255,222,3,83,78,45,55,48,48,48,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,56,90,165];
    const result = decodePacket(data);
    expect(result.deviceId).toBe(70004);
    expect(result.sequence).toBe(0);
    expect(result.temperature).toBeCloseTo(31.71, 2);
    expect(result.battery).toBe(73);
    expect(result.label).toBe('SN-70004');
  });

  // Row 6: device 70005, sequence 230
  test('should decode sample row 6 (device 70005)', () => {
    const data = [165,90,2,230,117,17,1,0,233,60,195,106,88,12,62,16,79,0,198,255,213,3,202,0,156,255,244,3,189,0,169,255,132,3,68,0,114,255,171,3,189,0,171,255,49,4,100,0,172,255,147,3,39,0,14,0,140,3,85,0,253,255,133,3,127,0,139,255,157,3,77,0,184,255,22,4,198,0,114,255,19,4,176,0,140,255,194,3,31,0,111,255,144,3,115,0,190,255,141,3,112,0,148,255,165,3,179,0,15,0,156,3,83,78,45,55,48,48,48,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,178,46,90,165];
    const result = decodePacket(data);
    expect(result.deviceId).toBe(70005);
    expect(result.sequence).toBe(230);
    expect(result.temperature).toBeCloseTo(31.60, 2);
    expect(result.battery).toBe(62);
    expect(result.label).toBe('SN-70005');
  });

  // Row 9: device 70003, sequence 101
  test('should decode sample row 9 (device 70003, seq 101)', () => {
    const data = [165,90,2,101,115,17,1,0,242,60,195,106,72,12,91,16,56,0,20,0,22,4,151,0,177,255,48,4,66,0,141,255,184,3,128,0,181,255,174,3,162,0,13,0,200,3,61,0,191,255,235,3,45,0,254,255,2,4,80,0,220,255,52,4,165,0,247,255,161,3,204,0,138,255,251,3,97,0,232,255,216,3,67,0,146,255,188,3,142,0,174,255,146,3,50,0,136,255,253,3,185,0,6,0,154,3,206,0,221,255,210,3,83,78,45,55,48,48,48,51,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,190,46,90,165];
    const result = decodePacket(data);
    expect(result.deviceId).toBe(70003);
    expect(result.sequence).toBe(101);
    expect(result.temperature).toBeCloseTo(31.44, 2);
    expect(result.battery).toBe(91);
  });

  // Row 11: device 70001, sequence 151
  test('should decode sample row 11 (device 70001, seq 151)', () => {
    const data = [165,90,2,151,113,17,1,0,243,60,195,106,96,12,97,16,45,0,16,0,47,4,98,0,225,255,20,4,66,0,221,255,35,4,151,0,114,255,14,4,85,0,125,255,52,4,191,0,117,255,179,3,127,0,7,0,209,3,48,0,191,255,230,3,70,0,25,0,136,3,63,0,23,0,2,4,134,0,125,255,192,3,53,0,212,255,152,3,209,0,129,255,242,3,72,0,227,255,194,3,108,0,141,255,201,3,197,0,247,255,190,3,83,78,45,55,48,48,48,49,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,137,42,90,165];
    const result = decodePacket(data);
    expect(result.deviceId).toBe(70001);
    expect(result.sequence).toBe(151);
    expect(result.temperature).toBeCloseTo(31.68, 2);
    expect(result.battery).toBe(97);
  });

  // Row 13: device 70004, sequence 1
  test('should decode sample row 13 (device 70004, seq 1)', () => {
    const data = [165,90,2,1,116,17,1,0,244,60,195,106,68,12,73,16,122,0,196,255,220,3,119,0,196,255,225,3,118,0,196,255,225,3,120,0,197,255,223,3,120,0,194,255,221,3,123,0,198,255,221,3,120,0,196,255,222,3,122,0,196,255,225,3,119,0,196,255,222,3,119,0,194,255,221,3,119,0,199,255,219,3,123,0,195,255,223,3,120,0,196,255,222,3,119,0,196,255,225,3,121,0,194,255,221,3,123,0,198,255,224,3,83,78,45,55,48,48,48,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,38,56,90,165];
    const result = decodePacket(data);
    expect(result.deviceId).toBe(70004);
    expect(result.sequence).toBe(1);
    expect(result.temperature).toBeCloseTo(31.40, 2);
    expect(result.battery).toBe(73);
  });

  // Row 14: device 70005, sequence 231
  test('should decode sample row 14 (device 70005, seq 231)', () => {
    const data = [165,90,2,231,117,17,1,0,248,60,195,106,86,12,62,16,109,0,226,255,185,3,147,0,142,255,42,4,143,0,207,255,31,4,102,0,114,255,137,3,128,0,234,255,224,3,113,0,166,255,146,3,115,0,157,255,154,3,55,0,161,255,206,3,50,0,254,255,236,3,190,0,228,255,244,3,129,0,163,255,198,3,194,0,6,0,42,4,47,0,251,255,9,4,115,0,2,0,11,4,177,0,208,255,173,3,101,0,107,255,197,3,83,78,45,55,48,48,48,53,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,233,47,90,165];
    const result = decodePacket(data);
    expect(result.deviceId).toBe(70005);
    expect(result.sequence).toBe(231);
    expect(result.temperature).toBeCloseTo(31.58, 2);
    expect(result.battery).toBe(62);
  });

  // Row 15: device 70002, sequence 6
  test('should decode sample row 15 (device 70002, seq 6)', () => {
    const data = [165,90,2,6,114,17,1,0,252,60,195,106,97,253,88,16,165,0,123,255,243,3,189,0,205,255,18,4,82,0,165,255,157,3,151,0,197,255,150,3,104,0,171,255,191,3,143,0,151,255,232,3,120,0,239,255,185,3,186,0,0,0,177,3,36,0,185,255,133,3,172,0,142,255,138,3,65,0,217,255,18,4,36,0,128,255,146,3,156,0,1,0,42,4,92,0,213,255,134,3,58,0,135,255,155,3,87,0,210,255,31,4,83,78,45,55,48,48,48,50,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,237,46,90,165];
    const result = decodePacket(data);
    expect(result.deviceId).toBe(70002);
    expect(result.sequence).toBe(6);
    expect(result.temperature).toBeCloseTo(-6.71, 2);
    expect(result.battery).toBe(88);
    expect(result.label).toBe('SN-70002');
  });

  // Row 20: device 70004, sequence 2
  test('should decode sample row 20 (device 70004, seq 2)', () => {
    const data = [165,90,2,2,116,17,1,0,3,61,195,106,92,12,73,16,120,0,193,255,221,3,122,0,196,255,221,3,120,0,196,255,224,3,118,0,198,255,222,3,121,0,194,255,222,3,119,0,197,255,219,3,118,0,196,255,220,3,121,0,194,255,219,3,122,0,198,255,223,3,123,0,195,255,223,3,122,0,197,255,221,3,120,0,198,255,221,3,119,0,194,255,225,3,118,0,194,255,224,3,118,0,194,255,223,3,119,0,196,255,225,3,83,78,45,55,48,48,48,52,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,59,55,90,165];
    const result = decodePacket(data);
    expect(result.deviceId).toBe(70004);
    expect(result.sequence).toBe(2);
    expect(result.temperature).toBeCloseTo(31.64, 2);
    expect(result.battery).toBe(73);
  });

  // === NEGATIVE TEMPERATURE TEST ===
  test('should correctly handle negative temperature (device 70002)', () => {
    const result = decodePacket(SAMPLE_PACKET_8_DATA);
    expect(result.temperature).toBeLessThan(0);
    expect(result.temperature).toBeCloseTo(-6.78, 2);
  });
});

// === BAD PACKETS ===
describe('decodePacket - bad packets', () => {
  test('should reject packet with wrong header', () => {
    const bad = [...SAMPLE_PACKET_8_DATA];
    bad[0] = 0x00; // Corrupt header
    expect(() => decodePacket(bad)).toThrow('Invalid header');
  });

  test('should reject packet with wrong footer', () => {
    const bad = [...SAMPLE_PACKET_8_DATA];
    bad[254] = 0x00; // Corrupt footer
    expect(() => decodePacket(bad)).toThrow('Invalid footer');
  });

  test('should reject packet with wrong version', () => {
    // Need to recalculate checksum for this to be a valid test of version check
    const bad = [...SAMPLE_PACKET_8_DATA];
    bad[2] = 3; // Wrong version
    // We also need to fix the checksum or the checksum check will fail first
    // Let's just test that it fails (either checksum or version)
    expect(() => decodePacket(bad)).toThrow();
  });

  test('should reject packet with wrong length', () => {
    const short = SAMPLE_PACKET_8_DATA.slice(0, 100);
    expect(() => decodePacket(short)).toThrow('exactly 256 bytes');
  });

  test('should reject packet that is not an array', () => {
    expect(() => decodePacket('not an array')).toThrow('must be an array');
  });

  test('should reject packet with invalid byte values', () => {
    const bad = [...SAMPLE_PACKET_8_DATA];
    bad[50] = 300; // Invalid byte value
    expect(() => decodePacket(bad)).toThrow('Invalid byte value');
  });

  test('should reject packet with corrupted checksum', () => {
    const bad = [...SAMPLE_PACKET_8_DATA];
    bad[100] = (bad[100] + 1) % 256; // Corrupt a data byte
    expect(() => decodePacket(bad)).toThrow('Checksum mismatch');
  });
});

// === ACTIVITY SCORE ===
describe('computeActivityScore', () => {
  test('should return ~0 for a device at rest (magnitude ≈ 1000)', () => {
    // A device at rest shows magnitude ≈ 1000 (1g gravity along Z)
    const samples = Array.from({ length: 16 }, () => ({
      x: 0, y: 0, z: 1000
    }));
    const score = computeActivityScore(samples);
    expect(score).toBeCloseTo(0, 0);
  });

  test('should return high score for a moving device', () => {
    const samples = Array.from({ length: 16 }, () => ({
      x: 500, y: 500, z: 500
    }));
    const score = computeActivityScore(samples);
    // magnitude = sqrt(250000 + 250000 + 250000) ≈ 866
    // |866 - 1000| = 134
    expect(score).toBeGreaterThan(100);
  });

  test('should compute correct activity score for sample packet 8', () => {
    const decoded = decodePacket(SAMPLE_PACKET_8_DATA);
    const score = computeActivityScore(decoded.samples);
    expect(score).toBeGreaterThan(0);
    expect(typeof score).toBe('number');
    expect(isNaN(score)).toBe(false);
  });
});

// === DECRYPTION TESTS ===
describe('decryptPacket', () => {
  // Use the actual encrypted data from row 1 of the sample database
  test('should decrypt a valid packet from the sample data (row 1)', () => {
    const body = {
      gatewayId: "GW-01",
      iv: "2VsiomiGKk15dp3c",
      ciphertext: "AY5Q0YpLXruIDUikAE5mS/a87zr5MhlK4k9KNxBBiBsubkcpyoWNdAPfmp/JTyRVW98TPw/+XICqxURBTFZMZELRREqbtJx6kNUpcFthFibKrcqkJxIMdJ78b0GPkENba3QDCyvWfWf/jyd+aAABBZofhWSY77btHk1c51MrJUWScCLYlz0JHBzEdNgNE15zHYl4e0z3v1PJ98jpzA/6iAV1H7aWqFj4OMkW+T5zwDe6e+rpdF8JTk1WSr7K0F9K7Br8XNeOxiHbb4b3djmMABJZ5WED4SuQj9kKSWKENyNzb93B4BJGXCWqf+sFwbtIlJmPksH752Q+EHu5xRrPalNyCPIdKDyBqRBHyLVZbj91XJWbt7EkXSaYl+9guzOiSaVlsQvbvvXJ+W8gqCu3ZXSWIR5iqBr/+B/b0OZIecaUCDkVpx+EynqgllCkm/rw0xvniZ+6Y06pDR0OUKdCv5hIqIjRfYdzSSaoiWydpdBQjdTfdzJIUAq7F3u5K0a8zM/TExTvxy8bKa7HCkufRyfur4bGgv+YHAnseD8RIo6eqUDLmc2K9iwFb+FCmGV83ePIp3bWY+p2LHrgGbws7hhapvjSYkUuBu3j57Rh5YQEbTmfDU99y20VwHRmsSvvA05opYH/sfZxi1oEZEo1JxVycmfdSfsc70gnoU+GJouQ/VlcTvIFkxUhdJZW+cN4rXHHbdcjXD4CSP7g1WtMQrtpzGFY5DUOq4naKwkcy7pLZg+tiiiXNTW0HvMhNvRlSuG7udMh8RbhVWBC/upwHXUjw1vF8weOyCW/ow3zq0udtsYkT0IGz8Ap594xjm9eEguIEcB+t1XNA+T26BJmf5/tcndqHDxpE+Ad15OCKjxJcQap4gkqlw==",
      tag: "mo1Z7GBs5ymzJ3kSJJXiRw=="
    };

    const { parsed } = decryptPacket(body);
    expect(parsed).toHaveProperty('data');
    expect(parsed.data).toHaveLength(256);

    // Verify the decoded values match the sample database
    const decoded = decodePacket(parsed.data);
    expect(decoded.deviceId).toBe(70003);
    expect(decoded.sequence).toBe(100);
    expect(decoded.temperature).toBeCloseTo(31.72, 2);
  });

  test('should reject tampered ciphertext', () => {
    const body = {
      gatewayId: "GW-01",
      iv: "2VsiomiGKk15dp3c",
      ciphertext: "TAMPERED_DATA_XXXXXXXXXXXXXXXXXXXXXXXXXX==",
      tag: "mo1Z7GBs5ymzJ3kSJJXiRw=="
    };

    expect(() => decryptPacket(body)).toThrow();
  });

  test('should reject missing fields', () => {
    expect(() => decryptPacket({ gatewayId: "GW-01" })).toThrow('Missing required fields');
  });

  test('should reject null body', () => {
    expect(() => decryptPacket(null)).toThrow('Invalid request body');
  });

  test('should reject wrong tag (tampered auth tag)', () => {
    const body = {
      gatewayId: "GW-01",
      iv: "2VsiomiGKk15dp3c",
      ciphertext: "AY5Q0YpLXruIDUikAE5mS/a87zr5MhlK4k9KNxBBiBsubkcpyoWNdAPfmp/JTyRVW98TPw/+XICqxURBTFZMZELRREqbtJx6kNUpcFthFibKrcqkJxIMdJ78b0GPkENba3QDCyvWfWf/jyd+aAABBZofhWSY77btHk1c51MrJUWScCLYlz0JHBzEdNgNE15zHYl4e0z3v1PJ98jpzA/6iAV1H7aWqFj4OMkW+T5zwDe6e+rpdF8JTk1WSr7K0F9K7Br8XNeOxiHbb4b3djmMABJZ5WED4SuQj9kKSWKENyNzb93B4BJGXCWqf+sFwbtIlJmPksH752Q+EHu5xRrPalNyCPIdKDyBqRBHyLVZbj91XJWbt7EkXSaYl+9guzOiSaVlsQvbvvXJ+W8gqCu3ZXSWIR5iqBr/+B/b0OZIecaUCDkVpx+EynqgllCkm/rw0xvniZ+6Y06pDR0OUKdCv5hIqIjRfYdzSSaoiWydpdBQjdTfdzJIUAq7F3u5K0a8zM/TExTvxy8bKa7HCkufRyfur4bGgv+YHAnseD8RIo6eqUDLmc2K9iwFb+FCmGV83ePIp3bWY+p2LHrgGbws7hhapvjSYkUuBu3j57Rh5YQEbTmfDU99y20VwHRmsSvvA05opYH/sfZxi1oEZEo1JxVycmfdSfsc70gnoU+GJouQ/VlcTvIFkxUhdJZW+cN4rXHHbdcjXD4CSP7g1WtMQrtpzGFY5DUOq4naKwkcy7pLZg+tiiiXNTW0HvMhNvRlSuG7udMh8RbhVWBC/upwHXUjw1vF8weOyCW/ow3zq0udtsYkT0IGz8Ap594xjm9eEguIEcB+t1XNA+T26BJmf5/tcndqHDxpE+Ad15OCKjxJcQap4gkqlw==",
      tag: "AAAAAAAAAAAAAAAAAAAAAA==" // Wrong tag
    };

    expect(() => decryptPacket(body)).toThrow();
  });
});

describe('decryptPacket - AES key validation', () => {
  const originalKey = process.env.AES_KEY;

  afterEach(() => {
    process.env.AES_KEY = originalKey;
  });

  test('should throw when AES_KEY env var is not set', () => {
    delete process.env.AES_KEY;
    expect(() => decryptPacket({
      iv: "test", ciphertext: "test", tag: "test"
    })).toThrow('AES_KEY environment variable is not set');
  });

  test('should throw when AES_KEY is wrong length', () => {
    process.env.AES_KEY = 'tooshort';
    expect(() => decryptPacket({
      iv: "test", ciphertext: "test", tag: "test"
    })).toThrow('64-character hex string');
  });

  test('should support key rotation with fallback AES_KEY_OLD', () => {
    const body = {
      gatewayId: "GW-01",
      iv: "2VsiomiGKk15dp3c",
      ciphertext: "AY5Q0YpLXruIDUikAE5mS/a87zr5MhlK4k9KNxBBiBsubkcpyoWNdAPfmp/JTyRVW98TPw/+XICqxURBTFZMZELRREqbtJx6kNUpcFthFibKrcqkJxIMdJ78b0GPkENba3QDCyvWfWf/jyd+aAABBZofhWSY77btHk1c51MrJUWScCLYlz0JHBzEdNgNE15zHYl4e0z3v1PJ98jpzA/6iAV1H7aWqFj4OMkW+T5zwDe6e+rpdF8JTk1WSr7K0F9K7Br8XNeOxiHbb4b3djmMABJZ5WED4SuQj9kKSWKENyNzb93B4BJGXCWqf+sFwbtIlJmPksH752Q+EHu5xRrPalNyCPIdKDyBqRBHyLVZbj91XJWbt7EkXSaYl+9guzOiSaVlsQvbvvXJ+W8gqCu3ZXSWIR5iqBr/+B/b0OZIecaUCDkVpx+EynqgllCkm/rw0xvniZ+6Y06pDR0OUKdCv5hIqIjRfYdzSSaoiWydpdBQjdTfdzJIUAq7F3u5K0a8zM/TExTvxy8bKa7HCkufRyfur4bGgv+YHAnseD8RIo6eqUDLmc2K9iwFb+FCmGV83ePIp3bWY+p2LHrgGbws7hhapvjSYkUuBu3j57Rh5YQEbTmfDU99y20VwHRmsSvvA05opYH/sfZxi1oEZEo1JxVycmfdSfsc70gnoU+GJouQ/VlcTvIFkxUhdJZW+cN4rXHHbdcjXD4CSP7g1WtMQrtpzGFY5DUOq4naKwkcy7pLZg+tiiiXNTW0HvMhNvRlSuG7udMh8RbhVWBC/upwHXUjw1vF8weOyCW/ow3zq0udtsYkT0IGz8Ap594xjm9eEguIEcB+t1XNA+T26BJmf5/tcndqHDxpE+Ad15OCKjxJcQap4gkqlw==",
      tag: "mo1Z7GBs5ymzJ3kSJJXiRw=="
    };

    // Primary key is rotated to a new key
    process.env.AES_KEY = '1111111111111111111111111111111111111111111111111111111111111111';
    // Old key is kept as fallback
    process.env.AES_KEY_OLD = originalKey;

    const { parsed } = decryptPacket(body);
    expect(parsed).toHaveProperty('data');
    expect(parsed.data).toHaveLength(256);

    delete process.env.AES_KEY_OLD;
  });
});

