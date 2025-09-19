import * as Location from 'expo-location';
import { Accelerometer, Gyroscope, Barometer } from 'expo-sensors';

class YezdiSensorManager {
  constructor() {
    this.locationSubscription = null;
    this.accelerometerSubscription = null;
    this.gyroscopeSubscription = null;
    this.barometerSubscription = null;
    this.callbacks = {
      onLocationUpdate: null,
      onMotionUpdate: null,
      onOrientationUpdate: null,
      onPressureUpdate: null,
    };
    this.isInitialized = false;
    this.lastLocation = null;
    this.lastLocationTime = null;
  }

  async initialize() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      
      this.isInitialized = true;
      console.log('SensorManager initialized successfully');
    } catch (error) {
      console.error('SensorManager initialization failed:', error);
      throw error;
    }
  }

  // GPS tracking for speed estimation
  async startGPSTracking(callback) {
    if (!this.isInitialized) {
      throw new Error('SensorManager not initialized');
    }

    this.callbacks.onLocationUpdate = callback;
    
    try {
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 1, // Update every meter
        },
        (location) => {
          const currentTime = Date.now();
          let estimatedSpeed = 0;

          // Calculate speed if we have previous location
          if (this.lastLocation && this.lastLocationTime) {
            const distance = this.calculateDistance(
              this.lastLocation.coords.latitude,
              this.lastLocation.coords.longitude,
              location.coords.latitude,
              location.coords.longitude
            );

            const timeDiff = (currentTime - this.lastLocationTime) / 1000; // seconds
            estimatedSpeed = (distance / timeDiff) * 3.6; // Convert m/s to km/h

            // Validate speed (ignore unrealistic values)
            if (estimatedSpeed < 0 || estimatedSpeed > 300) {
              estimatedSpeed = 0;
            }
          }

          const locationData = {
            speed: Math.round(estimatedSpeed),
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            timestamp: currentTime,
          };

          this.lastLocation = location;
          this.lastLocationTime = currentTime;

          callback(locationData);
        }
      );

      console.log('GPS tracking started');
    } catch (error) {
      console.error('Failed to start GPS tracking:', error);
      throw error;
    }
  }

  // Motion tracking using accelerometer
  startMotionTracking(callback) {
    this.callbacks.onMotionUpdate = callback;

    Accelerometer.setUpdateInterval(1000); // Update every second

    this.accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const isMoving = magnitude > 1.2; // Threshold for detecting motion
      
      // Calculate approximate acceleration (subtract gravity)
      const netAcceleration = Math.abs(magnitude - 9.81);
      
      const motionData = {
        acceleration: netAcceleration,
        magnitude: magnitude,
        motion: isMoving,
        rawData: { x, y, z },
        timestamp: Date.now(),
      };

      callback(motionData);
    });

    console.log('Motion tracking started');
  }

  // Orientation tracking using gyroscope
  startOrientationTracking(callback) {
    this.callbacks.onOrientationUpdate = callback;

    Gyroscope.setUpdateInterval(1000);

    this.gyroscopeSubscription = Gyroscope.addListener(({ x, y, z }) => {
      // Convert rad/s to degrees/s
      const orientationData = {
        rotationX: x * (180 / Math.PI),
        rotationY: y * (180 / Math.PI),
        rotationZ: z * (180 / Math.PI),
        timestamp: Date.now(),
      };

      callback(orientationData);
    });

    console.log('Orientation tracking started');
  }

  // Pressure tracking using barometer (if available)
  startPressureTracking(callback) {
    this.callbacks.onPressureUpdate = callback;

    // Check if barometer is available
    Barometer.isAvailableAsync().then((available) => {
      if (available) {
        Barometer.setUpdateInterval(5000); // Update every 5 seconds

        this.barometerSubscription = Barometer.addListener(({ pressure, relativeAltitude }) => {
          const pressureData = {
            pressure: pressure, // hPa
            relativeAltitude: relativeAltitude, // meters
            timestamp: Date.now(),
          };

          callback(pressureData);
        });

        console.log('Pressure tracking started');
      } else {
        console.log('Barometer not available on this device');
      }
    });
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) * 
      Math.cos(this.degreesToRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Stop all tracking
  stopAllTracking() {
    this.stopGPSTracking();
    this.stopMotionTracking();
    this.stopOrientationTracking();
    this.stopPressureTracking();
  }

  // Stop GPS tracking
  stopGPSTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
      console.log('GPS tracking stopped');
    }
  }

  // Stop motion tracking
  stopMotionTracking() {
    if (this.accelerometerSubscription) {
      this.accelerometerSubscription.remove();
      this.accelerometerSubscription = null;
      console.log('Motion tracking stopped');
    }
  }

  // Stop orientation tracking
  stopOrientationTracking() {
    if (this.gyroscopeSubscription) {
      this.gyroscopeSubscription.remove();
      this.gyroscopeSubscription = null;
      console.log('Orientation tracking stopped');
    }
  }

  // Stop pressure tracking
  stopPressureTracking() {
    if (this.barometerSubscription) {
      this.barometerSubscription.remove();
      this.barometerSubscription = null;
      console.log('Pressure tracking stopped');
    }
  }

  // Get sensor availability status
  async getSensorStatus() {
    try {
      const locationStatus = await Location.getForegroundPermissionsAsync();
      const barometerAvailable = await Barometer.isAvailableAsync();
      
      return {
        location: locationStatus.status === 'granted',
        accelerometer: true, // Usually available on all devices
        gyroscope: true, // Usually available on all devices
        barometer: barometerAvailable,
        initialized: this.isInitialized,
      };
    } catch (error) {
      console.error('Error checking sensor status:', error);
      return {
        location: false,
        accelerometer: false,
        gyroscope: false,
        barometer: false,
        initialized: false,
      };
    }
  }
}

// Create singleton instance
const SensorManager = new YezdiSensorManager();

export default SensorManager;
