import { THREE, loadAsync } from 'expo-three';

export async function createCosmicMicrowaveBackground() {
    const texture = await loadAsync(require('../sphere.png'));
    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(5, 64, 64),
        new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.BackSide,
        roughness: 0.5,
        metalness: 0.1,
        })
    );

    return sphere;
}