import AsyncStorage from '@react-native-async-storage/async-storage';

class YezdiStorageManager {
  constructor() {
    this.keys = {
      CACHED_DATA: 'yezdi_cached_data',
      SETTINGS: 'yezdi_settings',
      CUSTOM_BLE: 'yezdi_custom_ble',
      DISCOVERED_SERVICES: 'yezdi_discovered_services',
      DEBUG_LOGS: 'yezdi_debug_logs',
      USER_PREFERENCES: 'yezdi_user_preferences',
      NAVIGATION_SETTINGS: 'navigationSettings',
    };
  }

  // Generic storage methods
  async setItem(key, value) {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (error) {
      console.error(`Storage setItem error for key ${key}:`, error);
      return false;
    }
  }

  async getItem(key, defaultValue = null) {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : defaultValue;
    } catch (error) {
      console.error(`Storage getItem error for key ${key}:`, error);
      return defaultValue;
    }
  }

  async removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Storage removeItem error for key ${key}:`, error);
      return false;
    }
  }

  // Specific data management methods
  async saveCachedData(data) {
    return await this.setItem(this.keys.CACHED_DATA, {
      ...data,
      timestamp: Date.now(),
    });
  }

  async getCachedData() {
    const data = await this.getItem(this.keys.CACHED_DATA);
    if (data && data.timestamp) {
      // Check if data is not too old (1 hour)
      const isRecent = (Date.now() - data.timestamp) < (60 * 60 * 1000);
      if (isRecent) {
        return data;
      }
    }
    return null;
  }

  async saveSettings(settings) {
    return await this.setItem(this.keys.SETTINGS, settings);
  }

  async getSettings(defaultSettings = {}) {
    return await this.getItem(this.keys.SETTINGS, defaultSettings);
  }

  async saveCustomBLESettings(settings) {
    return await this.setItem(this.keys.CUSTOM_BLE, settings);
  }

  async getCustomBLESettings() {
    return await this.getItem(this.keys.CUSTOM_BLE, {
      serviceUUID: '',
      charUUID: '',
      authKey: 'YEZDI_AUTH_DEFAULT',
    });
  }

  async saveNavigationSettings(settings) {
    return await this.setItem(this.keys.NAVIGATION_SETTINGS, settings);
  }

  async getNavigationSettings() {
    return await this.getItem(this.keys.NAVIGATION_SETTINGS, {
      mapViewEnabled: false,
      fullNavigationEnabled: false,
      navigationAutoStart: false,
    });
  }

  async saveDiscoveredServices(services) {
    return await this.setItem(this.keys.DISCOVERED_SERVICES, {
      services,
      timestamp: Date.now(),
    });
  }

  async getDiscoveredServices() {
    const data = await this.getItem(this.keys.DISCOVERED_SERVICES);
    return data ? data.services : [];
  }

  async saveDebugLogs(logs) {
    return await this.setItem(this.keys.DEBUG_LOGS, logs);
  }

  async getDebugLogs() {
    return await this.getItem(this.keys.DEBUG_LOGS, []);
  }

  async clearDebugLogs() {
    return await this.removeItem(this.keys.DEBUG_LOGS);
  }

  async saveUserPreferences(preferences) {
    return await this.setItem(this.keys.USER_PREFERENCES, preferences);
  }

  async getUserPreferences() {
    return await this.getItem(this.keys.USER_PREFERENCES, {
      accentColor: '#00FFFF',
      warningBlinkEnabled: true,
      preferredUnits: 'metric',
      dashboardLayout: 'default',
    });
  }

  // Utility methods
  async clearAllData() {
    try {
      const keys = Object.values(this.keys);
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Clear all data error:', error);
      return false;
    }
  }

  async getStorageInfo() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const yezdiKeys = keys.filter(key => key.startsWith('yezdi_') || key === 'navigationSettings');
      
      const data = await AsyncStorage.multiGet(yezdiKeys);
      const totalSize = data.reduce((size, [key, value]) => {
        return size + (value ? value.length : 0);
      }, 0);

      return {
        totalKeys: yezdiKeys.length,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
        keys: yezdiKeys,
      };
    } catch (error) {
      console.error('Get storage info error:', error);
      return null;
    }
  }
}

// Create singleton instance
const StorageManager = new YezdiStorageManager();

export default StorageManager;
