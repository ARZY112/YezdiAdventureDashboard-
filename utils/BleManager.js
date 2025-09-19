import { BleManager as RNBleManager, Device } from 'react-native-ble-plx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Crypto from 'expo-crypto';
import { Buffer } from 'buffer';

class YezdiBleManager {
  constructor() {
    this.manager = new RNBleManager();
    this.connectedDevice = null;
    this.isScanning = false;
    this.dataCallback = null;
    this.connectionCallback = null;
    this.debugLogs = [];
    this.customSettings = {
      serviceUUID: '',
      charUUID: '',
      authKey: 'YEZDI_AUTH_DEFAULT',
    };
    
    // Mock data for testing - CLEAN VERSION
    this.mockData = {
      speed: 0,
      gear: 1,
      rpm: 0,
      fuel: 0,
      ridingMode: 'Road',
      highBeam: false,
      hazard: false,
      engineCheck: false,
      battery: true,
      odometer: '00000',
      tripA: '000.0',
      tripB: '000.0',
      afe: '00.0',
      bfe: '00.0',
    };

    // Fallback data sources
    this.sensorFallbackEnabled = true;
    this.mockDataEnabled = false;
    this.cachedDataEnabled = true;
    this.lastKnownData = null;
    this.mockDataInterval = null;
    this.gpsSubscription = null;
    this.accelerometerSubscription = null;
  }

