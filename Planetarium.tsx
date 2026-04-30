import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { THREE, Renderer, loadAsync } from 'expo-three';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch } from 'react-native';

import { DeviceOrientation, useDeviceOrientation } from './useDeviceOrientation';
import { DeviceCompass, useCompass } from './useCompass';


const radianToDegree = (radian: number) => radian * 180 / Math.PI;

export default function Planetarium() {
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  const [deviceControlEnabled, setDeviceControlEnabled] = useState(false);
  // const [sensitivity, setSensitivity] = useState(1.0);
  const sensitivity = 1;
  const [showDebug, setShowDebug] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
  const [compass, setCompass] = useState<DeviceCompass | null>(null);
  const orientationRef = useRef<DeviceOrientation|null>(null);
  const compassDataRef = useRef<DeviceCompass|null>(null);
  const deviceControlEnabledRef = useRef(false);

  let timeout: number;

  const { orientation, requestPermission, resetOrientation, isListening } = useDeviceOrientation({
    enable: deviceControlEnabled,
    sensitivity,
    deadzone: 2.0,
  });

  const { compass: compassData, requestPermission: requestCompassPermission, isListening: compassListening } = useCompass({
    enable: deviceControlEnabled,
  });

  orientationRef.current = orientation;
  compassDataRef.current = compassData;
  deviceControlEnabledRef.current = deviceControlEnabled;
  console.log('NEW ORIENTATION', orientation);

  useEffect(() => {
    return () => clearTimeout(timeout);
  }, []);

  const handlePermissionRequest = async () => {
    const motionGranted = await requestPermission();
    const compassGranted = await requestCompassPermission();
    const granted = motionGranted && compassGranted;
    setPermissionGranted(granted);
  };

  const handleReset = () => {
    resetOrientation();
    if (camera) {
      camera.rotation.set(0, 0, 0);
    }
  };

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const sceneColor = 0x6ad6f0;

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(sceneColor);

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000);
    camera.position.set(0, 0, 0);
    setCamera(camera);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(sceneColor, 1, 10000);
    scene.add(new THREE.GridHelper(10, 10));

    // X-axis arrow (Red)
    const xAxis = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      2.5,
      0xff0000,
      0.5,
      0.3
    );
    scene.add(xAxis);

    // Y-axis arrow (Green)
    const yAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      2.5,
      0x00ff00,
      0.5,
      0.3
    );
    scene.add(yAxis);

    // Z-axis arrow (Blue)
    const zAxis = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      2.5,
      0x0000ff,
      0.5,
      0.3
    );
    scene.add(zAxis);

    const texture = await loadAsync(require('./sphere.png'));

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, .5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 10, 1000, 1);
    pointLight.position.set(0, 100, 100);
    scene.add(pointLight);

    const spotLight = new THREE.SpotLight(0xffffff, 10);
    spotLight.position.set(0, 10, 10);
    spotLight.lookAt(scene.position);
    scene.add(spotLight);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 64, 64),
      new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.BackSide,
        roughness: 0.5,
        metalness: 0.1,
      })
    );
    scene.add(sphere);

    const update = () => {
      const orientation = orientationRef.current;
      const compassData = compassDataRef.current;

      console.log('UPDATE', orientation);
      if (orientation && deviceControlEnabledRef.current) {
        // Orientation data is already in radians from DeviceMotion sensor
        const alphaRad = orientation.alpha;  // Z-axis rotation (radians)
        const betaRad = orientation.beta;    // X-axis rotation (radians, pitch)
        const gammaRad = orientation.gamma;  // Y-axis rotation (radians, roll)

        // Compass heading is in degrees from magnetometer
        let yawRad: number;
        if (compassData && compassData.heading !== undefined) {
          yawRad = THREE.MathUtils.degToRad(compassData.heading);
          console.log(`Using compass heading for yaw: ${compassData.heading}° → ${yawRad.toFixed(4)} rad`);
        } else {
          yawRad = alphaRad;
          console.log(`Using alpha for yaw: ${alphaRad.toFixed(4)} rad`);
        }

        // Build quaternions: Yaw (Y-axis) * Pitch (X-axis) * Roll (Z-axis)
        const quaternionYaw = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0), // Y-axis
          yawRad
        );
        const quaternionPitch = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0), // X-axis
          betaRad
        );
        const quaternionRoll = new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1), // Z-axis
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
        camera.quaternion.copy(finalQuaternion);

        console.log(`Final Quaternion: ${finalQuaternion.x.toFixed(4)}, ${finalQuaternion.y.toFixed(4)}, ${finalQuaternion.z.toFixed(4)}, ${finalQuaternion.w.toFixed(4)}`);
      }
    };

    const render = () => {
      timeout = requestAnimationFrame(render);
      console.log('UPDATEEE');
      update();
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={styles.container}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />

      <View style={styles.controls}>
        <Text style={styles.title}>Planetarium Controls</Text>

        <View style={styles.controlRow}>
          <Text style={styles.label}>Device Control</Text>
          <Switch
            value={deviceControlEnabled}
            onValueChange={(value) => {
              if (value) {
                handlePermissionRequest();
              }
              console.log('WOWOWWOOW', value);
              setDeviceControlEnabled(value);
            }}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
          />
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.label}>Sensitivity: {sensitivity.toFixed(1)}x</Text>
        </View>

        {!permissionGranted && deviceControlEnabled && (
          <TouchableOpacity style={styles.button} onPress={handlePermissionRequest}>
            <Text style={styles.buttonText}>Request Permission</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={handleReset}>
          <Text style={styles.buttonText}>Reset Camera</Text>
        </TouchableOpacity>

        {showDebug && (
          <View style={styles.debugPanel}>
            <Text style={styles.debugTitle}>Debug Info</Text>
            <Text style={styles.debugText}>Device Control: {deviceControlEnabled ? 'ON' : 'OFF'}</Text>
            <Text style={styles.debugText}>Listening: {isListening ? 'YES' : 'NO'}</Text>
            <Text style={styles.debugText}>Compass: {compassListening ? 'YES' : 'NO'}</Text>
            {orientation && (
              <>
                <Text style={styles.debugText}>Alpha (Z): {radianToDegree(orientation.alpha)}°</Text>
                <Text style={styles.debugText}>Beta (X): {radianToDegree(orientation.beta)}°</Text>
                <Text style={styles.debugText}>Gamma (Y): {radianToDegree(orientation.gamma)}°</Text>
              </>
            )}
            {compassData && (
              <>
                <Text style={styles.debugText}>Compass Heading: {compassData.heading.toFixed(1)}°</Text>
              </>
            )}
            {!orientation && !compass && <Text style={styles.debugText}>No sensor data</Text>}
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={() => setShowDebug(!showDebug)}>
          <Text style={styles.buttonText}>{showDebug ? 'Hide Debug' : 'Show Debug'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  glView: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
    width: 280,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    marginRight: 12,
    minWidth: 100,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  debugPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  debugTitle: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
  },
});
