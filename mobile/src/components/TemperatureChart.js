/**
 * TemperatureChart Component
 * Premium SVG temperature trend visualization with indigo gradient fill,
 * smooth bezier curves, and amber/coral min/max markers.
 * 100% fluid responsive scaling on mobile & desktop.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, RADIUS, SPACING, SHADOWS } from '../theme';

export default function TemperatureChart({ readings = [], height = 190, width: fixedWidth }) {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);

  // Dynamic calculation of chart container width
  const isMobile = windowWidth < 768;
  const horizontalPadding = isMobile ? 24 : 48;
  const measuredWidth = containerWidth > 0 ? containerWidth - 28 : (windowWidth - horizontalPadding - 28);
  const chartContainerWidth = fixedWidth || Math.max(260, measuredWidth);

  if (!readings || readings.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height, width: '100%' }]}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>No temperature readings in this window</Text>
      </View>
    );
  }

  // Sort chronological for chart display (oldest to newest)
  const sorted = [...readings].sort((a, b) => a.timestamp - b.timestamp);

  // Extract temperatures
  const temps = sorted.map(r => r.temperature);
  const minTemp = Math.floor(Math.min(...temps, 0) - 2);
  const maxTemp = Math.ceil(Math.max(...temps, 42) + 2);
  const tempRange = maxTemp - minTemp || 1;

  const paddingLeft = 34;
  const paddingRight = 24;
  const paddingTop = 16;
  const paddingBottom = 26;

  const chartWidth = Math.max(120, chartContainerWidth - paddingLeft - paddingRight);
  const chartHeight = height - paddingTop - paddingBottom;

  // Scale functions
  const getX = (index) => paddingLeft + (index / (sorted.length - 1 || 1)) * chartWidth;
  const getY = (val) => paddingTop + chartHeight - ((val - minTemp) / tempRange) * chartHeight;

  // Generate smooth SVG curve path
  let pathD = `M ${getX(0)} ${getY(temps[0])}`;
  for (let i = 1; i < temps.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(temps[i - 1]);
    const currX = getX(i);
    const currY = getY(temps[i]);
    const midX = (prevX + currX) / 2;
    pathD += ` C ${midX} ${prevY}, ${midX} ${currY}, ${currX} ${currY}`;
  }

  // Area fill under curve
  const areaD = `${pathD} L ${getX(temps.length - 1)} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`;

  // 40°C threshold line Y position
  const thresholdY = getY(40.0);

  // Min and Max indices
  const maxVal = Math.max(...temps);
  const minVal = Math.min(...temps);
  const maxIdx = temps.indexOf(maxVal);
  const minIdx = temps.indexOf(minVal);
  const latestTemp = temps[temps.length - 1];

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 100 && Math.abs(w - containerWidth) > 8) {
          setContainerWidth(w);
        }
      }}
    >
      <View style={styles.headerRow}>
        <View style={styles.legendGroup}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
          <Text style={styles.legendText}>Latest: {latestTemp.toFixed(1)}°C</Text>
        </View>
        <View style={styles.legendGroup}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.danger }]} />
          <Text style={styles.legendText}>Max: {maxVal.toFixed(1)}°C</Text>
        </View>
        <View style={styles.legendGroup}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.info }]} />
          <Text style={styles.legendText}>Min: {minVal.toFixed(1)}°C</Text>
        </View>
      </View>

      <View style={styles.svgWrapper}>
        <Svg width={chartContainerWidth} height={height} style={styles.svg}>
          <Defs>
            <LinearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.32" />
              <Stop offset="60%" stopColor={COLORS.primary} stopOpacity="0.06" />
              <Stop offset="100%" stopColor={COLORS.primary} stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={COLORS.cyan} />
              <Stop offset="50%" stopColor={COLORS.primary} />
              <Stop offset="100%" stopColor={COLORS.accent} />
            </LinearGradient>
          </Defs>

          {/* Horizontal grid lines */}
          {[minTemp, (minTemp + maxTemp) / 2, maxTemp].map((tVal, idx) => {
            const y = getY(tVal);
            return (
              <React.Fragment key={idx}>
                <Line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + chartWidth}
                  y2={y}
                  stroke={COLORS.chartGrid}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <SvgText
                  x={paddingLeft - 6}
                  y={y + 4}
                  fill={COLORS.chartAxisText}
                  fontSize="9.5"
                  textAnchor="end"
                  fontWeight="600"
                >
                  {Math.round(tVal)}°
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* 40°C Alert Threshold Line */}
          {thresholdY >= paddingTop && thresholdY <= paddingTop + chartHeight && (
            <>
              <Line
                x1={paddingLeft}
                y1={thresholdY}
                x2={paddingLeft + chartWidth}
                y2={thresholdY}
                stroke={COLORS.danger}
                strokeWidth="1.5"
                strokeDasharray="5 3"
              />
              <SvgText
                x={paddingLeft + chartWidth}
                y={thresholdY - 4}
                fill={COLORS.danger}
                fontSize="9"
                textAnchor="end"
                fontWeight="bold"
              >
                ALERT 40°C
              </SvgText>
            </>
          )}

          {/* Gradient fill under curve */}
          <Path d={areaD} fill="url(#tempGradient)" />

          {/* Temperature curve line */}
          <Path
            d={pathD}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Max point circle */}
          {maxIdx >= 0 && (
            <Circle
              cx={getX(maxIdx)}
              cy={getY(maxVal)}
              r="4"
              fill={COLORS.danger}
              stroke={COLORS.bgCardSolid}
              strokeWidth="2"
            />
          )}

          {/* Min point circle */}
          {minIdx >= 0 && minIdx !== maxIdx && (
            <Circle
              cx={getX(minIdx)}
              cy={getY(minVal)}
              r="4"
              fill={COLORS.info}
              stroke={COLORS.bgCardSolid}
              strokeWidth="2"
            />
          )}

          {/* Latest point pulse */}
          <Circle
            cx={getX(temps.length - 1)}
            cy={getY(latestTemp)}
            r="5"
            fill={COLORS.primary}
            stroke={COLORS.white}
            strokeWidth="2"
          />

          {/* X axis baseline */}
          <Line
            x1={paddingLeft}
            y1={paddingTop + chartHeight}
            x2={paddingLeft + chartWidth}
            y2={paddingTop + chartHeight}
            stroke={COLORS.border}
            strokeWidth="1"
          />

          {/* Time axis labels */}
          <SvgText
            x={paddingLeft}
            y={height - 8}
            fill={COLORS.chartAxisText}
            fontSize="9"
            textAnchor="start"
          >
            {new Date(sorted[0].timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </SvgText>
          <SvgText
            x={paddingLeft + chartWidth / 2}
            y={height - 8}
            fill={COLORS.chartAxisText}
            fontSize="9"
            textAnchor="middle"
          >
            {new Date(sorted[Math.floor(sorted.length / 2)].timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </SvgText>
          <SvgText
            x={paddingLeft + chartWidth}
            y={height - 8}
            fill={COLORS.chartAxisText}
            fontSize="9"
            textAnchor="end"
          >
            {new Date(sorted[sorted.length - 1].timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </SvgText>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: SPACING.xs,
    width: '100%',
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  legendGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  legendText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '700',
  },
  svgWrapper: {
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  svg: {
    overflow: 'visible',
  },
  emptyContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 13,
  },
});
