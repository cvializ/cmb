import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';
import { THREE } from 'expo-three';
import { useState, useCallback, useEffect } from 'react';

export interface DeviceOrientation {
  alpha: number;
  beta: number;
  gamma: number;
  quaternion: THREE.Quaternion;
}

interface UseDeviceOrientationOptions {
  enable?: boolean;
}

interface UseDeviceOrientationReturn {
  orientation: DeviceOrientation | null;
  isListening: boolean;
  requestPermission: () => Promise<boolean>;
}

const DEFAULT_OPTIONS: Required<UseDeviceOrientationOptions> = {
  enable: true,
};

export function useDeviceOrientation(
  options: UseDeviceOrientationOptions = {}
): UseDeviceOrientationReturn {
  const {
    enable = DEFAULT_OPTIONS.enable,
  } = options;

  const [orientation, setOrientation] = useState<DeviceOrientation | null>(null);
  const [isListening, setIsListening] = useState(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Request device motion permissions
      const permission = await DeviceMotion.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        console.warn('Device motion permission not granted');
        setIsListening(false);
        return false;
      }
      
      const available = await DeviceMotion.isAvailableAsync();
      if (!available) {
        console.warn('Device motion is not available');
        setIsListening(false);
        return false;
      }
      
      setIsListening(true);
      return true;
    } catch (error) {
      console.error('Error requesting device motion permission:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enable) {
      return;
    }

    setIsListening(true);

    const subscription = DeviceMotion.addListener((event: DeviceMotionMeasurement) => {
      const { alpha, beta, gamma } = event.rotation;
      const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(beta, gamma, alpha, 'ZXY'))

      setOrientation({
        alpha,
        beta,
        gamma,
        quaternion,
      });
    });

    return () => {
      subscription.remove();
    };
  }, [enable]);

  return {
    orientation,
    isListening,
    requestPermission,
  };
}
