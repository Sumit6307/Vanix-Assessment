/**
 * MotionVisualizer Component
 * Visualizes the 16 3-axis motion samples (X, Y, Z in milli-g)
 * and vector magnitude deviation from 1000 mg.
 * 100% responsive across mobile & desktop.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';

export default function MotionVisualizer({ samples = [] }) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!samples || samples.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyIcon}>🔬</Text>
        <Text style={styles.emptyText}>No motion samples available</Text>
      </View>
    );
  }

  const activeSample = samples[selectedIdx] || samples[0];
  const mag = Math.round(Math.sqrt(activeSample.x ** 2 + activeSample.y ** 2 + activeSample.z ** 2));
  const deviation = Math.abs(mag - 1000);

  // Meter percentage (centered around 0, max 2000 mg)
  const getMeterPercent = (val) => {
    const clamped = Math.max(-1500, Math.min(1500, val));
    return Math.abs(clamped) / 1500 * 100;
  };

  const axisConfigs = [
    { key: 'x', label: 'X-AXIS', value: activeSample.x, color: COLORS.danger },
    { key: 'y', label: 'Y-AXIS', value: activeSample.y, color: COLORS.success },
    { key: 'z', label: 'Z-AXIS', value: activeSample.z, color: COLORS.info },
  ];

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>3-Axis Motion Telemetry</Text>
          <Text style={styles.subtitle}>16 Samples per Packet</Text>
        </View>
        <View style={styles.badgePill}>
          <Text style={styles.badge}>#{selectedIdx + 1}/16</Text>
        </View>
      </View>

      {/* Primary 3-Axis Readout */}
      <View style={[styles.axesGrid, isMobile && styles.axesGridMobile]}>
        {axisConfigs.map(axis => (
          <View key={axis.key} style={[styles.axisCard, isMobile && styles.axisCardMobile]}>
            <Text style={[styles.axisLabel, { color: axis.color }]}>{axis.label}</Text>
            <Text style={[styles.axisValue, isMobile && styles.axisValueMobile]}>{axis.value}</Text>
            <Text style={styles.axisUnit}>mg</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: axis.color,
                    width: `${getMeterPercent(axis.value)}%`
                  }
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Magnitude Vector Summary */}
      <View style={styles.magSummary}>
        <View style={styles.magLeft}>
          <Text style={styles.magLabel}>Total Vector Magnitude</Text>
          <Text style={styles.magValue}>
            {mag} <Text style={styles.magUnit}>mg (1g ≈ 1000)</Text>
          </Text>
        </View>
        <View style={[styles.devBadge, deviation < 15 ? styles.devRest : styles.devActive]}>
          <Text style={[styles.devText, deviation < 15 ? styles.devTextRest : styles.devTextActive]}>
            {deviation < 15 ? '● REST' : '⚡ MOTION'}
          </Text>
          <Text style={[styles.devSubText, deviation < 15 ? styles.devTextRest : styles.devTextActive]}>
            {deviation} mg dev
          </Text>
        </View>
      </View>

      {/* Sample Selector Pills (1..16) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
        {samples.map((s, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.pill, selectedIdx === idx && styles.pillActive]}
            onPress={() => setSelectedIdx(idx)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pillText, selectedIdx === idx && styles.pillTextActive]}>
              S{idx + 1}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: SPACING.sm,
    ...SHADOWS.card,
  },
  containerMobile: {
    padding: 12,
    borderRadius: 14,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  badgePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  badge: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  axesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  axesGridMobile: {
    gap: 6,
  },
  axisCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    minWidth: 0,
  },
  axisCardMobile: {
    padding: 8,
    borderRadius: 10,
  },
  axisLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  axisValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  axisValueMobile: {
    fontSize: 14,
  },
  axisUnit: {
    fontSize: 9,
    color: COLORS.textTertiary,
    marginBottom: 6,
  },
  barTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  magSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  magLeft: {
    flex: 1,
  },
  magLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  magValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  magUnit: {
    fontSize: 10,
    color: COLORS.textTertiary,
    fontWeight: 'normal',
  },
  devBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  devRest: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  devActive: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  devText: {
    fontSize: 10,
    fontWeight: '800',
  },
  devSubText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  devTextRest: {
    color: '#059669',
  },
  devTextActive: {
    color: '#D97706',
  },
  pillsScroll: {
    marginTop: SPACING.md,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: COLORS.bgInset,
    borderRadius: RADIUS.sm,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  pillTextActive: {
    color: COLORS.white,
  },
  emptyIcon: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    textAlign: 'center',
  },
});
