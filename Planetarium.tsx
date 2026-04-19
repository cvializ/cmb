import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import * as THREE from 'three';

export default function Planetarium() {
  const containerRef = useRef<View>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();

    // Create camera positioned at the center
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.width / containerRef.current.height,
      0.1,
      1000
    );
    camera.position.z = 0;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.width, containerRef.current.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create test texture using canvas
    const createTestTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      if (!ctx) return null;

      // Create a colorful gradient pattern
      const gradient = ctx.createLinearGradient(0, 0, 512, 512);
      gradient.addColorStop(0, '#ff0000');
      gradient.addColorStop(0.25, '#ffff00');
      gradient.addColorStop(0.5, '#00ff00');
      gradient.addColorStop(0.75, '#00ffff');
      gradient.addColorStop(1, '#0000ff');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Add some checkerboard pattern
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 512; i += 64) {
        for (let j = 0; j < 512; j += 64) {
          if ((i / 64 + j / 64) % 2 === 0) {
            ctx.fillRect(i, j, 64, 64);
          }
        }
      }

      // Add some text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PLANETARIUM', 256, 256);

      return new THREE.CanvasTexture(canvas);
    };

    // Create sphere geometry (large enough to surround the camera)
    const sphereGeometry = new THREE.SphereGeometry(10, 64, 64);

    // Create material with backside rendering (so we see the inside)
    const texture = createTestTexture();
    const sphereMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
    });

    // Create sphere mesh
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Slowly rotate the sphere
      sphere.rotation.y += 0.001;
      sphere.rotation.x += 0.0005;

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.width;
      const height = containerRef.current.height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      if (texture) texture.dispose();
    };
  }, []);

  return (
    <View style={styles.container} ref={containerRef}>
      <View style={styles.overlay}>
        <Text style={styles.title}>Planetarium</Text>
        <Text style={styles.subtitle}>Inside a sphere with test texture</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
});