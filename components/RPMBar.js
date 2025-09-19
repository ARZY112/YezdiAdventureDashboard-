import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';

const RPMBar = ({ rpm, accentColor }) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    const targetValue = Math.min(Math.max(rpm / 8000, 0), 1);
    animatedValue.value = withTiming(targetValue, { duration: 500 });
  }, [rpm]);

  const animatedStyle = useAnimatedStyle(() => {
    const width = interpolate(animatedValue.value, [0, 1], [0, 100]);
    const backgroundColor = interpolateColor(
      animatedValue.value,
      [0, 0.6, 0.8, 1],
      [accentColor, accentColor, '#FFA500', '#FF4444']
    );
    
    return {
      width: `${width}%`,
      backgroundColor,
    };
  });

  const generateTicks = () => {
    const ticks = [];
    for (let i = 0; i <= 8; i++) {
      const position = (i / 8) * 100;
      const value = i;
      
      ticks.push(
        <View key={i} style={[styles.tick, { left: `${position}%` }]}>
          <View style={[styles.tickMark, i >= 6 && styles.redZoneTick]} />
          <Text style={[styles.tickLabel, i >= 6 && styles.redZoneLabel]}>
            {value}
          </Text>
        </View>
      );
    }
    return ticks;
  };

  const getRPMColor = () => {
    const rpmPercent = rpm / 8000;
    if (rpmPercent >= 0.8) return '#FF4444';
    if (rpmPercent >= 0.6) return '#FFA500';
    return accentColor;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>RPM</Text>
        <Text style={[styles.value, { color: getRPMColor() }]}>
          {rpm === 0 ? '--' : rpm.toLocaleString()}
        </Text>
      </View>
      
      <View style={styles.barContainer}>
        <View style={styles.ticksContainer}>
          {generateTicks()}
        </View>
        <View style={styles.barBackground}>
          <Animated.View style={[styles.barFill, animatedStyle]} />
        </View>
      </View>
      
      {rpm >= 6400 && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>RED ZONE</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  barContainer: {
    position: 'relative',
    height: 30,
  },
  ticksContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    flexDirection: 'row',
  },
  tick: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -5 }],
  },
  tickMark: {
    width: 1,
    height: 8,
    backgroundColor: '#666666',
  },
  redZoneTick: {
    backgroundColor: '#FF4444',
  },
  tickLabel: {
    fontSize: 10,
    color: '#888888',
    marginTop: 2,
    textAlign: 'center',
  },
  redZoneLabel: {
    color: '#FF4444',
  },
  barBackground: {
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 2,
  },
  warningContainer: {
    alignItems: 'center',
    marginTop: 5,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  warningText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default RPMBar;