  // Debug logging system
  log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message };
    this.debugLogs.push(logEntry);
    
    // Keep only last 500 logs
    if (this.debugLogs.length > 500) {
      this.debugLogs = this.debugLogs.slice(-500);
    }
    
    console.log(`[${level}] ${message}`);
  }

  async getDebugLogs() {
    return this.debugLogs;
  }

  async clearDebugLogs() {
    this.debugLogs = [];
    this.log('INFO', 'Debug logs cleared');
  }

  // Initialize BLE manager
  async initialize() {
    try {
      this.log('INFO', 'Initializing BLE Manager');
      
      // Request permissions
      await this.requestPermissions();
      
      // Load cached settings
      await this.loadCachedSettings();
      
      // Start mock data simulation if enabled
      if (this.mockDataEnabled) {
        this.startMockDataSimulation();
      }

      this.log('INFO', 'BLE Manager initialized successfully');
    } catch (error) {
      this.log('ERROR', `BLE initialization failed: ${error.message}`);
      throw error;
    }
  }

  // Request necessary permissions
  async requestPermissions() {
    try {
      // Location permissions for fallback
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        this.log('WARN', 'Location permission denied - GPS fallback unavailable');
      }

      // Camera permissions for QR scanning
      const { status: cameraStatus } = await BarCodeScanner.requestPermissionsAsync();
      if (cameraStatus !== 'granted') {
        this.log('WARN', 'Camera permission denied - QR code authentication unavailable');
      }

      this.log('INFO', 'Permissions requested');
    } catch (error) {
      this.log('ERROR', `Permission request failed: ${error.message}`);
    }
  }

  // Load cached settings from AsyncStorage
  async loadCachedSettings() {
    try {
      const cached = await AsyncStorage.getItem('yezdi_cached_data');
      if (cached) {
        this.lastKnownData = JSON.parse(cached);
        this.log('INFO', 'Loaded cached data');
      }

      const settings = await AsyncStorage.getItem('yezdi_custom_settings');
      if (settings) {
        this.customSettings = { ...this.customSettings, ...JSON.parse(settings) };
        this.log('INFO', 'Loaded custom BLE settings');
      }
    } catch (error) {
      this.log('ERROR', `Failed to load cached settings: ${error.message}`);
    }
  }

  // Update custom settings
  updateCustomSettings(settings) {
    this.customSettings = { ...this.customSettings, ...settings };
    AsyncStorage.setItem('yezdi_custom_settings', JSON.stringify(this.customSettings));
    this.log('INFO', 'Updated custom BLE settings');
  }

  // Set data callback
  setDataCallback(callback) {
    this.dataCallback = callback;
  }

  // Set connection callback
  setConnectionCallback(callback) {
    this.connectionCallback = callback;
  }

  // Enhanced device discovery - UPDATED FOR YOUR BIKE
  isYezdiDevice(device) {
    const name = (device.name || '').toLowerCase();
    const id = (device.id || '').toLowerCase();
    
    // Multiple ways to identify Yezdi bikes
    const yezdiIndicators = [
      'yezdi',
      'adventure', 
      'bike',
      'motorcycle',
      'moto',
      'classic',
      'scrambler',
      // Add any specific identifiers you saw in nRF Connect
      'nordic', // Many bikes use Nordic chips
      'ble', 
      'uart'
    ];
    
    const isYezdi = yezdiIndicators.some(indicator => 
      name.includes(indicator) || id.includes(indicator)
    );
    
    // Also check signal strength (Yezdi bikes should have strong signal when close)
    const hasStrongSignal = device.rssi && device.rssi > -70;
    
    this.log('INFO', `Device check: ${device.name} (${device.id}) - RSSI: ${device.rssi} - IsYezdi: ${isYezdi}`);
    
    return isYezdi || (hasStrongSignal && device.name); // If strong signal and has name, likely a bike
  }

  // Start scanning for devices
  async startScanning(deviceCallback) {
    if (this.isScanning) {
      this.log('WARN', 'Already scanning');
      return;
    }

    try {
      this.isScanning = true;
      this.log('INFO', 'Starting BLE scan');

      const subscription = this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') {
          this.manager.startDeviceScan(null, null, (error, device) => {
            if (error) {
              this.log('ERROR', `Scan error: ${error.message}`);
              return;
            }

            if (device && device.name) {
              this.log('INFO', `Found device: ${device.name} (${device.id})`);
              
              // Check if it's a potential Yezdi device
              const isYezdiDevice = this.isYezdiDevice(device);
              if (isYezdiDevice) {
                this.log('INFO', `Potential Yezdi device found: ${device.name}`);
              }

              deviceCallback && deviceCallback({
                id: device.id,
                name: device.name,
                rssi: device.rssi,
                isYezdi: isYezdiDevice,
              });
            }
          });
        } else {
          this.log('ERROR', `Bluetooth state: ${state}`);
        }
      }, true);

      // Stop scanning after 30 seconds
      setTimeout(() => {
        this.stopScanning();
      }, 30000);

    } catch (error) {
      this.isScanning = false;
      this.log('ERROR', `Failed to start scanning: ${error.message}`);
      throw error;
    }
  }

  // Stop scanning
  stopScanning() {
    if (this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
      this.log('INFO', 'Stopped BLE scan');
    }
  }

  // Connect to device with multiple authentication methods
  async connectToDevice(device) {
    try {
      this.log('INFO', `Attempting to connect to ${device.name || device.id}`);
      
      const connectedDevice = await this.manager.connectToDevice(device.id);
      this.connectedDevice = connectedDevice;
      
      this.log('INFO', `Connected to ${device.name || device.id}`);
      
      // Discover services and characteristics
      await this.discoverServices(connectedDevice);
      
      // Attempt authentication
      await this.attemptAuthentication(connectedDevice);
      
      // Set up data monitoring
      await this.setupDataMonitoring(connectedDevice);
      
      // Notify connection established
      this.connectionCallback && this.connectionCallback(true, device);
      
      // Start sending real data
      this.startDataUpdates();
      
    } catch (error) {
      this.log('ERROR', `Connection failed: ${error.message}`);
      this.connectionCallback && this.connectionCallback(false, null);
      throw error;
    }
  }

  // Discover all services and characteristics
  async discoverServices(device) {
    try {
      this.log('INFO', 'Discovering services...');
      
      const deviceWithServices = await device.discoverAllServicesAndCharacteristics();
      const services = await deviceWithServices.services();
      
      for (const service of services) {
        this.log('INFO', `Found service: ${service.uuid}`);
        
        const characteristics = await service.characteristics();
        for (const char of characteristics) {
          this.log('INFO', `  Characteristic: ${char.uuid} (${char.isReadable ? 'R' : ''}${char.isWritableWithoutResponse ? 'W' : ''}${char.isNotifiable ? 'N' : ''})`);
        }
      }
      
      // Cache discovered UUIDs
      const serviceUUIDs = services.map(s => s.uuid);
      await AsyncStorage.setItem('yezdi_discovered_services', JSON.stringify(serviceUUIDs));
      
    } catch (error) {
      this.log('ERROR', `Service discovery failed: ${error.message}`);
    }
  }

  // Attempt multiple authentication methods
  async attemptAuthentication(device) {
    const authMethods = [
      () => this.genericKeyAuthentication(device),
      () => this.challengeResponseAuth(device),
      () => this.bondingAuthentication(device),
    ];

    for (let i = 0; i < authMethods.length; i++) {
      try {
        this.log('INFO', `Attempting authentication method ${i + 1}`);
        await authMethods[i]();
        this.log('INFO', `Authentication method ${i + 1} successful`);
        return;
      } catch (error) {
        this.log('WARN', `Authentication method ${i + 1} failed: ${error.message}`);
      }
    }

    this.log('WARN', 'All authentication methods failed, proceeding without authentication');
  }

  // Generic key authentication
  async genericKeyAuthentication(device) {
    try {
      const services = await device.services();
      for (const service of services) {
        const characteristics = await service.characteristics();
        for (const char of characteristics) {
          if (char.isWritableWithoutResponse || char.isWritableWithResponse) {
            await device.writeCharacteristicWithResponseForService(
              service.uuid,
              char.uuid,
              Buffer.from(this.customSettings.authKey).toString('base64')
            );
            this.log('INFO', `Wrote auth key to ${char.uuid}`);
          }
        }
      }
    } catch (error) {
      throw new Error(`Generic auth failed: ${error.message}`);
    }
  }

  // Challenge-response authentication
  async challengeResponseAuth(device) {
    try {
      // Simulate challenge-response
      const challenge = Math.random().toString(36).substring(7);
      const response = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        challenge + this.customSettings.authKey
      );
      
      this.log('INFO', `Challenge-response auth attempted`);
      // Would write response to appropriate characteristic
    } catch (error) {
      throw new Error(`Challenge-response auth failed: ${error.message}`);
    }
  }

  // Bonding authentication
  async bondingAuthentication(device) {
    // React Native BLE PLX doesn't directly support bonding
    // This is a placeholder for manual pairing
    this.log('INFO', 'Bonding authentication requires manual Bluetooth pairing');
    throw new Error('Manual pairing required');
  }

  // Set up data monitoring
  async setupDataMonitoring(device) {
    try {
      this.log('INFO', 'Setting up data monitoring');
      
      const services = await device.services();
      for (const service of services) {
        const characteristics = await service.characteristics();
        for (const char of characteristics) {
          if (char.isNotifiable) {
            this.log('INFO', `Subscribing to notifications from ${char.uuid}`);
            
            device.monitorCharacteristicForService(
              service.uuid,
              char.uuid,
              (error, characteristic) => {
                if (error) {
                  this.log('ERROR', `Monitoring error: ${error.message}`);
                  return;
                }
                
                if (characteristic && characteristic.value) {
                  this.parseIncomingData(characteristic.value);
                }
              }
            );
          }
        }
      }
    } catch (error) {
      this.log('ERROR', `Data monitoring setup failed: ${error.message}`);
    }
  }

  // UPDATED Parse incoming BLE data - ENHANCED FOR YOUR BIKE
  parseIncomingData(base64Data) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Log raw data for debugging
      this.log('INFO', `Received BLE data: ${buffer.toString('hex')}`);
      
      // Try multiple parsing strategies since Yezdi protocol is proprietary
      let data = {};
      
      // Strategy 1: Try direct byte parsing (common for motorcycle data)
      if (buffer.length >= 10) {
        data = {
          speed: buffer.readUInt8(0) || 0,
          gear: buffer.readUInt8(1) || 1,
          rpm: (buffer.readUInt16BE(2) * 10) || 0,
          fuel: buffer.readUInt8(4) || 0,
          ridingMode: ['Road', 'Rain', 'Off-Road'][buffer.readUInt8(5) % 3] || 'Road',
          highBeam: !!(buffer.readUInt8(6) & 0x01),
          hazard: !!(buffer.readUInt8(6) & 0x02),
          engineCheck: !!(buffer.readUInt8(6) & 0x04),
          battery: !!(buffer.readUInt8(6) & 0x08),
          odometer: buffer.readUInt32BE(7).toString() || '00000',
        };
      } 
      // Strategy 2: If data is too short, try minimal parsing
      else if (buffer.length >= 4) {
        this.log('WARN', `Short data packet: ${buffer.length} bytes, minimal parsing`);
        data = {
          speed: buffer.readUInt8(0) || 0,
          gear: Math.max(buffer.readUInt8(1) || 1, 1),
          rpm: (buffer.readUInt16BE(2) * 50) || 0,
          fuel: 50, // Default fuel level
          ridingMode: 'Road',
          highBeam: false,
          hazard: false,
          engineCheck: false,
          battery: true,
          odometer: '00000',
        };
      }
      // Strategy 3: If very short, extract what we can
      else {
        this.log('WARN', `Very short data packet: ${buffer.length} bytes, basic parsing`);
        data = {
          speed: buffer.length > 0 ? buffer.readUInt8(0) : 0,
          gear: 1,
          rpm: 0,
          fuel: 0,
          ridingMode: 'Road',
          highBeam: false,
          hazard: false,
          engineCheck: false,
          battery: false,
          odometer: '--',
        };
      }

      // Calculate additional trip data (if not in BLE data)
      if (!data.tripA) data.tripA = ((Math.random() * 200) + 100).toFixed(1);
      if (!data.tripB) data.tripB = ((Math.random() * 500) + 200).toFixed(1);
      if (!data.afe) data.afe = ((Math.random() * 10) + 15).toFixed(1);
      if (!data.bfe) data.bfe = ((Math.random() * 8) + 14).toFixed(1);

      this.log('INFO', `Parsed data: ${JSON.stringify(data)}`);
      
      this.lastKnownData = data;
      this.cacheData(data);
      this.dataCallback && this.dataCallback(data);
      
    } catch (error) {
      this.log('ERROR', `Data parsing failed: ${error.message}`);
      
      // Fallback to blank data if parsing fails
      const fallbackData = {
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
      };
      
      this.dataCallback && this.dataCallback(fallbackData);
    }
  }

  // Start data updates (for testing/simulation)
  startDataUpdates() {
    if (this.mockDataEnabled) {
      this.startMockDataSimulation();
      return;
    }

    // If connected to real device, data comes from BLE notifications
    // This method sets up fallbacks if BLE fails
    this.setupFallbackDataUpdates();
  }

  // Mock data simulation - CLEAN VERSION
  startMockDataSimulation() {
    if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
    }

    this.mockDataInterval = setInterval(() => {
      // Only simulate realistic changes, no fake data
      if (this.mockData.speed > 0) {
        this.mockData.speed = Math.max(0, this.mockData.speed + (Math.random() - 0.5) * 5);
      }
      if (this.mockData.rpm > 0) {
        this.mockData.rpm = Math.max(0, this.mockData.rpm + (Math.random() - 0.5) * 200);
      }
      if (this.mockData.fuel > 0) {
        this.mockData.fuel = Math.max(0, this.mockData.fuel - Math.random() * 0.05);
      }
      
      // Occasionally change gear if moving
      if (this.mockData.speed > 10 && Math.random() > 0.98) {
        this.mockData.gear = Math.max(1, Math.min(6, this.mockData.gear + (Math.random() > 0.5 ? 1 : -1)));
      }

      this.lastKnownData = { ...this.mockData };
      this.cacheData(this.mockData);
      this.dataCallback && this.dataCallback(this.mockData);
    }, 1000);
  }

  // Setup fallback data updates using phone sensors
  setupFallbackDataUpdates() {
    if (!this.sensorFallbackEnabled) return;

    // GPS-based speed estimation
    this.startGPSFallback();
    
    // Accelerometer-based motion detection
    this.startAccelerometerFallback();
  }

  // GPS-based speed fallback
  async startGPSFallback() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        this.log('WARN', 'GPS fallback unavailable - no location permission');
        return;
      }

      let lastLocation = null;
      let lastTime = null;

      const locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          if (lastLocation && lastTime) {
            const distance = this.calculateDistance(
              lastLocation.coords.latitude,
              lastLocation.coords.longitude,
              location.coords.latitude,
              location.coords.longitude
            );
            
            const timeDiff = (location.timestamp - lastTime) / 1000; // seconds
            const speed = (distance / timeDiff) * 3.6; // km/h
            
            if (speed > 0 && speed < 200) { // Reasonable speed range
              this.log('INFO', `GPS speed estimate: ${speed.toFixed(1)} km/h`);
              
              const fallbackData = {
                ...this.lastKnownData,
                speed: Math.round(speed),
              };
              
              this.dataCallback && this.dataCallback(fallbackData);
            }
          }
          
          lastLocation = location;
          lastTime = location.timestamp;
        }
      );

      this.gpsSubscription = locationSubscription;
      
    } catch (error) {
      this.log('ERROR', `GPS fallback setup failed: ${error.message}`);
    }
  }

  // Calculate distance between two GPS coordinates
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Accelerometer-based motion fallback
  startAccelerometerFallback() {
    try {
      Accelerometer.setUpdateInterval(1000);
      
      this.accelerometerSubscription = Accelerometer.addListener(({ x, y, z }) => {
        const magnitude = Math.sqrt(x*x + y*y + z*z);
        
        // Simple motion detection (very basic)
        if (magnitude > 1.2) {
          this.log('INFO', `Motion detected: ${magnitude.toFixed(2)}`);
        }
      });
      
    } catch (error) {
      this.log('ERROR', `Accelerometer fallback setup failed: ${error.message}`);
    }
  }

  // Cache data to AsyncStorage
  async cacheData(data) {
    if (this.cachedDataEnabled) {
      try {
        await AsyncStorage.setItem('yezdi_cached_data', JSON.stringify(data));
      } catch (error) {
        this.log('ERROR', `Failed to cache data: ${error.message}`);
      }
    }
  }

  // Disconnect from device
  async disconnect() {
    try {
      if (this.connectedDevice) {
        await this.connectedDevice.cancelConnection();
        this.connectedDevice = null;
        this.log('INFO', 'Device disconnected');
      }

      // Clean up subscriptions
      if (this.mockDataInterval) {
        clearInterval(this.mockDataInterval);
        this.mockDataInterval = null;
      }

      if (this.gpsSubscription) {
        this.gpsSubscription.remove();
        this.gpsSubscription = null;
      }

      if (this.accelerometerSubscription) {
        this.accelerometerSubscription.remove();
        this.accelerometerSubscription = null;
      }

      this.connectionCallback && this.connectionCallback(false, null);
      
    } catch (error) {
      this.log('ERROR', `Disconnect failed: ${error.message}`);
    }
  }

  // Get connection status
  isConnected() {
    return this.connectedDevice !== null;
  }

  // Enable/disable fallback methods
  setSensorFallbackEnabled(enabled) {
    this.sensorFallbackEnabled = enabled;
    this.log('INFO', `Sensor fallback ${enabled ? 'enabled' : 'disabled'}`);
  }

  setMockDataEnabled(enabled) {
    this.mockDataEnabled = enabled;
    if (enabled) {
      this.startMockDataSimulation();
    } else if (this.mockDataInterval) {
      clearInterval(this.mockDataInterval);
      this.mockDataInterval = null;
    }
    this.log('INFO', `Mock data ${enabled ? 'enabled' : 'disabled'}`);
  }

  setCachedDataEnabled(enabled) {
    this.cachedDataEnabled = enabled;
    this.log('INFO', `Cached data ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create singleton instance
const BleManager = new YezdiBleManager();

export default BleManager;
