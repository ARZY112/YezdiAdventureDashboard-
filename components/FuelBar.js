import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const FuelBar = ({ fuel, accentColor }) => {
  const animatedWidth = useSharedValue(0);
  
  React.useEffect(() => {
    const percentage = Math.min(Math.max(fuel / 100, 0), 1);
    animatedWidth.value = withTiming(percentage, { duration: 500 });
  }, [fuel]);

  const animatedStyle = useAnimatedStyle(() => {
    const width = interpolate(animatedWidth.value, [0, 1], [0, 100]);
    const colorProgress = interpolate(animatedWidth.value, [0, 0.25, 0.5, 1], [1, 1, 0, 0]);
    
    return {
      width: `${width}%`,
      backgroundColor: colorProgress > 0.5 ? '#FF4444' : colorProgress > 0.25 ? '#FFA500' : accentColor,
    };
  });

  const getFuelIcon = () => {
    if (fuel <= 0) return 'battery-dead-outline';
    if (fuel <= 25) return 'battery-charging-outline';
    if (fuel <= 50) return 'battery-half-outline';
    if (fuel <= 75) return 'battery-charging-outline';
    return 'battery-full-outline';
  };

  const getFuelColor = () => {
    if (fuel <= 15) return '#FF4444';
    if (fuel <= 30) return '#FFA500';
    return accentColor;
  };

  const generateTicks = () => {
    const ticks = [];
    for (let i = 0; i <= 4; i++) {
      const position = (i / 4) * 100;
      const value = i * 25;
      
      ticks.push(
        <View key={i} style={[styles.tick, { left: `${position}%` }]}>
          <View style={styles.tickMark} />
          <Text style={styles.tickLabel}>{value}</Text>
        </View>
      );
    }
    return ticks;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name={getFuelIcon()} 
          size={20} 
          color={getFuelColor()} 
        />
        <Text style={styles.label}>FUEL</Text>
      </View>
      
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <Animated.View style={[styles.barFill, animatedStyle]} />
        </View>
        <View style={styles.ticksContainer}>
          {generateTicks()}
        </View>
      </View>
      
      <Text style={[styles.value, { color: getFuelColor() }]}>
        {fuel === 0 ? '--' : `${fuel}%`}
      </Text>
      
      {fuel <= 15 && fuel > 0 && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={16} color="#FF4444" />
          <Text style={styles.warningText}>Low Fuel</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#CCCCCC',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  barContainer: {
    position: 'relative',
    height: 30,
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
  tickLabel: {
    fontSize: 10,
    color: '#888888',
    marginTop: 15,
    textAlign: 'center',
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  warningText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default FuelBar;
