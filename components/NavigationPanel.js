import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';

const NavigationPanel = ({ 
  accentColor = '#00FFFF', 
  style, 
  mode = 'off', // 'off', 'map', 'navigation'
  routeData = null // REAL route data only - no mock data
}) => {
  const [location, setLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [locationReady, setLocationReady] = useState(false);
  const pulseAnimation = useSharedValue(1);

  // Only animate when navigation is active and has real data
  useEffect(() => {
    if (mode === 'navigation' && routeData && locationReady) {
      pulseAnimation.value = withRepeat(
        withTiming(1.3, { duration: 1500 }),
        -1,
        true
      );
    } else if (mode === 'map' && locationReady) {
      pulseAnimation.value = withRepeat(
        withTiming(1.1, { duration: 2000 }),
        -1,
        true
      );
    } else {
      pulseAnimation.value = withTiming(1, { duration: 300 });
    }
  }, [mode, routeData, locationReady]);

  // Get user location
  useEffect(() => {
    let locationSubscription;
    
    if (mode !== 'off') {
      const startLocationTracking = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return;

          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 1,
            },
            (locationData) => {
              setLocation({
                latitude: locationData.coords.latitude,
                longitude: locationData.coords.longitude,
              });
              setHeading(locationData.coords.heading || 0);
              setSpeed(Math.round((locationData.coords.speed || 0) * 3.6));
              setLocationReady(true);
            }
          );
        } catch (error) {
          console.error('Location tracking error:', error);
        }
      };

      startLocationTracking();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      setLocationReady(false);
    };
  }, [mode]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  const getManeuverIcon = () => {
    if (!routeData || !routeData.maneuverType) return 'navigate-outline';
    switch (routeData.maneuverType) {
      case 'left': return 'arrow-back';
      case 'right': return 'arrow-forward';
      case 'straight': return 'arrow-up';
      default: return 'navigate';
    }
  };

  // Show blank state when off
  if (mode === 'off') {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.blankContainer}>
          <Ionicons name="navigate-outline" size={48} color="#333333" />
          <Text style={styles.blankText}>Navigation disabled</Text>
        </View>
      </View>
    );
  }

  // Show loading state
  if (!locationReady || !location) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          <Ionicons name="location" size={32} color={accentColor} />
          <Text style={styles.loadingText}>Getting GPS location...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.mapContainer}>
        {/* Main Map */}
        <MapView
          style={styles.map}
          region={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }}
          customMapStyle={modernDarkMapStyle}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsBuildings={true}
          showsTraffic={false}
          showsIndoors={false}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={true}
          mapType="standard"
        >
          {/* Route Path - ONLY if real route data exists */}
          {mode === 'navigation' && routeData && routeData.coordinates && (
            <Polyline
              coordinates={routeData.coordinates}
              strokeColor={accentColor}
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* User Location Marker */}
          <Marker
            coordinate={location}
            anchor={{ x: 0.5, y: 0.5 }}
            style={styles.markerContainer}
          >
            <View style={styles.locationMarker}>
              <Animated.View style={[
                styles.outerRing, 
                animatedPulseStyle, 
                { borderColor: accentColor }
              ]} />
              <View style={[styles.innerDot, { backgroundColor: accentColor }]} />
              <View 
                style={[
                  styles.arrow, 
                  { transform: [{ rotate: `${heading}deg` }] }
                ]}
              >
                <Ionicons name="navigation" size={14} color="#000000" />
              </View>
            </View>
          </Marker>
        </MapView>

        {/* Edge Fade Overlays */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.leftFade}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.rightFade}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.topFade}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.bottomFade}
          pointerEvents="none"
        />

        {/* Navigation Info Panel - RIGHT SIDE - ONLY if real route data exists */}
        {mode === 'navigation' && routeData && (
          <View style={styles.rightInfoPanel}>
            {/* Current Maneuver - only if data exists */}
            {routeData.distance && (
              <View style={[styles.maneuverCard, { borderColor: accentColor }]}>
                <Ionicons 
                  name={getManeuverIcon()} 
                  size={24} 
                  color={accentColor} 
                />
                <Text style={[styles.maneuverDistance, { color: accentColor }]}>
                  {routeData.distance}
                </Text>
              </View>
            )}

            {/* Street Name - only if data exists */}
            {routeData.streetName && (
              <View style={styles.streetCard}>
                <Text style={styles.streetName}>{routeData.streetName}</Text>
              </View>
            )}

            {/* Next Instruction - only if data exists */}
            {routeData.nextInstruction && routeData.nextDistance && (
              <View style={styles.nextCard}>
                <Ionicons name="return-down-forward" size={16} color="#CCCCCC" />
                <Text style={styles.nextText}>
                  {routeData.nextInstruction}
                </Text>
                <Text style={styles.nextDistance}>
                  {routeData.nextDistance}
                </Text>
              </View>
            )}

            {/* Trip Summary - only if data exists */}
            {(routeData.totalDistance || routeData.totalTime || routeData.eta) && (
              <View style={styles.summaryCard}>
                {routeData.totalDistance && (
                  <View style={styles.summaryRow}>
                    <Ionicons name="flag" size={14} color="#666666" />
                    <Text style={styles.summaryText}>{routeData.totalDistance}</Text>
                  </View>
                )}
                {routeData.totalTime && (
                  <View style={styles.summaryRow}>
                    <Ionicons name="time" size={14} color="#666666" />
                    <Text style={styles.summaryText}>{routeData.totalTime}</Text>
                  </View>
                )}
                {routeData.eta && (
                  <View style={styles.summaryRow}>
                    <Ionicons name="alarm" size={14} color={accentColor} />
                    <Text style={[styles.summaryText, { color: accentColor }]}>
                      {routeData.eta}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Speed Overlay - Bottom Left - only if moving */}
        {speed > 0 && (
          <View style={styles.speedOverlay}>
            <Text style={[styles.speedText, { color: accentColor }]}>
              {speed}
            </Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
        )}

        {/* Map Mode Indicator - Top Left */}
        <View style={styles.modeIndicator}>
          <Ionicons 
            name={mode === 'navigation' ? 'navigate' : 'map'} 
            size={16} 
            color={accentColor} 
          />
          <Text style={[styles.modeText, { color: accentColor }]}>
            {mode === 'navigation' ? 'NAV' : 'MAP'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Modern dark map style
const modernDarkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a8a8a' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2c2c2c' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3c3c3c' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a1a' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#000000' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  blankContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  blankText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 15,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 10,
  },
  mapContainer: {
    height: 320,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  // Edge fade effects
  leftFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 20,
  },
  rightFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 15,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 15,
  },
  // Location marker
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    backgroundColor: 'rgba(0, 255, 255, 0.15)',
    position: 'absolute',
  },
  innerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
  },
  arrow: {
    position: 'absolute',
    backgroundColor: 'white',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, y: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Right side navigation info - ONLY shows when real data exists
  rightInfoPanel: {
    position: 'absolute',
    right: 15,
    top: 15,
    bottom: 15,
    width: 120,
    justifyContent: 'flex-start',
  },
  maneuverCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 8,
  },
  maneuverDistance: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  streetCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  streetName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  nextCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  nextText: {
    color: '#CCCCCC',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  nextDistance: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryText: {
    color: '#CCCCCC',
    fontSize: 10,
    marginLeft: 6,
  },
  // Overlays
  speedOverlay: {
    position: 'absolute',
    bottom: 15,
    left: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 8,
  },
  speedText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  speedUnit: {
    fontSize: 10,
    color: '#CCCCCC',
  },
  modeIndicator: {
    position: 'absolute',
    top: 15,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modeText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default NavigationPanel;
