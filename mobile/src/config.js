/**
 * Mobile App Configuration
 * 
 * Central place for all API and app configuration.
 * Per assignment specification: "Keep the API base URL in one config place, not hard-coded across files".
 */

import { Platform } from 'react-native';

// Default host based on execution environment:
// - Android Emulator: 10.0.2.2 maps to host machine localhost
// - iOS Simulator / Web: localhost
// - Real Device: User can override via Settings or set your machine's LAN IP
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const DEFAULT_PORT = '3000';

// Support cloud deployment environment variable (e.g. Vercel EXPO_PUBLIC_API_URL)
const envApiUrl = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL;

export const CONFIG = {
  // Base URL for the Vanix IoT backend REST API
  API_BASE_URL: envApiUrl || `http://${DEFAULT_HOST}:${DEFAULT_PORT}/api`,
  
  // Polling / auto-refresh intervals (ms)
  AUTO_REFRESH_INTERVAL_MS: 15000, // 15s to match device packet rate
  
  // Timeout for HTTP requests (ms)
  REQUEST_TIMEOUT_MS: 8000,
  
  // App branding & version
  APP_NAME: 'Vanix Field Sentinel',
  APP_VERSION: '1.0.0',

  // Alert thresholds
  THRESHOLDS: {
    OVERTEMP_CELSIUS: 40.0,
    INACTIVE_SCORE: 5.0,
    OFFLINE_MINUTES: 30
  }
};

let activeApiUrl = CONFIG.API_BASE_URL;

export function getApiBaseUrl() {
  return activeApiUrl;
}

export function setApiBaseUrl(url) {
  if (url && typeof url === 'string') {
    // Strip trailing slash
    activeApiUrl = url.replace(/\/+$/, '');
  }
}
