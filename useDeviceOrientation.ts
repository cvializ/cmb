import { DeviceMotion } from 'expo-sensors';
import { useState, useCallback, useEffect } from 'react';

interface DeviceOrientation {
  alpha: number;
  beta: number;
  gamma: number;
}

interface UseDeviceOrientationOptions {
  enable?: boolean;
  sensitivity?: number;
  deadzone?: number;
}

interface UseDeviceOrientationReturn {
  orientation: DeviceOrientation | null;
  isListening: boolean;
  requestPermission: () => Promise<boolean>;
  resetOrientation: () => void;
}

const DEFAULT_OPTIONS: Required<UseDeviceOrientationOptions> = {
  enable: true,
  sensitivity: 1.0,
  deadzone: 2.0,
};

export function useDeviceOrientation(
  options: UseDeviceOrientationOptions = {}
): UseDeviceOrientationReturn {
  const {
    enable = DEFAULT_OPTIONS.enable,
    sensitivity = DEFAULT_OPTIONS.sensitivity,
    deadzone = DEFAULT_OPTIONS.deadzone,
  } = options;

  const [orientation, setOrientation] = useState<DeviceOrientation | null>(null);
  const [isListening, setIsListening] = useState(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      await DeviceMotion.isAvailableAsync();
      setIsListening(true);
      return true;
    } catch (error) {
      console.error('Error checking device motion availability:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    let subscription: { remove(): void } | null = null;

    interface DeviceOrientationEvent {
      rotation: {
        alpha: number;
        beta: number;
        gamma: number;
      };
    }

    const handleMotion = (event: DeviceOrientationEvent) => {
      if (!enable) return;

      const { alpha, beta, gamma } = event.rotation;

      const applyDeadzone = (value: number) => {
        if (Math.abs(value) < deadzone) {
          return 0;
        }
        return value;
      };

      const filteredAlpha = applyDeadzone(alpha);
      const filteredBeta = applyDeadzone(beta);
      const filteredGamma = applyDeadzone(gamma);

      const scaledAlpha = filteredAlpha * sensitivity;
      const scaledBeta = filteredBeta * sensitivity;
      const scaledGamma = filteredGamma * sensitivity;

      setOrientation({
        alpha: scaledAlpha,
        beta: scaledBeta,
        gamma: scaledGamma,
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
  }, [enable, sensitivity, deadzone]);

  const resetOrientation = useCallback(() => {
    setOrientation(null);
  }, []);

  return {
    orientation,
    isListening,
    requestPermission,
    resetOrientation,
  };
}
