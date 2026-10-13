/**
 * DeviceCard Component
 * Production-level IoT Telemetry Device Card
 * Features:
 * - Device Avatar with hardware icon & alert glow
 * - 3 distinct elevated metric tiles (Temp, Battery, Motion)
 * - 100% responsive sizing across all mobile & desktop viewports
 * - Live status radar pill & alert counter
 * - Interactive telemetry action footer
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import AlertBadge from './AlertBadge';
import { formatRelativeTime } from '../services/api';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../theme';

export default function DeviceCard({ device, onPress }) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 600;
  const isSmallMobile = windowWidth < 400;

  const {
    deviceId,
    label,
    latestTemperature,
    latestBattery,
    latestActivityScore,
    lastSeenTimestamp,
    openAlerts,
    location,
    packetCount
  } = device;

  // Temperature color coding
  const getTempColor = (t) => {
    if (t === null || t === undefined) return COLORS.textTertiary;
    if (t < 0) return COLORS.info;          // Freezing cyan
    if (t > 40.0) return COLORS.danger;     // Overheat coral
    if (t > 35.0) return COLORS.accent;     // Warm amber
    return COLORS.success;                  // Optimal emerald
  };

  const getTempStatus = (t) => {
    if (t === null || t === undefined) return 'No Signal';
    if (t < 0) return 'Sub-Zero';
    if (t > 40.0) return 'Overheat';
    if (t > 35.0) return 'Elevated';
    return 'Optimal';
  };

  const tempColor = getTempColor(latestTemperature);
  const tempStatus = getTempStatus(latestTemperature);
  const hasOpenAlerts = openAlerts > 0;

  // Battery bar color
  const getBatteryColor = (b) => {
    if (b < 20) return COLORS.danger;
    if (b < 50) return COLORS.accent;
    return COLORS.success;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[
        styles.card,
        isMobile && styles.cardMobile,
        hasOpenAlerts && styles.cardAlert
      ]}
      onPress={() => onPress && onPress(device)}
    >
      {/* Top Header Row: Device Identity & Status */}
      <View style={[styles.topRow, isMobile && styles.topRowMobile]}>
        <View style={styles.identityGroup}>
          <View style={[
            styles.avatarBox,
            isMobile && styles.avatarBoxMobile,
            hasOpenAlerts ? styles.avatarAlert : styles.avatarNormal
          ]}>
            <Text style={[styles.avatarIcon, isMobile && styles.avatarIconMobile]}>
              {hasOpenAlerts ? '⚠️' : '📡'}
            </Text>
          </View>
          <View style={styles.nameBlock}>
            <View style={styles.titleLine}>
              <Text style={[styles.deviceTitle, isMobile && styles.deviceTitleMobile]} numberOfLines={1}>
                {label || `Device ${deviceId}`}
              </Text>
              <View style={styles.idChip}>
                <Text style={styles.idChipText}>#{deviceId}</Text>
              </View>
            </View>
            <Text style={styles.deviceSubtitle} numberOfLines={1}>
              {location || 'Industrial Gateway Node'}
            </Text>
          </View>
        </View>

        {hasOpenAlerts ? (
          <AlertBadge count={openAlerts} />
        ) : (
          <View style={styles.livePill}>
            <View style={styles.liveBeacon} />
            <Text style={styles.liveText}>ONLINE</Text>
          </View>
        )}
      </View>

      {/* 3 Dedicated Metric Tiles (Temp, Battery, Motion) */}
      <View style={[styles.metricGrid, isMobile && styles.metricGridMobile]}>
        {/* Metric 1: Temperature Tile */}
        <View style={[styles.metricTile, isMobile && styles.metricTileMobile]}>
          <View style={styles.tileHeader}>
            <Text style={styles.tileHeaderIcon}>🌡️</Text>
            <Text style={[styles.tileHeaderLabel, isMobile && styles.tileHeaderLabelMobile]}>TEMP</Text>
          </View>
          <View style={styles.tileValueRow}>
            <Text style={[styles.tilePrimaryValue, isMobile && styles.tilePrimaryValueMobile, { color: tempColor }]}>
              {latestTemperature !== null && latestTemperature !== undefined
                ? latestTemperature.toFixed(1)
                : '--'}
            </Text>
            <Text style={[styles.tileValueUnit, isMobile && styles.tileValueUnitMobile, { color: tempColor }]}>°C</Text>
          </View>
          <View style={[styles.statusMiniTag, { backgroundColor: `${tempColor}15` }]}>
            <Text style={[styles.statusMiniText, isMobile && styles.statusMiniTextMobile, { color: tempColor }]}>
              {tempStatus}
            </Text>
          </View>
        </View>

        {/* Metric 2: Battery Power Tile */}
        <View style={[styles.metricTile, isMobile && styles.metricTileMobile]}>
          <View style={styles.tileHeader}>
            <Text style={styles.tileHeaderIcon}>🔋</Text>
            <Text style={[styles.tileHeaderLabel, isMobile && styles.tileHeaderLabelMobile]}>POWER</Text>
          </View>
          <View style={styles.tileValueRow}>
            <Text style={[styles.tilePrimaryValue, isMobile && styles.tilePrimaryValueMobile]}>
              {latestBattery !== null && latestBattery !== undefined ? `${latestBattery}` : '--'}
            </Text>
            <Text style={[styles.tileValueUnit, isMobile && styles.tileValueUnitMobile]}>%</Text>
          </View>
          <View style={styles.batteryTrack}>
            <View
              style={[
                styles.batteryFill,
                {
                  width: `${Math.min(100, Math.max(0, latestBattery || 0))}%`,
                  backgroundColor: getBatteryColor(latestBattery)
                }
              ]}
            />
          </View>
        </View>

        {/* Metric 3: Motion Activity Tile */}
        <View style={[styles.metricTile, isMobile && styles.metricTileMobile]}>
          <View style={styles.tileHeader}>
            <Text style={styles.tileHeaderIcon}>⚡</Text>
            <Text style={[styles.tileHeaderLabel, isMobile && styles.tileHeaderLabelMobile]}>MOTION</Text>
          </View>
          <View style={styles.tileValueRow}>
            <Text style={[styles.tilePrimaryValue, isMobile && styles.tilePrimaryValueMobile, { color: COLORS.primary }]}>
              {latestActivityScore !== null && latestActivityScore !== undefined
                ? latestActivityScore.toFixed(1)
                : '--'}
            </Text>
            <Text style={[styles.tileValueUnit, isMobile && styles.tileValueUnitMobile, { color: COLORS.primary }]}>mg</Text>
          </View>
          <View style={[styles.statusMiniTag, { backgroundColor: COLORS.primaryMuted }]}>
            <Text style={[styles.statusMiniText, isMobile && styles.statusMiniTextMobile, { color: COLORS.primary }]}>
              dev score
            </Text>
          </View>
        </View>
      </View>

      {/* Card Footer: Timestamp & Interactive Prompt */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          <Text style={styles.footerClockIcon}>🕒</Text>
          <Text style={[styles.lastSeenText, isSmallMobile && styles.lastSeenTextMobile]}>
            Synced {formatRelativeTime(lastSeenTimestamp)}
          </Text>
          {packetCount !== undefined && packetCount > 0 && !isSmallMobile && (
            <View style={styles.packetBadge}>
              <Text style={styles.packetBadgeText}>📦 {packetCount} pkts</Text>
            </View>
          )}
        </View>
        <View style={styles.ctaButton}>
          <Text style={styles.ctaText}>Telemetry</Text>
          <Text style={styles.ctaArrow}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: SPACING.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  cardMobile: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
  },
  cardAlert: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFBFB',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  topRowMobile: {
    marginBottom: 10,
  },
  identityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarBoxMobile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 8,
  },
  avatarNormal: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  avatarAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  avatarIcon: {
    fontSize: 20,
  },
  avatarIconMobile: {
    fontSize: 16,
  },
  nameBlock: {
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  deviceTitleMobile: {
    fontSize: 14,
  },
  idChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  idChipText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  deviceSubtitle: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    flexShrink: 0,
  },
  liveBeacon: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  liveText: {
    color: '#059669',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  metricGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    width: '100%',
  },
  metricGridMobile: {
    gap: 6,
    marginBottom: 10,
  },
  metricTile: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    alignItems: 'flex-start',
    minWidth: 0,
  },
  metricTileMobile: {
    padding: 8,
    borderRadius: 10,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  tileHeaderIcon: {
    fontSize: 10,
  },
  tileHeaderLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textTertiary,
    letterSpacing: 0.5,
  },
  tileHeaderLabelMobile: {
    fontSize: 8,
  },
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  tilePrimaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tilePrimaryValueMobile: {
    fontSize: 15,
  },
  tileValueUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    marginLeft: 2,
  },
  tileValueUnitMobile: {
    fontSize: 9,
  },
  statusMiniTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusMiniText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusMiniTextMobile: {
    fontSize: 8,
  },
  batteryTrack: {
    height: 4,
    width: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  batteryFill: {
    height: '100%',
    borderRadius: 2,
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  footerClockIcon: {
    fontSize: 11,
  },
  lastSeenText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  lastSeenTextMobile: {
    fontSize: 10,
  },
  packetBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  packetBadgeText: {
    fontSize: 9.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    gap: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ctaArrow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
