import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';

export class LocationPermissionError extends Error {}

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

async function requestAndroidPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
  if (await PermissionsAndroid.check(fine)) {
    return true;
  }
  if (await PermissionsAndroid.check(coarse)) {
    return false;
  }
  const result = await PermissionsAndroid.requestMultiple([coarse, fine]);
  const fineGranted = result[fine] === PermissionsAndroid.RESULTS.GRANTED;
  const coarseGranted = result[coarse] === PermissionsAndroid.RESULTS.GRANTED;
  if (!fineGranted && !coarseGranted) {
    throw new LocationPermissionError('Quyền vị trí chưa được cấp.');
  }
  return fineGranted;
}

export async function captureCurrentLocation(): Promise<CapturedLocation> {
  const highAccuracy = await requestAndroidPermission();
  Geolocation.setRNConfiguration({
    skipPermissionRequests: Platform.OS === 'android',
    authorizationLevel: 'whenInUse',
    locationProvider: 'auto',
  });
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      reject,
      { enableHighAccuracy: highAccuracy, maximumAge: 0, timeout: 15000 },
    );
  });
}
