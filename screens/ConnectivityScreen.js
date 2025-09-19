import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BleManager from '../utils/BleManager';

const ConnectivityScreen = () => {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeBluetooth();
    
    // Set up connection callback
    BleManager.setConnectionCallback((isConnected, device) => {
      setConnected(isConnected);
      setConnectedDevice(device);
      setConnectionStatus(isConnected ? 'Connected' : 'Disconnected');
    });

    return () => {
      BleManager.stopScanning();
    };
  }, []);

  const initializeBluetooth = async () => {
    try {
      await BleManager.initialize();
      startScan();
    } catch (error) {
      console.error('Bluetooth initialization error:', error);
      Alert.alert('Bluetooth Error', 'Failed to initialize Bluetooth. Please check permissions.');
    }
  };

  const startScan = async () => {
    setScanning(true);
    setDevices([]);
    
    try {
      await BleManager.startScanning((device) => {
        setDevices(prevDevices => {
          const existingDevice = prevDevices.find(d => d.id === device.id);
          if (!existingDevice) {
            return [...prevDevices, device];
          }
          return prevDevices;
        });
      });
      
      setTimeout(() => {
        setScanning(false);
        BleManager.stopScanning();
      }, 10000);
      
    } catch (error) {
      console.error('Scanning error:', error);
      setScanning(false);
      Alert.alert('Scan Error', 'Failed to scan for devices. Please try again.');
    }
  };

  const connectToDevice = async (device) => {
    try {
      Alert.alert(
        'Connect to Device',
        `Connect to ${device.name || device.id}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Connect',
            onPress: async () => {
              try {
                await BleManager.connectToDevice(device);
                Alert.alert('Success', 'Connected to device successfully!');
              } catch (error) {
                console.error('Connection error:', error);
                Alert.alert('Connection Failed', error.message || 'Failed to connect to device');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Connect error:', error);
      Alert.alert('Error', 'Failed to initiate connection');
    }
  };

  const disconnectDevice = async () => {
    try {
      await BleManager.disconnect();
      Alert.alert('Disconnected', 'Device disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
      Alert.alert('Error', 'Failed to disconnect device');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await startScan();
    setRefreshing(false);
  };

  const getSignalStrength = (rssi) => {
    if (rssi > -50) return 'Excellent';
    if (rssi > -60) return 'Good';
    if (rssi > -70) return 'Fair';
    return 'Poor';
  };

  const getSignalIcon = (rssi) => {
    if (rssi > -50) return 'wifi';
    if (rssi > -60) return 'wifi-outline';
    if (rssi > -70) return 'cellular';
    return 'cellular-outline';
  };

  const isYezdiDevice = (device) => {
    const name = device.name?.toLowerCase() || '';
    return name.includes('yezdi') || name.includes('adventure') || name.includes('bike');
  };

  const renderDevice = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.deviceItem,
        isYezdiDevice(item) && styles.yezdiDevice,
        connectedDevice?.id === item.id && styles.connectedDevice
      ]}
      onPress={() => connectToDevice(item)}
    >
      <View style={styles.deviceInfo}>
        <View style={styles.deviceHeader}>
          <Text style={[
            styles.deviceName,
            isYezdiDevice(item) && styles.yezdiDeviceName
          ]}>
            {item.name || 'Unknown Device'}
          </Text>
          {isYezdiDevice(item) && (
            <View style={styles.yezdiBadge}>
              <Text style={styles.yezdiBadgeText}>YEZDI</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.deviceId}>{item.id}</Text>
        
        <View style={styles.deviceDetails}>
          <View style={styles.signalInfo}>
            <Ionicons 
              name={getSignalIcon(item.rssi)} 
              size={16} 
              color="#00FFFF" 
            />
            <Text style={styles.signalText}>
              {item.rssi} dBm ({getSignalStrength(item.rssi)})
            </Text>
          </View>
          
          {connectedDevice?.id === item.id && (
            <View style={styles.connectedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#00FF00" />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          )}
        </View>
      </View>
      
      <Ionicons 
        name="chevron-forward" 
        size={20} 
        color="#666666" 
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.statusHeader}>
        <View style={styles.statusInfo}>
          <Ionicons 
            name={connected ? "bluetooth" : "bluetooth-outline"} 
            size={24} 
            color={connected ? "#00FF00" : "#FF4444"} 
          />
          <Text style={[
            styles.statusText,
            { color: connected ? "#00FF00" : "#FF4444" }
          ]}>
            {connectionStatus}
          </Text>
        </View>
        
        {connected && connectedDevice && (
          <TouchableOpacity 
            style={styles.disconnectButton}
            onPress={disconnectDevice}
          >
            <Text style={styles.disconnectButtonText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>

      {connected && connectedDevice && (
        <View style={styles.connectedDeviceInfo}>
          <Text style={styles.connectedDeviceTitle}>Connected Device:</Text>
          <Text style={styles.connectedDeviceName}>
            {connectedDevice.name || 'Unknown Device'}
          </Text>
          <Text style={styles.connectedDeviceId}>{connectedDevice.id}</Text>
        </View>
      )}

      <View style={styles.scanControls}>
        <TouchableOpacity 
          style={[styles.scanButton, scanning && styles.scanButtonDisabled]}
          onPress={startScan}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="search" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.scanButtonText}>
            {scanning ? 'Scanning...' : 'Scan for Devices'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        style={styles.deviceList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00FFFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Ionicons name="bluetooth-outline" size={48} color="#666666" />
            <Text style={styles.emptyListText}>
              {scanning ? 'Scanning for devices...' : 'No devices found'}
            </Text>
            <Text style={styles.emptyListSubtext}>
              {scanning ? 'Please wait...' : 'Pull to refresh or tap scan to search again'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <View style={styles.helpSection}>
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={() => Alert.alert(
            'Connection Help',
            'Tips for connecting to your Yezdi Adventure:\n\n' +
            '1. Ensure your bike is turned on\n' +
            '2. Enable Bluetooth on your phone\n' +
            '3. Make sure you are within 10 meters of the bike\n' +
            '4. Look for devices with "YEZDI" in the name\n' +
            '5. If connection fails, try scanning again\n\n' +
            'For advanced troubleshooting, enable Debug Mode in Settings.'
          )}
        >
          <Ionicons name="help-circle-outline" size={20} color="#00FFFF" />
          <Text style={styles.helpButtonText}>Connection Help</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333333' },
  statusInfo: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  disconnectButton: { backgroundColor: '#FF4444', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  disconnectButtonText: { color: '#FFFFFF', fontWeight: '500' },
  connectedDeviceInfo: { backgroundColor: 'rgba(0, 255, 0, 0.1)', padding: 15, marginHorizontal: 20, marginVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#00FF00' },
  connectedDeviceTitle: { color: '#00FF00', fontSize: 14, fontWeight: '500', marginBottom: 5 },
  connectedDeviceName: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  connectedDeviceId: { color: '#CCCCCC', fontSize: 12, marginTop: 2 },
  scanControls: { padding: 20 },
  scanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00FFFF', padding: 15, borderRadius: 10 },
  scanButtonDisabled: { backgroundColor: '#666666' },
  scanButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  deviceList: { flex: 1, paddingHorizontal: 20 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#333333' },
  yezdiDevice: { borderColor: '#00FFFF', backgroundColor: 'rgba(0, 255, 255, 0.05)' },
  connectedDevice: { borderColor: '#00FF00', backgroundColor: 'rgba(0, 255, 0, 0.05)' },
  deviceInfo: { flex: 1 },
  deviceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  deviceName: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', flex: 1 },
  yezdiDeviceName: { color: '#00FFFF', fontWeight: 'bold' },
  yezdiBadge: { backgroundColor: '#00FFFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  yezdiBadgeText: { color: '#000000', fontSize: 10, fontWeight: 'bold' },
  deviceId: { color: '#CCCCCC', fontSize: 12, marginBottom: 8 },
  deviceDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  signalInfo: { flexDirection: 'row', alignItems: 'center' },
  signalText: { color: '#CCCCCC', fontSize: 12, marginLeft: 5 },
  connectedBadge: { flexDirection: 'row', alignItems: 'center' },
  connectedText: { color: '#00FF00', fontSize: 12, marginLeft: 5, fontWeight: '500' },
  separator: { height: 10 },
  emptyList: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyListText: { color: '#FFFFFF', fontSize: 18, fontWeight: '500', marginTop: 15, textAlign: 'center' },
  emptyListSubtext: { color: '#CCCCCC', fontSize: 14, marginTop: 8, textAlign: 'center' },
  helpSection: { padding: 20, borderTopWidth: 1, borderTopColor: '#333333' },
  helpButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: '#00FFFF', borderRadius: 8, backgroundColor: 'rgba(0, 255, 255, 0.05)' },
  helpButtonText: { color: '#00FFFF', fontSize: 14, fontWeight: '500', marginLeft: 8 },
});

export default ConnectivityScreen;
