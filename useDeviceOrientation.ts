import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';
import { useState, useCallback, useEffect } from 'react';
import { THREE } from 'expo-three';

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
    let subscription: { remove(): void } | null = null;

    const handleMotion = (event: DeviceMotionMeasurement) => {
      if (!enable || !event.rotation) return;

      const { alpha, beta, gamma } = event.rotation;

      // Only update if we have valid rotation data
      if (alpha === null || beta === null || gamma === null) return;

      // Build quaternion from Euler angles (YXZ order: yaw→pitch→roll)
      const euler = new THREE.Euler(beta, gamma, alpha, 'YXZ');
      const quaternion = new THREE.Quaternion().setFromEuler(euler);

      setOrientation({
        alpha,
        beta,
        gamma,
        quaternion,
      });
    };

    if (enable) {
      subscription = DeviceMotion.addListener(handleMotion);
      setIsListening(true);
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [enable]);

  return {
    orientation,
    isListening,
    requestPermission,
  };
}
