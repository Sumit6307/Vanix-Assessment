/**
 * Screen 2: Device Detail Screen
 * Displays:
 * - Device info & metadata
 * - Latest reading
 * - 1-hour temperature chart (with toggle to table list)
 * - Open alerts with one-tap "Acknowledge" button
 * - 3-Axis accelerometer motion telemetry preview (16 samples)
 * - Pull-to-refresh, loading & error states
 * - 100% responsive across all mobile & desktop displays
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import TemperatureChart from '../components/TemperatureChart';
import MotionVisualizer from '../components/MotionVisualizer';
import {
  getDeviceDetails,
  getDeviceReadings,
  acknowledgeAlert,
} from '../services/api';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';

export default function DeviceDetailScreen({ deviceId, onBack }) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const isSmallMobile = windowWidth < 420;

  const [device, setDevice] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'list'
  const [ackInProgress, setAckInProgress] = useState({});
  const [ackNotice, setAckNotice] = useState(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const details = await getDeviceDetails(deviceId);
      setDevice(details);

      // Fetch 1-hour of readings for temperature graph
      const latestTs = details.latestReading?.timestamp;
      const fromTs = latestTs ? latestTs - 3600 : 0;
      const toTs = latestTs ? latestTs + 60 : undefined;

      const readingsData = await getDeviceReadings(deviceId, {
        from: fromTs,
        to: toTs,
        limit: 100
      });
      setReadings(readingsData.data || []);
    } catch (err) {
      setError(err.message || `Unable to load details for device #${deviceId}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleAcknowledge = async (alertId) => {
    setAckInProgress(prev => ({ ...prev, [alertId]: true }));
    try {
      await acknowledgeAlert(alertId);
      
      // Optimistically update device alerts list
      setDevice(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          openAlerts: prev.openAlerts.filter(a => a.id !== alertId)
        };
      });

      setAckNotice(`Alert #${alertId} acknowledged successfully.`);
      setTimeout(() => setAckNotice(null), 4000);
    } catch (err) {
      alert(`Failed to acknowledge alert: ${err.message}`);
    } finally {
      setAckInProgress(prev => ({ ...prev, [alertId]: false }));
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading telemetry for Device #{deviceId}...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>‹ Back to Fleet</Text>
          </TouchableOpacity>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>⚠ Telemetry Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
              <Text style={styles.retryBtnText}>Retry Fetch</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const latest = device?.latestReading;
  const openAlerts = device?.openAlerts || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPrimary} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.containerContent, isMobile && styles.containerContentMobile]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Top Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.backBtnArrow}>‹</Text>
            <Text style={styles.backBtnText}>Fleet Command</Text>
          </TouchableOpacity>
          <View style={styles.devicePill}>
            <View style={styles.devicePillDot} />
            <Text style={styles.devicePillText}>NODE #{deviceId}</Text>
          </View>
        </View>

        {/* Device Header */}
        <View style={styles.deviceHeader}>
          <Text style={[styles.deviceLabel, isMobile && styles.deviceLabelMobile]}>
            {device?.label || `Device ${deviceId}`}
          </Text>
          <Text style={styles.deviceLocation}>
            📍 {device?.location || 'Industrial Gateway Node'}
          </Text>
          {latest && (
            <Text style={styles.deviceClock}>
              Last packet clock: {latest.time ? new Date(latest.time).toUTCString() : 'N/A'}
            </Text>
          )}
        </View>

        {/* Temporary Acknowledge Notification */}
        {ackNotice && (
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>✓ {ackNotice}</Text>
          </View>
        )}

        {/* OPEN ALERTS SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>ACTIVE ALERTS</Text>
            <Text style={[styles.alertCountBadge, openAlerts.length > 0 && styles.alertCountBadgeActive]}>
              {openAlerts.length} OPEN
            </Text>
          </View>

          {openAlerts.length === 0 ? (
            <View style={styles.noAlertsCard}>
              <Text style={styles.noAlertsText}>✓ No open alerts. System operating nominally.</Text>
            </View>
          ) : (
            openAlerts.map(alert => (
              <View key={alert.id} style={[styles.alertCard, isMobile && styles.alertCardMobile]}>
                <View style={styles.alertIconCol}>
                  <Text style={styles.alertIcon}>
                    {alert.type === 'over_temperature' ? '🌡️' :
                     alert.type === 'offline' ? '📡' : '🔇'}
                  </Text>
                </View>
                <View style={styles.alertBody}>
                  <View style={styles.alertHeaderLine}>
                    <Text style={styles.alertTypeTag}>{alert.type.toUpperCase()}</Text>
                    <Text style={styles.alertTime}>
                      {new Date(alert.time_raised).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.alertMsg}>{alert.message}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.ackBtn,
                    ackInProgress[alert.id] && styles.ackBtnDisabled
                  ]}
                  disabled={ackInProgress[alert.id]}
                  onPress={() => handleAcknowledge(alert.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ackBtnText}>
                    {ackInProgress[alert.id] ? 'Saving...' : 'ACK'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* LATEST TELEMETRY METRICS (100% responsive 2x2 grid on mobile) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LATEST READING METRICS</Text>
          <View style={[styles.metricsGrid, isMobile ? styles.metricsGridMobile : styles.metricsGridDesktop]}>
            {/* Metric 1: Temperature */}
            <View style={[styles.metricCard, isMobile ? styles.metricCardMobile : styles.metricCardDesktop]}>
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardIcon}>🌡️</Text>
                <Text style={styles.metricLabel}>TEMPERATURE</Text>
              </View>
              <Text style={[
                styles.metricBigVal,
                isMobile && styles.metricBigValMobile,
                latest?.temperature > 40 ? styles.valRed :
                latest?.temperature < 0 ? styles.valBlue : styles.valGreen
              ]}>
                {latest ? latest.temperature.toFixed(2) : '--'}
                <Text style={styles.metricUnit}> °C</Text>
              </Text>
              <View style={[
                styles.metricStatusBadge,
                latest?.temperature > 40 ? styles.badgeRed :
                latest?.temperature < 0 ? styles.badgeBlue : styles.badgeGreen
              ]}>
                <Text style={[
                  styles.metricStatusText,
                  latest?.temperature > 40 ? styles.textRed :
                  latest?.temperature < 0 ? styles.textBlue : styles.textGreen
                ]}>
                  {latest?.temperature > 40 ? 'Critical Overheat' :
                   latest?.temperature < 0 ? 'Sub-Zero Freezing' : 'Optimal'}
                </Text>
              </View>
            </View>

            {/* Metric 2: Battery */}
            <View style={[styles.metricCard, isMobile ? styles.metricCardMobile : styles.metricCardDesktop]}>
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardIcon}>🔋</Text>
                <Text style={styles.metricLabel}>BATTERY</Text>
              </View>
              <Text style={[styles.metricBigVal, isMobile && styles.metricBigValMobile]}>
                {latest ? latest.battery : '--'}
                <Text style={styles.metricUnit}> %</Text>
              </Text>
              <View style={[
                styles.metricStatusBadge,
                latest?.battery < 20 ? styles.badgeRed : styles.badgeGreen
              ]}>
                <Text style={[
                  styles.metricStatusText,
                  latest?.battery < 20 ? styles.textRed : styles.textGreen
                ]}>
                  {latest?.battery < 20 ? 'Low Battery' : 'Nominal Power'}
                </Text>
              </View>
            </View>

            {/* Metric 3: Activity Score */}
            <View style={[styles.metricCard, isMobile ? styles.metricCardMobile : styles.metricCardDesktop]}>
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardIcon}>⚡</Text>
                <Text style={styles.metricLabel}>MOTION INDEX</Text>
              </View>
              <Text style={[styles.metricBigVal, isMobile && styles.metricBigValMobile, { color: COLORS.primary }]}>
                {latest ? latest.activityScore.toFixed(2) : '--'}
                <Text style={styles.metricUnit}> mg</Text>
              </Text>
              <View style={[styles.metricStatusBadge, styles.badgeBlue]}>
                <Text style={[styles.metricStatusText, styles.textBlue]}>
                  {latest?.activityScore < 5.0 ? 'Stationary Rest' : 'Active Vibration'}
                </Text>
              </View>
            </View>

            {/* Metric 4: Sequence & Packets */}
            <View style={[styles.metricCard, isMobile ? styles.metricCardMobile : styles.metricCardDesktop]}>
              <View style={styles.metricCardHeader}>
                <Text style={styles.metricCardIcon}>🔢</Text>
                <Text style={styles.metricLabel}>SEQUENCE</Text>
              </View>
              <Text style={[styles.metricBigVal, isMobile && styles.metricBigValMobile]}>
                #{latest ? latest.sequence : '--'}
              </Text>
              <View style={[styles.metricStatusBadge, styles.badgeGray]}>
                <Text style={[styles.metricStatusText, styles.textGray]}>
                  {device?.stats?.totalReadings || 0} Packets
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 1-HOUR TEMPERATURE TREND (CHART OR LIST) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>1-HOUR TEMPERATURE TREND</Text>
            <View style={styles.viewToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'chart' && styles.toggleBtnActive]}
                onPress={() => setViewMode('chart')}
              >
                <Text style={[styles.toggleBtnText, viewMode === 'chart' && styles.toggleBtnTextActive]}>
                  Chart
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                onPress={() => setViewMode('list')}
              >
                <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>
                  Table ({readings.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {viewMode === 'chart' ? (
            <TemperatureChart readings={readings} />
          ) : (
            /* Horizontally scrollable table so columns never squeeze on mobile screens */
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScrollView}>
              <View style={styles.readingsTable}>
                <View style={styles.tableHead}>
                  <Text style={[styles.tableHeadCol, { width: 100 }]}>TIME</Text>
                  <Text style={[styles.tableHeadCol, { width: 90 }]}>TEMP</Text>
                  <Text style={[styles.tableHeadCol, { width: 80 }]}>BATTERY</Text>
                  <Text style={[styles.tableHeadCol, { width: 90 }]}>ACTIVITY</Text>
                  <Text style={[styles.tableHeadCol, { width: 70 }]}>SEQ</Text>
                </View>
                {readings.slice(0, 30).map((r) => (
                  <View key={r.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: 100, color: COLORS.textSecondary }]}>
                      {new Date(r.timestamp * 1000).toLocaleTimeString()}
                    </Text>
                    <Text style={[
                      styles.tableCell,
                      { width: 90, fontWeight: '700' },
                      r.temperature > 40 ? styles.valRed :
                      r.temperature < 0 ? styles.valBlue : styles.valGreen
                    ]}>
                      {r.temperature.toFixed(2)}°C
                    </Text>
                    <Text style={[styles.tableCell, { width: 80 }]}>{r.battery}%</Text>
                    <Text style={[styles.tableCell, { width: 90, color: COLORS.cyan }]}>
                      {r.activityScore.toFixed(1)} mg
                    </Text>
                    <Text style={[styles.tableCell, { width: 70, color: COLORS.textTertiary }]}>
                      #{r.sequence}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* 3-AXIS ACCELEROMETER SAMPLES */}
        <View style={styles.section}>
          <MotionVisualizer samples={latest?.samples || []} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  containerContent: {
    paddingHorizontal: 24,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  containerContentMobile: {
    paddingHorizontal: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgPrimary,
  },
  loadingText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.bgPrimary,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: '#DC2626',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: COLORS.dangerDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 4,
  },
  backBtnArrow: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 20,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  devicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    gap: 6,
  },
  devicePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  devicePillText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deviceHeader: {
    marginBottom: 16,
  },
  deviceLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  deviceLabelMobile: {
    fontSize: 20,
  },
  deviceLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  deviceClock: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  noticeBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: 14,
  },
  noticeText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textTertiary,
    letterSpacing: 1,
  },
  alertCountBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textTertiary,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  alertCountBadgeActive: {
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  noAlertsCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  noAlertsText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    ...SHADOWS.card,
  },
  alertCardMobile: {
    padding: 10,
    borderRadius: 12,
  },
  alertIconCol: {
    marginRight: 10,
  },
  alertIcon: {
    fontSize: 22,
  },
  alertBody: {
    flex: 1,
    marginRight: 8,
  },
  alertHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  alertTypeTag: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  alertTime: {
    color: COLORS.textTertiary,
    fontSize: 10,
  },
  alertMsg: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  ackBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ackBtnDisabled: {
    opacity: 0.5,
  },
  ackBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },

  /* 4 Metrics in responsive 2x2 grid */
  metricsGrid: {
    width: '100%',
  },
  metricsGridDesktop: {
    flexDirection: 'row',
    gap: 10,
  },
  metricsGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  metricCardDesktop: {
    flex: 1,
    padding: 14,
  },
  metricCardMobile: {
    width: '48.5%',
    padding: 10,
    borderRadius: 12,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  metricCardIcon: {
    fontSize: 11,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  metricBigVal: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricBigValMobile: {
    fontSize: 17,
  },
  metricUnit: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '600',
  },
  metricStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  metricStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  badgeRed: { backgroundColor: '#FEF2F2' },
  badgeBlue: { backgroundColor: '#EFF6FF' },
  badgeGreen: { backgroundColor: '#ECFDF5' },
  badgeGray: { backgroundColor: '#F8FAFC' },
  textRed: { color: '#DC2626' },
  textBlue: { color: '#2563EB' },
  textGreen: { color: '#059669' },
  textGray: { color: '#64748B' },
  valRed: { color: '#DC2626' },
  valBlue: { color: '#0284C7' },
  valGreen: { color: '#059669' },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.pill,
    padding: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
  },
  toggleBtnActive: {
    backgroundColor: '#2563EB',
  },
  toggleBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },

  tableScrollView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  readingsTable: {
    minWidth: 430,
    padding: 10,
  },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tableHeadCol: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
});
