import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const watchId = useRef<number | null>(null);
  const fileUri = FileSystem.documentDirectory + 'geolocations.txt';

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      return true;
    }
    if (Platform.Version < 23) {
      return true;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Izin Lokasi',
        message: 'Aplikasi butuh akses lokasi Anda untuk menyimpan geolokasi.',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const prepareFile = async () => {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      const header = 'timestamp,latitude,longitude,accuracy\n';
      await FileSystem.writeAsStringAsync(fileUri, header, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    }
  };

  const startWatching = async () => {
    const ok = await requestLocationPermission();
    if (!ok) {
      Alert.alert('Permission lokasi ditolak');
      return;
    }

    await prepareFile();

    watchId.current = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const ts = new Date(position.timestamp).toISOString();
        const line = `${ts},${latitude},${longitude},${accuracy}\n`;

        try {
          await FileSystem.writeAsStringAsync(fileUri, line, {
            encoding: FileSystem.EncodingType.UTF8,
            append: true,
          });
          console.log('Tersimpan:', line.trim());
        } catch (err) {
          console.error('Gagal append file:', err);
        }
      },
      (error) => {
        console.error('Watch error:', error.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 50,     
        interval: 10000,        
        fastestInterval: 5000,  
      }
    );
  };

  useEffect(() => {
    startWatching();
    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Week 9: Geolocation Logger</Text>
      <Text style={styles.subtitle}>
        Semua koordinat akan di-append ke:
      </Text>
      <Text style={styles.path}>
        {fileUri.replace(FileSystem.documentDirectory, '/Documents/')}
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  path: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'center',
  },
});
