import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { THREE, Renderer, loadAsync } from 'expo-three';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';

import { DeviceOrientation, useDeviceOrientation } from './useDeviceOrientation';
import { styles } from './styles';

const PORTRAIT_CORRECTION_QUATERNION = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

export default function Planetarium() {
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  const [deviceControlEnabled, setDeviceControlEnabled] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
  const orientationRef = useRef<DeviceOrientation | null>(null);
  const deviceControlEnabledRef = useRef(false);

  let timeout: number;

  const { orientation, requestPermission, isListening } = useDeviceOrientation({
    enable: deviceControlEnabled,
  });

  orientationRef.current = orientation;
  deviceControlEnabledRef.current = deviceControlEnabled;

  useEffect(() => {
    return () => clearTimeout(timeout);
  }, []);

  const handlePermissionRequest = async () => {
    const granted = await requestPermission();
    setPermissionGranted(granted);
  };

  const handleReset = () => {
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

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(sceneColor, 1, 10000);
    scene.add(new THREE.GridHelper(10, 10));

    const axesHelper = new THREE.AxesHelper( 1 );
    scene.add( axesHelper );

    const ambientLight = new THREE.AmbientLight(0xFFFFFF, .5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 10, 1000, 1);
    pointLight.position.set(0, 100, 100);
    scene.add(pointLight);

    const spotLight = new THREE.SpotLight(0xffffff, 10);
    spotLight.position.set(0, 10, 10);
    spotLight.lookAt(scene.position);
    scene.add(spotLight);

    const texture = await loadAsync(require('./sphere.png'));
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(5, 64, 64),
      new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.BackSide,
        roughness: 0.5,
        metalness: 0.1,
      })
    );
    scene.add(sphere);

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000);
    camera.position.set(0, 0, 0);

    camera.lookAt(0, 0, 0);
    setCamera(camera);

    const update = () => {
      const deviceControlEnabled = deviceControlEnabledRef.current;
      if (!deviceControlEnabled) {
        return;
      }

      const orientation = orientationRef.current;
      if (!orientation) {
        return;
      }

      camera.quaternion.copy(orientation.quaternion.premultiply(PORTRAIT_CORRECTION_QUATERNION));
    };

    const render = () => {
      timeout = requestAnimationFrame(render);
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
              setDeviceControlEnabled(value);
            }}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
          />
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
            {orientation && (
              <>
                <Text style={styles.debugText}>Alpha (Z): {THREE.MathUtils.radToDeg(orientation.alpha).toFixed(2)}°</Text>
                <Text style={styles.debugText}>Beta  (X): {THREE.MathUtils.radToDeg(orientation.beta).toFixed(2)}°</Text>
                <Text style={styles.debugText}>Gamma (Y): {THREE.MathUtils.radToDeg(orientation.gamma).toFixed(2)}°</Text>
              </>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={() => setShowDebug(!showDebug)}>
          <Text style={styles.buttonText}>{showDebug ? 'Hide Debug' : 'Show Debug'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}