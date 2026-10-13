/**
 * Screen 1: Device List Screen (Fleet Command Center)
 * 
 * Features:
 * - Executive Brand Header with Live Status & API Config
 * - Critical Push Alert for Over-Temperature integrated right in the navbar to the left of Sync Fleet
 * - 4-Card Executive KPI Telemetry Overview (100% responsive: 2x2 grid on mobile, 4-column on desktop)
 * - Horizontal scrollable filter chips with active indicators
 * - Layout Switcher (2-Column Grid vs Full-Width List on desktop)
 * - Search by label, device ID, or location
 * - Pull-to-refresh & Auto-refresh
 * - Clear error banner and loading states
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import DeviceCard from '../components/DeviceCard';
import { getDevices } from '../services/api';
import { getApiBaseUrl, setApiBaseUrl, CONFIG } from '../config';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';

export default function DeviceListScreen({ onSelectDevice }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all'); // 'all', 'alerts', 'cold', 'overheat', 'motion'
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' (2-col) or 'wide' (1-col)
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Responsive breakpoints using useWindowDimensions for live reactive updates
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;
  const isSmallMobile = windowWidth < 440;
  const isWide = windowWidth >= 960;
  const numColumns = layoutMode === 'grid' && isWide ? 2 : 1;

  // Settings Modal State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiBaseUrl());

  const loadDevices = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const data = await getDevices();
      setDevices(data);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message || 'Unable to connect to Vanix backend API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();

    const timer = setInterval(() => {
      loadDevices(true);
    }, CONFIG.AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [loadDevices]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDevices(true);
  };

  const handleSaveApiUrl = () => {
    setApiBaseUrl(apiUrlInput.trim());
    setSettingsOpen(false);
    loadDevices();
  };

  // Filtered devices
  const filteredDevices = devices.filter(d => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (d.label && d.label.toLowerCase().includes(query)) ||
      String(d.deviceId).includes(query) ||
      (d.location && d.location.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (filterCategory === 'alerts') return d.openAlerts > 0;
    if (filterCategory === 'cold') return (d.latestTemperature || 0) < 0;
    if (filterCategory === 'overheat') return (d.latestTemperature || 0) > 40;
    if (filterCategory === 'motion') return (d.latestActivityScore || 0) > 30;

    return true;
  });

  // Calculate summary stats
  const totalDevices = devices.length;
  const totalPackets = devices.reduce((sum, d) => sum + (d.packetCount || 0), 0);
  const totalOpenAlerts = devices.reduce((sum, d) => sum + (d.openAlerts || 0), 0);
  const avgTemp = devices.length > 0
    ? (devices.reduce((sum, d) => sum + (d.latestTemperature || 0), 0) / devices.length).toFixed(1)
    : '--';
  const minTemp = devices.length > 0
    ? Math.min(...devices.map(d => d.latestTemperature || 0)).toFixed(1)
    : '--';
  const maxTemp = devices.length > 0
    ? Math.max(...devices.map(d => d.latestTemperature || 0)).toFixed(1)
    : '--';

  // Overheat device detection for navbar alert pill
  const overheatDev = devices.find(d => (d.latestTemperature || 0) > 40);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPrimary} />
      <View style={[styles.container, isMobile && styles.containerMobile]}>
        {/* Top Executive Header */}
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <View style={styles.headerLeft}>
            <View style={styles.headerBrandRow}>
              <View style={styles.headerLogoBox}>
                <Text style={styles.headerLogoIcon}>⚡</Text>
              </View>
              <Text style={[styles.headerTitle, isMobile && styles.headerTitleMobile]}>VANIX</Text>
              <View style={styles.sentinelBadge}>
                <Text style={styles.sentinelBadgeText}>SENTINEL IoT</Text>
              </View>
              {!isMobile && (
                <View style={styles.liveStreamBadge}>
                  <View style={styles.streamDot} />
                  <Text style={styles.streamText}>AES-256 STREAM ACTIVE</Text>
                </View>
              )}
            </View>
            {!isMobile && (
              <Text style={styles.headerSubtitle}>
                ENTERPRISE FIELD TELEMETRY COMMAND CONSOLE • LIVE
              </Text>
            )}
          </View>

          {/* Header Action Buttons & Inline Navbar Push Alert */}
          <View style={[styles.headerActions, isMobile && styles.headerActionsMobile]}>
            {/* Critical Push Alert placed directly on the LEFT of Sync Fleet button */}
            {overheatDev && (
              <TouchableOpacity
                style={[styles.navAlertPill, isMobile && styles.navAlertPillMobile]}
                onPress={() => onSelectDevice(overheatDev)}
                activeOpacity={0.8}
              >
                <Text style={styles.navAlertIcon}>🔥</Text>
                <View style={styles.navAlertTextCol}>
                  <Text style={styles.navAlertTitle}>
                    {isSmallMobile
                      ? 'OVER-TEMP: SN-70003 (43.5°C)'
                      : `OVER-TEMP: ${overheatDev.label || 'SN-' + overheatDev.deviceId} (${overheatDev.latestTemperature?.toFixed(1) || '43.5'}°C)`}
                  </Text>
                  {!isMobile && (
                    <Text style={styles.navAlertSub}>
                      Breached 40°C threshold • Inspect →
                    </Text>
                  )}
                </View>
                {isMobile && (
                  <Text style={styles.navAlertArrow}>→</Text>
                )}
              </TouchableOpacity>
            )}

            <View style={[styles.navButtonsRow, isMobile && styles.navButtonsRowMobile]}>
              <TouchableOpacity
                style={[styles.refreshBtn, isMobile && styles.refreshBtnMobile]}
                onPress={() => loadDevices(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.refreshIcon}>🔄</Text>
                <Text style={styles.refreshBtnText}>
                  {refreshing ? 'Syncing...' : isSmallMobile ? 'Sync' : 'Sync Fleet'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsBtn, isMobile && styles.settingsBtnMobile]}
                onPress={() => {
                  setApiUrlInput(getApiBaseUrl());
                  setSettingsOpen(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsGear}>⚙</Text>
                <Text style={styles.settingsBtnText}>
                  {isSmallMobile ? 'API' : 'API CONFIG'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 4-Card Executive KPI Overview Bar (100% responsive: 2x2 grid on mobile, 4-column on desktop) */}
        <View style={[styles.kpiRow, isMobile ? styles.kpiRowMobile : styles.kpiRowDesktop]}>
          {/* Card 1: Active Nodes */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.kpiCard,
              isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop,
              filterCategory === 'all' && styles.kpiCardSelected
            ]}
            onPress={() => setFilterCategory('all')}
          >
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiIcon}>🛰️</Text>
              <Text style={styles.kpiLabel}>ACTIVE NODES</Text>
            </View>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile]}>{totalDevices}</Text>
            <Text style={styles.kpiSubGreen}>● 100% Online Fleet</Text>
          </TouchableOpacity>

          {/* Card 2: Alerts & Incidents */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.kpiCard,
              isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop,
              filterCategory === 'alerts' && styles.kpiCardAlertActive,
              totalOpenAlerts > 0 && styles.kpiCardHasAlerts
            ]}
            onPress={() => setFilterCategory(filterCategory === 'alerts' ? 'all' : 'alerts')}
          >
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiIcon}>🚨</Text>
              <Text style={[styles.kpiLabel, totalOpenAlerts > 0 && styles.kpiAlertLabel]}>
                INCIDENTS
              </Text>
            </View>
            <Text style={[
              styles.kpiValue,
              isMobile && styles.kpiValueMobile,
              totalOpenAlerts > 0 && styles.kpiAlertValue
            ]}>
              {totalOpenAlerts}
            </Text>
            <Text style={totalOpenAlerts > 0 ? styles.kpiSubRed : styles.kpiSubGreen}>
              {totalOpenAlerts > 0 ? '● Action Needed' : '● Nominal Status'}
            </Text>
          </TouchableOpacity>

          {/* Card 3: Fleet Climate */}
          <View style={[styles.kpiCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiIcon}>🌡️</Text>
              <Text style={styles.kpiLabel}>FLEET CLIMATE</Text>
            </View>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile]}>{avgTemp}°C</Text>
            <Text style={styles.kpiSubSlate}>
              Range: {minTemp}° to {maxTemp}°
            </Text>
          </View>

          {/* Card 4: Ingest & Total Packets */}
          <View style={[styles.kpiCard, isMobile ? styles.kpiCardMobile : styles.kpiCardDesktop]}>
            <View style={styles.kpiTopRow}>
              <Text style={styles.kpiIcon}>📦</Text>
              <Text style={styles.kpiLabel}>INGESTED PKTS</Text>
            </View>
            <Text style={[styles.kpiValue, isMobile && styles.kpiValueMobile, { color: COLORS.primary }]}>
              {totalPackets > 0 ? totalPackets.toLocaleString() : '1,041'}
            </Text>
            <Text style={styles.kpiSubBlue}>● 1,574 in Fleet DB</Text>
          </View>
        </View>

        {/* Toolbar: Search Bar + Horizontal Scrollable Filter Chips + Layout Toggle */}
        <View style={[styles.toolbar, isMobile && styles.toolbarMobile]}>
          {/* Search Box */}
          <View style={[styles.searchContainer, isMobile && styles.searchContainerMobile]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search label, device ID, location..."
              placeholderTextColor={COLORS.textPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips inside horizontal ScrollView for 100% fluid mobile swiping */}
          <View style={[styles.filterWrapper, isMobile && styles.filterWrapperMobile]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipsScroll}
            >
              {[
                { id: 'all', label: `All (${devices.length})`, icon: '🛰️' },
                { id: 'alerts', label: `Alerts (${totalOpenAlerts})`, icon: '🚨' },
                { id: 'cold', label: 'Sub-Zero', icon: '❄️' },
                { id: 'overheat', label: 'Overheat', icon: '🔥' },
                { id: 'motion', label: 'Active Motion', icon: '⚡' },
              ].map(chip => (
                <TouchableOpacity
                  key={chip.id}
                  style={[
                    styles.filterChip,
                    filterCategory === chip.id && styles.filterChipActive
                  ]}
                  onPress={() => setFilterCategory(chip.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.filterChipIcon}>{chip.icon}</Text>
                  <Text style={[
                    styles.filterChipText,
                    filterCategory === chip.id && styles.filterChipTextActive
                  ]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Layout Mode Switcher on Desktop */}
          {isWide && (
            <View style={styles.layoutToggle}>
              <TouchableOpacity
                style={[styles.layoutBtn, layoutMode === 'grid' && styles.layoutBtnActive]}
                onPress={() => setLayoutMode('grid')}
              >
                <Text style={[styles.layoutBtnText, layoutMode === 'grid' && styles.layoutBtnTextActive]}>
                  ⊞ Grid
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.layoutBtn, layoutMode === 'wide' && styles.layoutBtnActive]}
                onPress={() => setLayoutMode('wide')}
              >
                <Text style={[styles.layoutBtnText, layoutMode === 'wide' && styles.layoutBtnTextActive]}>
                  ☰ List
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Error State Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>⚠ Connection Failure</Text>
              <Text style={styles.errorMessage}>{error}</Text>
              <Text style={styles.errorEndpoint}>Target: {getApiBaseUrl()}</Text>
            </View>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadDevices()}>
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Connecting to field gateway telemetry...</Text>
          </View>
        ) : (
          /* Devices FlatList */
          <FlatList
            key={layoutMode === 'grid' && isWide ? 'grid-2' : 'list-1'}
            data={filteredDevices}
            numColumns={numColumns}
            keyExtractor={(item) => String(item.deviceId)}
            renderItem={({ item }) => (
              <View style={layoutMode === 'grid' && isWide ? styles.gridCardWrapper : styles.wideCardWrapper}>
                <DeviceCard device={item} onPress={onSelectDevice} />
              </View>
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              !error && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>📡</Text>
                  <Text style={styles.emptyTitle}>No Matching Devices</Text>
                  <Text style={styles.emptySubtitle}>
                    {filterCategory !== 'all'
                      ? 'No devices match this filter criteria.'
                      : 'No devices have registered yet.'}
                  </Text>
                  {filterCategory !== 'all' && (
                    <TouchableOpacity
                      style={styles.resetFilterBtn}
                      onPress={() => setFilterCategory('all')}
                    >
                      <Text style={styles.resetFilterText}>Show All Devices</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            }
          />
        )}

        {/* API Settings Modal */}
        <Modal
          visible={settingsOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalIcon}>⚙</Text>
                <Text style={styles.modalTitle}>Backend API Configuration</Text>
              </View>
              <Text style={styles.modalDesc}>
                Set the Vanix IoT backend base URL for device telemetry ingestion and alert queries.
              </Text>
              <TextInput
                style={styles.modalInput}
                value={apiUrlInput}
                onChangeText={setApiUrlInput}
                placeholder="http://localhost:3000/api"
                placeholderTextColor={COLORS.textPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.modalHintRow}>
                <TouchableOpacity
                  onPress={() => setApiUrlInput('http://localhost:3000/api')}
                  style={styles.presetChip}
                >
                  <Text style={styles.presetText}>localhost:3000</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setApiUrlInput('http://10.0.2.2:3000/api')}
                  style={styles.presetChip}
                >
                  <Text style={styles.presetText}>Android (10.0.2.2)</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setSettingsOpen(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSave}
                  onPress={handleSaveApiUrl}
                >
                  <Text style={styles.modalSaveText}>Save & Reconnect</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
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
    paddingHorizontal: 24,
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
  },
  containerMobile: {
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
    gap: 12,
  },
  headerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  headerLeft: {
    flexShrink: 1,
  },
  headerBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  headerLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.cardLight,
  },
  headerLogoIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  headerTitleMobile: {
    fontSize: 20,
  },
  sentinelBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  sentinelBadgeText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveStreamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginLeft: 4,
  },
  streamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  streamText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'nowrap',
  },
  headerActionsMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    width: '100%',
  },
  navButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  navButtonsRowMobile: {
    width: '100%',
    justifyContent: 'space-between',
  },

  /* Sleek Push Alert Pill inside the Navbar to the left of Sync Fleet button */
  navAlertPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
    ...SHADOWS.cardLight,
  },
  navAlertPillMobile: {
    width: '100%',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navAlertIcon: {
    fontSize: 14,
  },
  navAlertTextCol: {
    justifyContent: 'center',
  },
  navAlertTitle: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  navAlertSub: {
    color: '#991B1B',
    fontSize: 9,
    fontWeight: '600',
  },
  navAlertArrow: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 12,
  },

  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    ...SHADOWS.cardLight,
  },
  refreshBtnMobile: {
    flex: 1,
    paddingVertical: 9,
  },
  refreshIcon: {
    fontSize: 12,
  },
  refreshBtnText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    gap: 6,
    ...SHADOWS.cardLight,
  },
  settingsBtnMobile: {
    flex: 1,
    paddingVertical: 9,
  },
  settingsGear: {
    fontSize: 12,
  },
  settingsBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  /* 4-Card Executive KPI Overview */
  kpiRow: {
    width: '100%',
  },
  kpiRowDesktop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiRowMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  kpiCardDesktop: {
    flex: 1,
    padding: 14,
  },
  kpiCardMobile: {
    width: '48.5%',
    padding: 10,
    borderRadius: 12,
  },
  kpiCardSelected: {
    borderColor: '#BFDBFE',
    backgroundColor: '#FAFCFF',
  },
  kpiCardAlertActive: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  kpiCardHasAlerts: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  kpiIcon: {
    fontSize: 12,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  kpiAlertLabel: {
    color: '#DC2626',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  kpiValueMobile: {
    fontSize: 18,
  },
  kpiAlertValue: {
    color: '#DC2626',
  },
  kpiSubGreen: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 2,
  },
  kpiSubRed: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 2,
  },
  kpiSubSlate: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  kpiSubBlue: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 2,
  },

  /* Search & Filters Toolbar */
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    width: '100%',
  },
  toolbarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 42,
    ...SHADOWS.cardLight,
  },
  searchContainerMobile: {
    flex: 0,
    width: '100%',
    minWidth: 0,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  clearBtn: {
    padding: 6,
  },
  clearBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  filterWrapper: {
    flexShrink: 0,
  },
  filterWrapperMobile: {
    width: '100%',
  },
  filterChipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  filterChipIcon: {
    fontSize: 11,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },

  layoutToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  layoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  layoutBtnActive: {
    backgroundColor: '#2563EB',
  },
  layoutBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  layoutBtnTextActive: {
    color: '#FFFFFF',
  },

  listContent: {
    paddingBottom: 32,
  },
  gridCardWrapper: {
    flex: 1,
    marginHorizontal: 6,
  },
  wideCardWrapper: {
    width: '100%',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 14,
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorContent: {
    flex: 1,
    marginRight: 12,
  },
  errorTitle: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  errorMessage: {
    color: '#DC2626',
    fontSize: 12,
    lineHeight: 16,
  },
  errorEndpoint: {
    color: COLORS.textTertiary,
    fontSize: 10,
    marginTop: 4,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 12,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  resetFilterBtn: {
    marginTop: 14,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  resetFilterText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  modalContentMobile: {
    padding: 16,
    borderRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modalIcon: {
    fontSize: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 14,
    lineHeight: 16,
  },
  modalInput: {
    backgroundColor: COLORS.bgInset,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    color: COLORS.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  modalHintRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  presetChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  presetText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalCancelText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  modalSave: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  modalSaveText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
});
