import React, { useState } from 'react';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import * as THREE from 'three';
import { Renderer } from 'expo-three';

export default function Planetarium() {
  const [camera, setCamera] = useState<THREE.Camera | null>(null);

  let timeout: number;

  React.useEffect(() => {
    // Clear the animation loop when the component unmounts
    return () => clearTimeout(timeout);
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const sceneColor = 0x222222;

    // Create a WebGLRenderer without a DOM element
    const renderer = new Renderer({ gl, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(width / height, 2));
    renderer.setClearColor(sceneColor);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3);
    setCamera(camera);

    const scene = new THREE.Scene();

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
    const update = () => {
      triangle.rotation.z += 0.01;
      plane.rotation.z -= 0.01;

      // Optional: Frustum checks for debugging
      const frustum = new THREE.Frustum();
      frustum.setFromProjectionMatrix(camera.projectionMatrix);
      
      const now = Date.now();
      if (now % 1000 < 50) {
        const triangleInFrustum = frustum.intersectsObject(triangle);
        const planeInFrustum = frustum.intersectsObject(plane);
        console.log(`Triangle: ${triangleInFrustum ? 'IN' : 'OUT'}, Plane: ${planeInFrustum ? 'IN' : 'OUT'}`);
      }
    };

    // Setup an animation loop
    const render = () => {
      timeout = requestAnimationFrame(render);
      update();
      renderer.render(scene, camera);
    };
    render();

    // Cleanup
    return () => {
      renderer.dispose();
      triangleGeometry.dispose();
      triangleMaterial.dispose();
      planeGeometry.dispose();
      planeMaterial.dispose();
      whiteTexture.dispose();
    };
  };

  return <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />;
}
