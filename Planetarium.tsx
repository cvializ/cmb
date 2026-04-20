import React, { useEffect, useState } from 'react';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { THREE, Renderer, loadAsync } from 'expo-three';

export default function Planetarium() {
  const [camera, setCamera] = useState<THREE.Camera | null>(null);

  let timeout: number;

  useEffect(() => {
    // Clear the animation loop when the component unmounts
    return () => clearTimeout(timeout);
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const sceneColor = 0x6ad6f0;

    // Create a WebGLRenderer without a DOM element
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(sceneColor);

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000);
    camera.position.set(0, 0, 0);
    setCamera(camera);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(sceneColor, 1, 10000);
    scene.add(new THREE.GridHelper(10, 10));

        const texture = await loadAsync(require('./sphere.png'));

    // Create lights with better intensities
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, .5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 10, 1000, 1);
    pointLight.position.set(0, 100, 100);
    scene.add(pointLight);

    const spotLight = new THREE.SpotLight(0xffffff, 10);
    spotLight.position.set(0, 10, 10);
    spotLight.lookAt(scene.position);
    scene.add(spotLight);

    // Create sphere with standard material and texture (inside-out mapping)
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
      sphere.rotation.y += 0.05;
      sphere.rotation.x += 0.025;
    };

    // Setup an animation loop
    const render = () => {
      timeout = requestAnimationFrame(render);
      update();
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />;
}
