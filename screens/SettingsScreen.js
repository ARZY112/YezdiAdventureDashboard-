import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import BleManager from '../utils/BleManager';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen = () => {
  const [settings, setSettings] = useState({
    warningBlinkEnabled: true,
    sensorFallbackEnabled: true,
    mockDataEnabled: false,
    cachedDataEnabled: true,
    manualInputEnabled: false,
    debugMode: false,
    accentColor: '#00FFFF',
    customServiceUUID: '',
    customCharUUID: '',
    authKey: '',
    // Navigation settings
    mapViewEnabled: false,
    fullNavigationEnabled: false,
    navigationAutoStart: false,
  });

  const [debugLogs, setDebugLogs] = useState([]);

  useEffect(() => {
    loadSettings();
    loadDebugLogs();
  }, []);

  const loadSettings = async () => {
    try {
      const keys = Object.keys(settings);
      const values = await AsyncStorage.multiGet(keys);
      const loadedSettings = {};
      
      values.forEach(([key, value]) => {
        if (value !== null) {
          if (key === 'accentColor' || key === 'customServiceUUID' || key === 'customCharUUID' || key === 'authKey') {
            loadedSettings[key] = value;
          } else {
            loadedSettings[key] = JSON.parse(value);
          }
        }
      });

      setSettings(prev => ({ ...prev, ...loadedSettings }));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadDebugLogs = async () => {
    try {
      const logs = await BleManager.getDebugLogs();
      setDebugLogs(logs);
    } catch (error) {
      console.error('Error loading debug logs:', error);
    }
  };

  const saveSetting = async (key, value) => {
    try {
      if (typeof value === 'string') {
        await AsyncStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      }
      
      setSettings(prev => ({ ...prev, [key]: value }));
      
      // Save navigation settings as a group
      if (['mapViewEnabled', 'fullNavigationEnabled', 'navigationAutoStart'].includes(key)) {
        const navSettings = {
          mapViewEnabled: key === 'mapViewEnabled' ? value : settings.mapViewEnabled,
          fullNavigationEnabled: key === 'fullNavigationEnabled' ? value : settings.fullNavigationEnabled,
          navigationAutoStart: key === 'navigationAutoStart' ? value : settings.navigationAutoStart,
        };
        await AsyncStorage.setItem('navigationSettings', JSON.stringify(navSettings));
      }
      
      // Update BLE manager with new settings
      if (key === 'customServiceUUID' || key === 'customCharUUID' || key === 'authKey') {
        BleManager.updateCustomSettings({
          serviceUUID: settings.customServiceUUID,
          charUUID: settings.customCharUUID,
          authKey: settings.authKey,
          [key]: value,
        });
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      Alert.alert('Error', 'Failed to save setting');
    }
  };

  const exportLogs = async () => {
    try {
      const logs = await BleManager.getDebugLogs();
      const logContent = logs.map(log => 
        `${log.timestamp}: [${log.level}] ${log.message}`
      ).join('\n');

      const fileName = `yezdi_ble_logs_${new Date().toISOString().split('T')[0]}.txt`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, logContent);
      
      await Share.share({
        url: fileUri,
        title: 'Yezdi BLE Debug Logs',
      });

      Alert.alert('Success', `Logs exported to ${fileName}`);
    } catch (error) {
      console.error('Error exporting logs:', error);
      Alert.alert('Error', 'Failed to export logs');
    }
  };

  const clearLogs = async () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all debug logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await BleManager.clearDebugLogs();
            setDebugLogs([]);
            Alert.alert('Success', 'Debug logs cleared');
          },
        },
      ]
    );
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const defaultSettings = {
              warningBlinkEnabled: true,
              sensorFallbackEnabled: true,
              mockDataEnabled: false,
              cachedDataEnabled: true,
              manualInputEnabled: false,
              debugMode: false,
              accentColor: '#00FFFF',
              customServiceUUID: '',
              customCharUUID: '',
              authKey: '',
              mapViewEnabled: false,
              fullNavigationEnabled: false,
              navigationAutoStart: false,
            };

            for (const [key, value] of Object.entries(defaultSettings)) {
              await saveSetting(key, value);
            }

            Alert.alert('Success', 'Settings reset to defaults');
          },
        },
      ]
    );
  };

  const validateHexColor = (color) => {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
  };

  const renderToggleSetting = (key, title, description) => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(value) => saveSetting(key, value)}
        trackColor={{ false: '#333333', true: settings.accentColor }}
        thumbColor={settings[key] ? '#FFFFFF' : '#CCCCCC'}
      />
    </View>
  );

  const renderTextSetting = (key, title, placeholder, secure = false) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      <TextInput
        style={[styles.textInput, { borderColor: settings.accentColor }]}
        value={settings[key]}
        onChangeText={(text) => saveSetting(key, text)}
        placeholder={placeholder}
        placeholderTextColor="#666666"
        secureTextEntry={secure}
        autoCapitalize="none"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Dashboard Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: settings.accentColor }]}>
            Dashboard Settings
          </Text>
          
          {renderToggleSetting(
            'warningBlinkEnabled',
            'Speed Warning Blink',
            'Enable dashboard blink effect when speed exceeds 120 km/h'
          )}

          <View style={styles.settingItem}>
            <Text style={styles.settingTitle}>Accent Color</Text>
            <View style={styles.colorInputContainer}>
              <TextInput
                style={[styles.colorInput, { borderColor: settings.accentColor }]}
                value={settings.accentColor}
                onChangeText={(color) => {
                  if (validateHexColor(color) || color === '') {
                    saveSetting('accentColor', color);
                  }
                }}
                placeholder="#00FFFF"
                placeholderTextColor="#666666"
                maxLength={7}
              />
              <View 
                style={[
                  styles.colorPreview, 
                  { backgroundColor: validateHexColor(settings.accentColor) ? settings.accentColor : '#333333' }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Navigation Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: settings.accentColor }]}>
            Navigation Settings
          </Text>
          
          {renderToggleSetting(
            'mapViewEnabled',
            'Map View Only',
            'Show live map with location arrow (no route planning)'
          )}

          {renderToggleSetting(
            'fullNavigationEnabled',
            'Full Navigation',
            'Enable route planning, ETA, and turn-by-turn directions'
          )}

          {renderToggleSetting(
            'navigationAutoStart',
            'Auto-start Navigation',
            'Automatically show map when bike is connected'
          )}
        </View>

        {/* Fallback Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: settings.accentColor }]}>
            Fallback Options
          </Text>
          
          {renderToggleSetting(
            'sensorFallbackEnabled',
            'Phone Sensor Fallback',
            'Use phone GPS and sensors when BLE is disconnected'
          )}

          {renderToggleSetting(
            'cachedDataEnabled',
            'Cached Data Fallback',
            'Display last known values when disconnected'
          )}

          {renderToggleSetting(
            'manualInputEnabled',
            'Manual Input Mode',
            'Allow manual entry of speed and gear data'
          )}

          {renderToggleSetting(
            'mockDataEnabled',
            'Mock Data Mode',
            'Display sample data for testing (overrides real data)'
          )}
        </View>

        {/* Debug Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: settings.accentColor }]}>
            Debug & Advanced
          </Text>
          
          {renderToggleSetting(
            'debugMode',
            'Debug Mode',
            'Enable detailed logging and advanced options'
          )}

          {settings.debugMode && (
            <>
              {renderTextSetting(
                'customServiceUUID',
                'Custom Service UUID',
                'e.g., 12345678-1234-1234-1234-123456789abc'
              )}

              {renderTextSetting(
                'customCharUUID',
                'Custom Characteristic UUID',
                'e.g., 87654321-4321-4321-4321-cba987654321'
              )}

              {renderTextSetting(
                'authKey',
                'Authentication Key',
                'e.g., YEZDI_AUTH_KEY_2025',
                true
              )}

              <View style={styles.debugActions}>
                <TouchableOpacity 
                  style={[styles.debugButton, { borderColor: settings.accentColor }]}
                  onPress={exportLogs}
                >
                  <Ionicons name="download" size={20} color={settings.accentColor} />
                  <Text style={[styles.debugButtonText, { color: settings.accentColor }]}>
                    Export Logs ({debugLogs.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.debugButton, { borderColor: '#FF4444' }]}
                  onPress={clearLogs}
                >
                  <Ionicons name="trash" size={20} color="#FF4444" />
                  <Text style={[styles.debugButtonText, { color: '#FF4444' }]}>
                    Clear Logs
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.logContainer}>
                <Text style={styles.logTitle}>Recent Debug Logs:</Text>
                <ScrollView style={styles.logScroll} nestedScrollEnabled>
                  {debugLogs.slice(-20).map((log, index) => (
                    <Text key={index} style={styles.logEntry}>
                      [{log.level}] {log.message}
                    </Text>
                  ))}
                </ScrollView>
              </View>
            </>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={[styles.actionButton, { borderColor: '#FF4444' }]}
            onPress={resetToDefaults}
          >
            <Ionicons name="refresh" size={24} color="#FF4444" />
            <Text style={[styles.actionButtonText, { color: '#FF4444' }]}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.infoText}>
            Yezdi Adventure Dashboard v1.0.0{'\n'}
            Clean interface with no fake data - only real information displayed.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  textInput: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 8,
    flex: 1,
  },
  colorInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorInput: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 8,
    flex: 1,
    marginRight: 10,
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#333333',
  },
  debugActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 15,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flex: 0.48,
    justifyContent: 'center',
  },
  debugButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  logContainer: {
    marginTop: 15,
  },
  logTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  logScroll: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 10,
    maxHeight: 200,
  },
  logEntry: {
    color: '#CCCCCC',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SettingsScreen;
