import { THREE } from 'expo-three';

function createDirectionMarker(color: number): THREE.Mesh {
  const geometry = new THREE.ConeGeometry(0.08, 0.25, 4);
  const material = new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 0.5,
  });
  return new THREE.Mesh(geometry, material);
}

export function createCompass() {
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

    return compassGroup;
}