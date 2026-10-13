/**
 * AlertBadge Component
 * Displays glowing badges for open alerts with status-specific colors
 * Uses the Vanix Sentinel clean design system
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../theme';

export default function AlertBadge({ count = 0, type = null, message = '' }) {
  if (!count && !type) return null;

  let bg = '#FEF2F2';
  let border = '#FECACA';
  let dotColor = COLORS.danger;
  let textColor = '#DC2626';
  let label = 'ALERT';

  if (type === 'over_temperature') {
    bg = '#FEF2F2';
    border = '#FECACA';
    dotColor = COLORS.danger;
    textColor = '#DC2626';
    label = 'OVER-TEMP';
  } else if (type === 'offline') {
    bg = '#FFFBEB';
    border = '#FDE68A';
    dotColor = COLORS.accent;
    textColor = '#D97706';
    label = 'OFFLINE';
  } else if (type === 'inactive') {
    bg = '#EFF6FF';
    border = '#BFDBFE';
    dotColor = COLORS.primary;
    textColor = '#1D4ED8';
    label = 'INACTIVE';
  } else if (count > 0) {
    bg = '#FEF2F2';
    border = '#FECACA';
    dotColor = COLORS.danger;
    textColor = '#DC2626';
    label = `${count} ${count === 1 ? 'ALERT' : 'ALERTS'}`;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
      <View style={[styles.pulseDot, { backgroundColor: dotColor }]} />
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
