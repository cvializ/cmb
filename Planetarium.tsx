import { GLView } from 'expo-gl';
import * as ExpoTHREE from 'expo-three';
const THREE = ExpoTHREE.THREE;
const Renderer = ExpoTHREE.Renderer;
import React, { useRef } from 'react';
import { View, StyleSheet, Text, SafeAreaView } from 'react-native';

export default function Planetarium() {
  const animationFrameRef = useRef<number | null>(null);

  const onContextCreate = async (gl: any) => {
    // Create scene
    const scene = new THREE.Scene();

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      1000
    );
    camera.position.z = 3;

    // Create renderer using expo-three
    const renderer = new Renderer({ gl, antialias: true });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setPixelRatio(Math.min(gl.drawingBufferWidth / gl.drawingBufferHeight, 2));

    // Clear background to dark gray so we can see if rendering works
    renderer.setClearColor(0x222222);

    // ============================================
    // TEST 1: Triangle with vertex colors
    // ============================================
    const triangleGeometry = new THREE.BufferGeometry();
    const trianglePositions = new Float32Array([
      -1, -1, 0, // vertex 1 (bottom-left)
       1, -1, 0, // vertex 2 (bottom-right)
       0,  1, 0  // vertex 3 (top-center)
    ]);
    const triangleColors = new Float32Array([
      1, 0, 0, // red
      0, 1, 0, // green
      0, 0, 1  // blue
    ]);
    triangleGeometry.setAttribute('position', new THREE.BufferAttribute(trianglePositions, 3));
    triangleGeometry.setAttribute('color', new THREE.BufferAttribute(triangleColors, 3));

    const triangleMaterial = new THREE.MeshBasicMaterial({ 
      vertexColors: true,
      side: THREE.DoubleSide
    });
    const triangle = new THREE.Mesh(triangleGeometry, triangleMaterial);
    scene.add(triangle);

    // ============================================
    // TEST 2: DataTexture filled with white pixels
    // ============================================
    const textureSize = 256;
    const data = new Uint8Array(4 * textureSize * textureSize);
    // Fill with white pixels (R=255, G=255, B=255, A=255)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;     // R
      data[i + 1] = 255; // G
      data[i + 2] = 255; // B
      data[i + 3] = 255; // A
    }
    
    const whiteTexture = new THREE.DataTexture(
      data,
      textureSize,
      textureSize,
      THREE.RGBAFormat
    );
    
    const planeGeometry = new THREE.PlaneGeometry(1.5, 1.5);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      map: whiteTexture,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.x = 2; // Offset to the right of triangle
    scene.add(plane);

    // ============================================
    // Add some lighting (good practice)
    // ============================================
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Rotate both objects for visual clarity
      triangle.rotation.z += 0.01;
      plane.rotation.z -= 0.01;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup function returned from onContextCreate
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      triangleGeometry.dispose();
      triangleMaterial.dispose();
      planeGeometry.dispose();
      planeMaterial.dispose();
      whiteTexture.dispose();
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <GLView style={styles.glView} onContextCreate={onContextCreate} />
      <View style={styles.overlay}>
        <Text style={styles.title}>3D Rendering Test</Text>
        <Text style={styles.subtitle}>
          Left: Colored Triangle • Right: White Texture
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  glView: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
