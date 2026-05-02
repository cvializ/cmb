import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';
import { THREE } from 'expo-three';
import { useState, useCallback, useEffect } from 'react';

export interface DeviceOrientation {
  alpha: number;
  beta: number;
  gamma: number;
}

interface UseDeviceOrientationOptions {
  enable?: boolean;
}

interface UseDeviceOrientationReturn {
  orientation: DeviceOrientation | null;
  deviceNormalQ: THREE.Quaternion | null;
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
  const [deviceNormalQ, setDeviceNormalQ] = useState<THREE.Quaternion | null>(null);
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

      setOrientation({
        alpha,
        beta,
        gamma,
      });

      // Compute device screen normal quaternion from acceleration including gravity.
      // The accelerometer measures the gravity vector in device coordinates.
      // The screen normal points outward from the screen, opposite to gravity.
      if (event.accelerationIncludingGravity) {
        const { x, y, z } = event.accelerationIncludingGravity;

        // Avoid near-zero vectors (e.g., free-fall or invalid data)
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        if (magnitude > 0.1) {
          const gravity = new THREE.Vector3(x, -y, z);
          // Screen normal points opposite to the gravity direction
          const screenNormal = new THREE.Vector3().copy(gravity).normalize();

          // Reference vector: device's default screen normal (+Z axis in device coords)
          const reference = new THREE.Vector3(0, 1, 0);

          // Compute the quaternion that rotates the reference vector to the screen normal
          const normalQuaternion = new THREE.Quaternion().setFromUnitVectors(
            reference,
            screenNormal
          );
          setDeviceNormalQ(normalQuaternion);
        }
      }
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
    deviceNormalQ,
    isListening,
    requestPermission,
  };
}
