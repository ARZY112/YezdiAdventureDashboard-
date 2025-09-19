import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { PanGestureHandler, LongPressGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import BleManager from '../utils/BleManager';

const Speedometer = ({ speed, odometer, tripA, tripB, afe, bfe, size, accentColor }) => {
  const [currentDisplay, setCurrentDisplay] = useState('ODO');
  const displayRotation = useSharedValue(0);

  // UPDATED: Yezdi-style combined displays
  const displays = {
    'ODO': {
      primary: odometer || '--',
      secondary: afe || '--',
      label: 'ODO AFE'
    },
    'TRIP A': {
      primary: tripA || '--',
      secondary: afe || '--', 
      label: 'TRIP A AFE'
    },
    'TRIP B': {
      primary: tripB || '--',
      secondary: bfe || '--',
      label: 'TRIP B BFE'
    },
  };

  const displayKeys = Object.keys(displays);
  const currentIndex = displayKeys.indexOf(currentDisplay);
  const currentData = displays[currentDisplay];

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startRotation = displayRotation.value;
    },
    onActive: (event, context) => {
      displayRotation.value = context.startRotation + event.translationX / 50;
    },
    onEnd: (event) => {
      const velocity = event.velocityX;
      const threshold = 100;
      
      if (velocity > threshold) {
        runOnJS(switchToNext)();
      } else if (velocity < -threshold) {
        runOnJS(switchToPrevious)();
      }
      
      displayRotation.value = 0;
    },
  });

  const longPressHandler = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      runOnJS(handleLongPress)();
    }
  };

  const handleLongPress = () => {
    if (currentDisplay === 'TRIP A') {
      Alert.alert(
        'Reset Trip A',
        'Reset Trip A counter to zero?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', onPress: () => resetTrip('A') }
        ]
      );
    } else if (currentDisplay === 'TRIP B') {
      Alert.alert(
        'Reset Trip B', 
        'Reset Trip B counter to zero?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', onPress: () => resetTrip('B') }
        ]
      );
    }
  };

  const resetTrip = async (trip) => {
    try {
      await BleManager.sendTripReset(trip);
      Alert.alert('Success', `Trip ${trip} has been reset`);
    } catch (error) {
      Alert.alert('Error', `Failed to reset Trip ${trip}`);
    }
  };

  const switchToNext = () => {
    const nextIndex = (currentIndex + 1) % displayKeys.length;
    setCurrentDisplay(displayKeys[nextIndex]);
  };

  const switchToPrevious = () => {
    const prevIndex = currentIndex === 0 ? displayKeys.length - 1 : currentIndex - 1;
    setCurrentDisplay(displayKeys[prevIndex]);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${displayRotation.value}deg` }],
  }));

  // Calculate needle rotation based on speed (0-180 km/h mapped to -90 to +90 degrees)
  const needleRotation = speed === '--' ? -90 : interpolate(
    Math.min(Math.max(parseInt(speed) || 0, 0), 180),
    [0, 180],
    [-90, 90]
  );

  // Generate speedometer ticks
  const generateTicks = () => {
    const ticks = [];
    const center = size / 2;
    const radius = size * 0.35;

    for (let i = 0; i <= 18; i++) {
      const angle = (i * 10 - 90) * (Math.PI / 180);
      const isMajor = i % 2 === 0;
      const tickLength = isMajor ? 15 : 8;
      
      const x1 = center + Math.cos(angle) * radius;
      const y1 = center + Math.sin(angle) * radius;
      const x2 = center + Math.cos(angle) * (radius - tickLength);
      const y2 = center + Math.sin(angle) * (radius - tickLength);

      ticks.push(
        <Path
          key={i}
          d={`M ${x1} ${y1} L ${x2} ${y2}`}
          stroke="#FFFFFF"
          strokeWidth={isMajor ? 2 : 1}
          opacity={0.8}
        />
      );

      // Add speed labels for major ticks
      if (isMajor) {
        const labelRadius = radius - 25;
        const labelX = center + Math.cos(angle) * labelRadius;
        const labelY = center + Math.sin(angle) * labelRadius;
        const speedValue = i * 10;

        ticks.push(
          <SvgText
            key={`label-${i}`}
            x={labelX}
            y={labelY}
            fontSize={size * 0.04}
            fill="#FFFFFF"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {speedValue}
          </SvgText>
        );
      }
    }

    return ticks;
  };

  // Generate needle path
  const generateNeedle = () => {
    const center = size / 2;
    const needleLength = size * 0.28;
    const angle = needleRotation * (Math.PI / 180);
    
    const tipX = center + Math.cos(angle) * needleLength;
    const tipY = center + Math.sin(angle) * needleLength;
    
    const baseWidth = 4;
    const baseX1 = center + Math.cos(angle + Math.PI/2) * baseWidth;
    const baseY1 = center + Math.sin(angle + Math.PI/2) * baseWidth;
    const baseX2 = center + Math.cos(angle - Math.PI/2) * baseWidth;
    const baseY2 = center + Math.sin(angle - Math.PI/2) * baseWidth;

    return `M ${baseX1} ${baseY1} L ${tipX} ${tipY} L ${baseX2} ${baseY2} Z`;
  };

  const speedColor = speed !== '--' && parseInt(speed) > 100 ? '#FF4444' : accentColor;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.speedometerSvg}>
        {/* Outer circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.38}
          fill="none"
          stroke="#333333"
          strokeWidth={2}
        />
        
        {/* Speed arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.35}
          fill="none"
          stroke={speedColor}
          strokeWidth={6}
          strokeDasharray={`${speed !== '--' ? (parseInt(speed) / 180) * 565 : 0} 565`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          opacity={0.8}
        />

        {/* Ticks and labels */}
        {generateTicks()}

        {/* Center speed display */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size * 0.15}
          fill="#1A1A1A"
          stroke="#333333"
          strokeWidth={1}
        />

        {/* Needle */}
        <Path
          d={generateNeedle()}
          fill={speedColor}
          stroke={speedColor}
          strokeWidth={1}
        />

        {/* Center dot */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={6}
          fill={accentColor}
        />
      </Svg>

      {/* Speed display */}
      <View style={[styles.speedDisplay, { top: size * 0.35 }]}>
        <Text style={[styles.speedValue, { fontSize: size * 0.12, color: speedColor }]}>
          {speed}
        </Text>
        <Text style={[styles.speedUnit, { fontSize: size * 0.04 }]}>km/h</Text>
      </View>

      {/* UPDATED: Yezdi-style combined odometer display */}
      <LongPressGestureHandler
        onHandlerStateChange={longPressHandler}
        minDurationMs={1000}
      >
        <PanGestureHandler onGestureEvent={panGestureHandler}>
          <Animated.View style={[styles.odometerDisplay, { bottom: size * 0.15 }, animatedStyle]}>
            <Text style={[styles.odometerLabel, { fontSize: size * 0.032 }]}>
              {currentData.label}
            </Text>
            <View style={styles.odometerValues}>
              <Text style={[styles.odometerPrimary, { fontSize: size * 0.048, color: accentColor }]}>
                {currentData.primary}
              </Text>
              <View style={styles.odometerSecondaryContainer}>
                <Text style={[styles.odometerSecondary, { fontSize: size * 0.032 }]}>
                  {currentData.secondary}
                </Text>
                <Text style={[styles.odometerUnit, { fontSize: size * 0.025 }]}>
                  km/l
                </Text>
              </View>
            </View>
          </Animated.View>
        </PanGestureHandler>
      </LongPressGestureHandler>

      {/* Swipe indicators */}
      <View style={[styles.swipeIndicators, { bottom: size * 0.05 }]}>
        {displayKeys.map((key, index) => (
          <View
            key={key}
            style={[
              styles.indicator,
              {
                backgroundColor: index === currentIndex ? accentColor : '#333333',
                width: 8,
                height: 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedometerSvg: {
    position: 'absolute',
  },
  speedDisplay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedValue: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  speedUnit: {
    color: '#CCCCCC',
    textAlign: 'center',
  },
  odometerDisplay: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 110,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  odometerLabel: {
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '500',
  },
  odometerValues: {
    alignItems: 'center',
  },
  odometerPrimary: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  odometerSecondaryContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  odometerSecondary: {
    color: '#CCCCCC',
    fontFamily: 'monospace',
  },
  odometerUnit: {
    color: '#888888',
  },
  swipeIndicators: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 6,
  },
  indicator: {
    borderRadius: 4,
  },
});

export default Speedometer;
