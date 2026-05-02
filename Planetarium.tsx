import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { THREE, Renderer, loadAsync } from 'expo-three';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';

import { DeviceOrientation, useDeviceOrientation } from './useDeviceOrientation';
import { getCelestialOrientation } from './astronomy';
import { styles } from './styles';

const PORTRAIT_CORRECTION_QUATERNION = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

const Q_celestial = getCelestialOrientation(39.95, -75.17); // philadelphia

function createDirectionMarker(color: number): THREE.Mesh {
  const geometry = new THREE.ConeGeometry(0.08, 0.25, 4);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.5,
  });
  return new THREE.Mesh(geometry, material);
}

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

    const axesHelper = new THREE.AxesHelper(1);
    scene.add(axesHelper);

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
    sphere.quaternion.premultiply(Q_celestial);

    const camera = new THREE.PerspectiveCamera(120, width / height, 0.01, 1000);
    camera.position.set(0, 0, 0);

    camera.lookAt(0, 0, 0);
    setCamera(camera);

    // --- Compass Ring ---
    const compassGroup = new THREE.Group();

    // Main ring (torus lying flat on XZ plane)
    const ringRadius = 3;
    const tubeRadius = 0.04;
    const ringGeometry = new THREE.TorusGeometry(ringRadius, tubeRadius, 16, 64);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x4488ff,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.6,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2; // Lay flat on XZ plane
    compassGroup.add(ring);

    // Inner decorative ring
    const innerRingGeometry = new THREE.TorusGeometry(ringRadius - 0.15, 0.02, 8, 64);
    const innerRingMaterial = new THREE.MeshStandardMaterial({
      color: 0x88aaff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.2,
      roughness: 0.5,
      metalness: 0.5,
    });
    const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
    innerRing.rotation.x = Math.PI / 2;
    compassGroup.add(innerRing);

    // Cardinal direction tick marks
    const tickGeometry = new THREE.BoxGeometry(0.06, 0.02, 0.15);
    const directions = [
      { angle: 0, color: 0xff4444 },   // +Z (North)
      { angle: Math.PI, color: 0xff4444 }, // -Z (South)
      { angle: Math.PI / 2, color: 0xffffff }, // +X (East)
      { angle: -Math.PI / 2, color: 0xffffff }, // -X (West)
    ];

    directions.forEach((dir) => {
      const tick = new THREE.Mesh(tickGeometry, new THREE.MeshStandardMaterial({
        color: dir.color,
        emissive: dir.color,
        emissiveIntensity: 0.2,
      }));
      tick.position.set(
        Math.sin(dir.angle) * ringRadius,
        0,
        Math.cos(dir.angle) * ringRadius
      );
      tick.rotation.y = -dir.angle;
      compassGroup.add(tick);

      // Direction marker — cone pointing outward from ring center
      const marker = createDirectionMarker(dir.color);
      marker.position.set(
        Math.sin(dir.angle) * (ringRadius + 0.5),
        0,
        Math.cos(dir.angle) * (ringRadius + 0.5)
      );
      // Point outward along the radial direction in XZ plane
      marker.rotation.set(0, -dir.angle + Math.PI / 2, 0);
      compassGroup.add(marker);
    });

    // Degree tick marks around the ring
    for (let i = 0; i < 36; i++) {
      const angle = (i * Math.PI * 2) / 36;
      const isMajor = i % 9 === 0; // N, E, S, W already handled
      if (isMajor) continue;
      const minorTickGeo = new THREE.BoxGeometry(0.03, 0.015, 0.08);
      const minorTickMat = new THREE.MeshStandardMaterial({ color: 0x6688aa, emissive: 0x223355, emissiveIntensity: 0.1 });
      const minorTick = new THREE.Mesh(minorTickGeo, minorTickMat);
      minorTick.position.set(
        Math.sin(angle) * ringRadius,
        0,
        Math.cos(angle) * ringRadius
      );
      minorTick.rotation.y = -angle;
      compassGroup.add(minorTick);
    }
    scene.add(compassGroup);

    const update = () => {
      const deviceControlEnabled = deviceControlEnabledRef.current;
      if (!deviceControlEnabled) {
        return;
      }

      const orientation = orientationRef.current;
      if (!orientation) {
        return;
      }

      camera.quaternion
        .copy(orientation.quaternion)
        .premultiply(PORTRAIT_CORRECTION_QUATERNION);
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