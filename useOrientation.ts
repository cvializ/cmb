import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';
import { Magnetometer, MagnetometerMeasurement } from 'expo-sensors';
import { THREE } from 'expo-three';
import { useState, useCallback, useEffect, useRef } from 'react';

interface UseOrientationOptions {
  enable?: boolean;
  sensitivity?: number;
  deadzone?: number;
}

interface UseOrientationReturn {
  orientation: THREE.Quaternion | null;
  isListening: boolean;
  requestPermission: () => Promise<boolean>;
  resetOrientation: () => void;
}

const DEFAULT_OPTIONS: Required<UseOrientationOptions> = {
  enable: true,
  sensitivity: 1.0,
  deadzone: 2.0,
};

export function useOrientation(
  options: UseOrientationOptions = {}
): UseOrientationReturn {
  const {
    enable = DEFAULT_OPTIONS.enable,
    sensitivity = DEFAULT_OPTIONS.sensitivity,
    deadzone = DEFAULT_OPTIONS.deadzone,
  } = options;

  const [orientation, setOrientation] = useState<THREE.Quaternion | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Refs to hold the latest raw sensor data so the effect doesn't need them as deps
  const rotationRef = useRef<{ alpha: number; beta: number; gamma: number } | null>(null);
  const magnetometerRef = useRef<{ x: number; y: number } | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Request device motion permissions
      const motionPermission = await DeviceMotion.requestPermissionsAsync();

      if (motionPermission.status !== 'granted') {
        console.warn('Device motion permission not granted');
        setIsListening(false);
        return false;
      }

      const motionAvailable = await DeviceMotion.isAvailableAsync();
      if (!motionAvailable) {
        console.warn('Device motion is not available');
        setIsListening(false);
        return false;
      }

      // Request magnetometer permissions
      const magnetPermission = await Magnetometer.requestPermissionsAsync();

      if (magnetPermission.status !== 'granted') {
        console.warn('Magnetometer permission not granted');
        setIsListening(false);
        return false;
      }

      const magnetAvailable = await Magnetometer.isAvailableAsync();
      if (!magnetAvailable) {
        console.warn('Magnetometer is not available');
        setIsListening(false);
        return false;
      }

      setIsListening(true);
      return true;
    } catch (error) {
      console.error('Error requesting orientation permission:', error);
      return false;
    }
  }, []);

  const resetOrientation = useCallback(() => {
    setOrientation(null);
    rotationRef.current = null;
    magnetometerRef.current = null;
  }, []);

  useEffect(() => {
    let motionSubscription: { remove(): void } | null = null;
    let magnetSubscription: { remove(): void } | null = null;

    const applyDeadzone = (value: number) => {
      if (Math.abs(value) < deadzone) {
        return 0;
      }
      return value;
    };

    const computeQuaternion = () => {
      const rotation = rotationRef.current;
      const magnetometer = magnetometerRef.current;

      if (!rotation) return null;

      // Compass heading is in degrees from magnetometer — the sole source for yaw.
      const compassHeading = typeof magnetometer?.x === 'number' && typeof magnetometer?.y === 'number'
        ? Math.atan2(magnetometer.y, magnetometer.x) * (180 / Math.PI)
        : 0;

      // Apply deadzone and sensitivity to rotation values
      const betaRad = applyDeadzone(rotation.beta) * sensitivity;    // X-axis (pitch)
      const gammaRad = applyDeadzone(rotation.gamma) * sensitivity;  // Y-axis (roll)

      // Build quaternions: Yaw (Y-axis) * Pitch (X-axis) * Roll (Z-axis).
      const quaternionYaw = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), // Y-axis (yaw)
        THREE.MathUtils.degToRad(compassHeading)
      );
      const quaternionPitch = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0), // X-axis (pitch)
        betaRad
      );
      const quaternionRoll = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1), // Z-axis (roll)
        -gammaRad
      );

      // Combine: Yaw * Pitch * Roll (no chaining — multiply() modifies in place)
      const deviceQuaternion = new THREE.Quaternion().copy(quaternionYaw);
      deviceQuaternion.multiply(quaternionPitch);
      deviceQuaternion.multiply(quaternionRoll);

      // Reference: -90° around X-axis to align device frame with Three.js
      const referenceQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-Math.PI / 2, 0, 0)
      );

      // Final quaternion: device rotation × reference alignment
      const finalQuaternion = new THREE.Quaternion().copy(deviceQuaternion);
      finalQuaternion.multiply(referenceQuaternion);

      return finalQuaternion;
    };

    const handleMotion = (event: DeviceMotionMeasurement) => {
      if (!enable || !event.rotation) return;

      const { alpha, beta, gamma } = event.rotation;

      // Only update if we have valid rotation data
      if (alpha === null || beta === null || gamma === null) return;

      rotationRef.current = { alpha, beta, gamma };

      const q = computeQuaternion();
      if (q) {
        setOrientation(q);
      }
    };

    const handleMagnetometer = (event: MagnetometerMeasurement) => {
      if (!enable) return;

      const { x, y } = event;

      // Only update if we have valid readings
      if (x === null || y === null) return;

      magnetometerRef.current = { x, y };

      const q = computeQuaternion();
      if (q) {
        setOrientation(q);
      }
    };

    if (enable) {
      motionSubscription = DeviceMotion.addListener(handleMotion);
      magnetSubscription = Magnetometer.addListener(handleMagnetometer);
      setIsListening(true);
    }

    return () => {
      if (motionSubscription) {
        motionSubscription.remove();
      }
      if (magnetSubscription) {
        magnetSubscription.remove();
      }
    };
  }, [enable, sensitivity, deadzone]);

  return {
    orientation,
    isListening,
    requestPermission,
    resetOrientation,
  };
}
