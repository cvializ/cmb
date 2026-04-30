import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { THREE, Renderer, loadAsync } from 'expo-three';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch } from 'react-native';

export default function Planetarium() {
  const [deviceControlEnabled, setDeviceControlEnabled] = useState(false);
  const sensitivity = 1;
  const [showDebug, setShowDebug] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);

  let timeout: number;

  // TODO: get orientation and compass heading
  // Use refs so that the values can be read in `update`

  useEffect(() => {
    return () => clearTimeout(timeout);
  }, []);

  const handlePermissionRequest = async () => {
    // TODO: Replace with real permission request

    setPermissionGranted(true);
  };

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const sceneColor = 0x6ad6f0;

    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(sceneColor);

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000);
    camera.position.set(0, 0, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(sceneColor, 1, 10000);
    scene.add(new THREE.GridHelper(10, 10));

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
      // TODO: Put camera pointing logic here
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

        {showDebug && (
          <View style={styles.debugPanel}>
            <Text style={styles.debugTitle}>Debug Info</Text>
            <Text style={styles.debugText}>Device Control: {deviceControlEnabled ? 'ON' : 'OFF'}</Text>
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
