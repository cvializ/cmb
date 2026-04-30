import { Magnetometer, MagnetometerMeasurement } from 'expo-sensors';
import { useState, useCallback, useEffect } from 'react';

export interface DeviceCompass {
  heading: number; // Compass heading in degrees (0-360)
}

interface UseCompassOptions {
  enable?: boolean;
  sensitivity?: number;
  deadzone?: number;
}

interface UseCompassReturn {
  compass: DeviceCompass | null;
  isListening: boolean;
  requestPermission: () => Promise<boolean>;
  resetCompass: () => void;
}

const DEFAULT_OPTIONS: Required<UseCompassOptions> = {
  enable: true,
  sensitivity: 1.0,
  deadzone: 2.0,
};

/**
 * Calculate compass heading from magnetometer readings.
 * Uses atan2(y, x) to get the angle in radians relative to magnetic North (X-axis).
 * Converts to degrees and normalizes to 0–360 range.
 */
const calculateHeading = (x: number, y: number): number => {
  const headingRad = Math.atan2(y, x); // radians relative to X-axis (magnetic North)
  let degrees = headingRad * (180 / Math.PI); // convert to degrees
  let normalized = (degrees + 360) % 360;
  return normalized;
};

export function useCompass(
  options: UseCompassOptions = {}
): UseCompassReturn {
  const {
    enable = DEFAULT_OPTIONS.enable,
    sensitivity = DEFAULT_OPTIONS.sensitivity,
    deadzone = DEFAULT_OPTIONS.deadzone,
  } = options;

  const [compass, setCompass] = useState<DeviceCompass | null>(null);
  const [isListening, setIsListening] = useState(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Request magnetometer permissions
      const permission = await Magnetometer.requestPermissionsAsync();

      if (permission.status !== 'granted') {
        console.warn('Magnetometer permission not granted');
        setIsListening(false);
        return false;
      }

      const available = await Magnetometer.isAvailableAsync();
      if (!available) {
        console.warn('Magnetometer is not available');
        setIsListening(false);
        return false;
      }

      setIsListening(true);
      return true;
    } catch (error) {
      console.error('Error requesting magnetometer permission:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    let subscription: { remove(): void } | null = null;

    const handleMagnetometer = (event: MagnetometerMeasurement) => {
      if (!enable) return;

      const { x, y } = event;

      // Only update if we have valid readings
      if (x === null || y === null) return;

      // Apply deadzone
      const applyDeadzone = (value: number) => {
        if (Math.abs(value) < deadzone) {
          return 0;
        }
        return value;
      };

      const filteredX = applyDeadzone(x);
      const filteredY = applyDeadzone(y);

      // Calculate compass heading
      const heading = calculateHeading(filteredX, filteredY);

      setCompass({ heading });
    };

    if (enable) {
      subscription = Magnetometer.addListener(handleMagnetometer);
      setIsListening(true);
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [enable, sensitivity, deadzone]);

  const resetCompass = useCallback(() => {
    setCompass(null);
  }, []);

  return {
    compass,
    isListening,
    requestPermission,
    resetCompass,
  };
}