/**
 * Vanix Field Sentinel Mobile App
 * Main Entry Point
 * 
 * Features:
 * - Screen 1: Device List Screen
 * - Screen 2: Device Detail Screen
 * - Full-width responsive layout for desktop and mobile displays
 * - Unified API configuration in src/config.js
 * - Real-time alerts, pull-to-refresh, SVG temperature chart, acknowledge flow
 */

import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DeviceListScreen from './src/screens/DeviceListScreen';
import DeviceDetailScreen from './src/screens/DeviceDetailScreen';
import { COLORS } from './src/theme';

export default function App() {
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {selectedDeviceId ? (
        <DeviceDetailScreen
          deviceId={selectedDeviceId}
          onBack={() => setSelectedDeviceId(null)}
        />
      ) : (
        <DeviceListScreen
          onSelectDevice={(device) => setSelectedDeviceId(device.deviceId)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.bgPrimary,
  },
});
