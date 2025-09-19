import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Image,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Speedometer from '../components/Speedometer';
import RPMBar from '../components/RPMBar';
import FuelBar from '../components/FuelBar';
import MusicControls from '../components/MusicControls';
import NavigationPanel from '../components/NavigationPanel';
import BleManager from '../utils/BleManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const DashboardScreen = () => {
  const { width, height } = useWindowDimensions();
  const [bikeData, setBikeData] = useState({
    speed: '--',
    gear: '--',
    rpm: 0,
    fuel: 0,
    ridingMode: 'Road',
    highBeam: false,
    hazard: false,
    engineCheck: false,
    battery: false,
    odometer: '--',
    tripA: '--',
    tripB: '--',
    afe: '--',
    bfe: '--',
    connected: false,
  });

  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [navigationActive, setNavigationActive] = useState(false);
  const [navigationMode, setNavigationMode] = useState('off'); // 'off', 'map', 'navigation'
  const [musicActive, setMusicActive] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [accentColor, setAccentColor] = useState('#00FFFF');
  const [warningBlinkEnabled, setWarningBlinkEnabled] = useState(true);
  const [settings, setSettings] = useState({
    mapViewEnabled: false,
    fullNavigationEnabled: false,
    navigationAutoStart: false,
  });

  const blinkAnimation = useSharedValue(1);
  const panelScale = useSharedValue(0);

  // Initialize BLE connection
  useEffect(() => {
    const initializeBLE = async () => {
      try {
        await BleManager.initialize();
        BleManager.setDataCallback(handleBikeDataUpdate);
        BleManager.setConnectionCallback(handleConnectionChange);
        
        // Load settings
        const savedAccentColor = await AsyncStorage.getItem('accentColor');
        if (savedAccentColor) setAccentColor(savedAccentColor);
        
        const savedWarningBlink = await AsyncStorage.getItem('warningBlinkEnabled');
        if (savedWarningBlink !== null) setWarningBlinkEnabled(JSON.parse(savedWarningBlink));
        
        // Load navigation settings
        const savedSettings = await AsyncStorage.getItem('navigationSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings(parsedSettings);
          
          // Auto-start navigation if enabled
          if (parsedSettings.navigationAutoStart) {
            if (parsedSettings.fullNavigationEnabled) {
              setNavigationMode('navigation');
            } else if (parsedSettings.mapViewEnabled) {
              setNavigationMode('map');
            }
            setNavigationActive(true);
          }
        }
        
        BleManager.startScanning();
      } catch (error) {
        console.error('BLE initialization failed:', error);
        Alert.alert('Bluetooth Error', 'Failed to initialize Bluetooth. Using fallback data.');
      }
    };

    initializeBLE();

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timeInterval);
      BleManager.disconnect();
    };
  }, []);

  // Handle bike data updates from BLE
  const handleBikeDataUpdate = (data) => {
    setBikeData(prevData => ({
      ...prevData,
      ...data,
      connected: true,
    }));
  };

  // Handle connection status changes
  const handleConnectionChange = (connected) => {
    if (!connected) {
      setBikeData(prevData => ({
        ...prevData,
        connected: false,
        speed: '--',
        gear: '--',
        rpm: 0,
        fuel: 0,
        highBeam: false,
        hazard: false,
        engineCheck: false,
        battery: false,
        odometer: '--',
        tripA: '--',
        tripB: '--',
        afe: '--',
        bfe: '--',
      }));
    }
  };

  // Warning blink effect for high speed - only when connected
  useEffect(() => {
    if (warningBlinkEnabled && bikeData.connected && bikeData.speed !== '--' && bikeData.speed >= 120) {
      blinkAnimation.value = withRepeat(
        withTiming(0.3, { duration: 500 }),
        -1,
        true
      );
    } else {
      blinkAnimation.value = withTiming(1, { duration: 200 });
    }
  }, [bikeData.speed, bikeData.connected, warningBlinkEnabled]);

  // Left panel animation
  useEffect(() => {
    panelScale.value = withTiming(showLeftPanel ? 1 : 0, { duration: 300 });
  }, [showLeftPanel]);

  const blinkStyle = useAnimatedStyle(() => ({
    opacity: blinkAnimation.value,
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: panelScale.value }],
    opacity: panelScale.value,
  }));

  // Responsive sizing calculations
  const speedometerSize = Math.min(width * 0.35, height * 0.25);
  const panelButtonSize = Math.min(width * 0.08, height * 0.06);

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  };

  const formatDate = (date) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const toggleNavigation = () => {
    if (!navigationActive) {
      // Determine mode based on settings
      if (settings.fullNavigationEnabled) {
        setNavigationMode('navigation');
      } else if (settings.mapViewEnabled) {
        setNavigationMode('map');
      } else {
        setNavigationMode('map'); // Default to map mode
      }
      setNavigationActive(true);
    } else {
      setNavigationActive(false);
      setNavigationMode('off');
    }
  };

  return (
    <Animated.View style={[styles.container, blinkStyle]}>
      <ImageBackground
        source={require('../assets/images/yezdi-logo.png')}
        style={styles.backgroundLogo}
        imageStyle={styles.backgroundLogoImage}
      >
        <View style={styles.content}>
          {/* Left Side Panel */}
          <View style={[styles.leftPanel, { top: height * 0.1 }]}>
            <TouchableOpacity
              style={[styles.panelButton, { width: panelButtonSize, height: panelButtonSize }]}
              onPress={() => setShowLeftPanel(!showLeftPanel)}
            >
              <Ionicons name="menu" size={panelButtonSize * 0.6} color={accentColor} />
            </TouchableOpacity>

            <Animated.View style={[styles.panelButtons, panelStyle]}>
              <TouchableOpacity
                style={[styles.panelButton, { width: panelButtonSize, height: panelButtonSize, marginTop: 10 }]}
                onPress={() => Alert.alert('Connectivity', 'Opening connectivity settings...')}
              >
                <Ionicons 
                  name={bikeData.connected ? "bluetooth" : "bluetooth-outline"} 
                  size={panelButtonSize * 0.6} 
                  color={bikeData.connected ? accentColor : '#FF4444'} 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.panelButton, { width: panelButtonSize, height: panelButtonSize, marginTop: 10 }]}
                onPress={toggleNavigation}
              >
                <Ionicons 
                  name={navigationActive ? "navigate" : "navigate-outline"} 
                  size={panelButtonSize * 0.6} 
                  color={navigationActive ? accentColor : '#CCCCCC'} 
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.panelButton, { width: panelButtonSize, height: panelButtonSize, marginTop: 10 }]}
                onPress={() => Alert.alert('Settings', 'Opening settings...')}
              >
                <Ionicons name="settings" size={panelButtonSize * 0.6} color={accentColor} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.panelButton, { width: panelButtonSize, height: panelButtonSize, marginTop: 10 }]}
              >
                <Image
                  source={require('../assets/images/bike-icon.png')}
                  style={{ width: panelButtonSize * 0.8, height: panelButtonSize * 0.8 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Main Dashboard Content */}
          <View style={styles.dashboardContent}>
            {/* Top Status Bar */}
            <View style={styles.statusBar}>
              <Text style={[styles.timeText, { color: accentColor }]}>
                {formatTime(currentTime)}
              </Text>
              <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
              
              {/* Indicators */}
              <View style={styles.indicators}>
                <Ionicons 
                  name="flash" 
                  size={20} 
                  color={bikeData.highBeam ? accentColor : '#333'} 
                />
                <Ionicons 
                  name="warning" 
                  size={20} 
                  color={bikeData.hazard ? '#FF4444' : '#333'} 
                />
                <Ionicons 
                  name="construct" 
                  size={20} 
                  color={bikeData.engineCheck ? '#FF4444' : '#333'} 
                />
                <Ionicons 
                  name="battery-half" 
                  size={20} 
                  color={bikeData.battery ? '#FF4444' : accentColor} 
                />
              </View>
            </View>

            {/* Center Content - Speedometer and Bars */}
            <View style={styles.centerContent}>
              <Speedometer
                speed={bikeData.speed}
                odometer={bikeData.odometer}
                tripA={bikeData.tripA}
                tripB={bikeData.tripB}
                afe={bikeData.afe}
                bfe={bikeData.bfe}
                size={speedometerSize}
                accentColor={accentColor}
              />
              
              <View style={styles.barsContainer}>
                <RPMBar rpm={bikeData.rpm} accentColor={accentColor} />
                <FuelBar fuel={bikeData.fuel} accentColor={accentColor} />
                
                {/* Gear and Mode Display */}
                <View style={styles.gearModeContainer}>
                  <View style={styles.gearDisplay}>
                    <Text style={styles.gearLabel}>GEAR</Text>
                    <Text style={[styles.gearValue, { color: accentColor }]}>
                      {bikeData.gear}
                    </Text>
                  </View>
                  
                  <View style={styles.modeDisplay}>
                    <Text style={styles.modeLabel}>MODE</Text>
                    <Text style={[styles.modeValue, { color: accentColor }]}>
                      {bikeData.ridingMode}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Right Side Content */}
            <View style={styles.rightContent}>
              {navigationActive ? (
                <NavigationPanel 
                  accentColor={accentColor}
                  style={styles.navigationPanel}
                  mode={navigationMode}
                  routeData={null} // Only pass real route data when available
                />
              ) : (
                <Image
                  source={require('../assets/images/yezdi-bike.png')}
                  style={styles.bikeImage}
                  resizeMode="contain"
                />
              )}
              
              {musicActive && (
                <MusicControls accentColor={accentColor} />
              )}
            </View>
          </View>

          {/* Connection Status - Only show when disconnected */}
          {!bikeData.connected && (
            <View style={styles.connectionStatus}>
              <Text style={styles.connectionText}>
                Bluetooth Disconnected - Displaying Blank Data
              </Text>
            </View>
          )}
        </View>
      </ImageBackground>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundLogo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundLogoImage: {
    opacity: 0.05,
    resizeMode: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  leftPanel: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  panelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
  },
  panelButtons: {
    alignItems: 'center',
  },
  dashboardContent: {
    flex: 1,
    marginLeft: 80,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  indicators: {
    flexDirection: 'row',
    gap: 15,
  },
  centerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  barsContainer: {
    flex: 1,
    paddingLeft: 30,
  },
  gearModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  gearDisplay: {
    alignItems: 'center',
  },
  gearLabel: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 5,
  },
  gearValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modeDisplay: {
    alignItems: 'center',
  },
  modeLabel: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 5,
  },
  modeValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rightContent: {
    width: 280,
    height: 350,
    justifyContent: 'space-between',
  },
  navigationPanel: {
    flex: 1,
    marginBottom: 20,
  },
  bikeImage: {
    flex: 1,
    width: '100%',
    opacity: 0.7,
  },
  connectionStatus: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  connectionText: {
    color: '#FF4444',
    textAlign: 'center',
    fontSize: 12,
  },
});

export default DashboardScreen;
