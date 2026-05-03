import * as Location from 'expo-location';
import { useState, useCallback } from 'react';

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface UseDeviceLocationOptions {
  /**
   * The accuracy level for the location request.
   * @default LocationAccuracy.Balanced
   */
  accuracy?: Location.LocationAccuracy;
}

interface UseDeviceLocationReturn {
  location: DeviceLocation | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<DeviceLocation | null>;
}

const DEFAULT_OPTIONS: Required<UseDeviceLocationOptions> = {
  accuracy: Location.LocationAccuracy.Balanced,
};

export function useDeviceLocation(
  options: UseDeviceLocationOptions = {}
): UseDeviceLocationReturn {
  const { accuracy = DEFAULT_OPTIONS.accuracy } = options;

  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<DeviceLocation | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Request permission if not already granted
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        const errorMsg = 'Location permission denied';
        setError(errorMsg);
        setIsLoading(false);
        return null;
      }

      // Get current position (one-time read)
      const geoLocation = await Location.getCurrentPositionAsync({ accuracy });

      const { latitude, longitude, accuracy: locAccuracy } = geoLocation.coords;
      const timestamp = geoLocation.timestamp ?? Date.now();

      setLocation({
        latitude,
        longitude,
        accuracy: locAccuracy ?? 0,
        timestamp,
      });

      setIsLoading(false);
      return { latitude, longitude, accuracy: locAccuracy ?? 0, timestamp };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMsg);
      setIsLoading(false);
      return null;
    }
  }, [accuracy]);

  return {
    location,
    isLoading,
    error,
    requestLocation,
  };
}
