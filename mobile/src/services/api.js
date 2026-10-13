/**
 * Mobile API Service Layer
 * Connects to the Vanix IoT Backend REST API
 */

import { getApiBaseUrl, CONFIG } from '../config';

/**
 * Fetch with custom timeout
 */
async function fetchWithTimeout(url, options = {}) {
  const timeoutMs = options.timeout || CONFIG.REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s. Server may be unresponsive.`);
    }
    throw new Error(`Network error: ${error.message}. Cannot reach ${url}`);
  }
}

/**
 * Health check
 */
export async function checkBackendHealth() {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetchWithTimeout(`${baseUrl}/health`, { timeout: 3000 });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 1. GET /api/devices
 * List devices with latest temperature, activity score, and last-seen time
 */
export async function getDevices() {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/devices`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `HTTP ${res.status}: Failed to fetch devices`);
    }
    return await res.json();
  } catch (error) {
    console.warn('[API] getDevices error:', error.message);
    throw error;
  }
}

/**
 * 2. GET /api/devices/:id
 * Retrieve single device details, latest reading, open alerts and telemetry stats
 */
export async function getDeviceDetails(deviceId) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/devices/${deviceId}`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      if (res.status === 404) throw new Error(`Device #${deviceId} not found`);
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `HTTP ${res.status}: Failed to fetch device details`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`[API] getDeviceDetails(${deviceId}) error:`, error.message);
    throw error;
  }
}

/**
 * 3. GET /api/devices/:id/readings
 * Retrieve historical telemetry readings with optional from/to range and pagination
 */
export async function getDeviceReadings(deviceId, { from, to, page = 1, limit = 50 } = {}) {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (from !== undefined) params.append('from', from);
  if (to !== undefined) params.append('to', to);
  params.append('page', page);
  params.append('limit', limit);

  const url = `${baseUrl}/devices/${deviceId}/readings?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `HTTP ${res.status}: Failed to fetch readings`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`[API] getDeviceReadings(${deviceId}) error:`, error.message);
    throw error;
  }
}

/**
 * 4. GET /api/alerts?status=open
 * List open alerts
 */
export async function getOpenAlerts() {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/alerts?status=open`;

  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `HTTP ${res.status}: Failed to fetch alerts`);
    }
    return await res.json();
  } catch (error) {
    console.warn('[API] getOpenAlerts error:', error.message);
    throw error;
  }
}

/**
 * 5. PATCH /api/alerts/:id
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/alerts/${alertId}`;

  try {
    const res = await fetchWithTimeout(url, {
      method: 'PATCH'
    });
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error || `HTTP ${res.status}: Failed to acknowledge alert`);
    }
    return await res.json();
  } catch (error) {
    console.warn(`[API] acknowledgeAlert(${alertId}) error:`, error.message);
    throw error;
  }
}

/**
 * Utility: Format relative time ("just now", "15s ago", "5 min ago", "2 hr ago")
 */
export function formatRelativeTime(timestampSeconds) {
  if (!timestampSeconds) return 'Never';
  
  const nowSeconds = Math.floor(Date.now() / 1000);
  
  // Note: If dataset timestamps are in 2026, we check if the difference is large
  // If simulated dataset (e.g., Oct 2026), we can display human date or relative if within same hour
  const diff = nowSeconds - timestampSeconds;
  
  if (Math.abs(diff) > 86400 * 30) {
    // If dataset is from a different time period (e.g. 2026 simulation), show formatted time
    const d = new Date(timestampSeconds * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  if (diff < 15) return 'Just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
