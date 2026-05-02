import { THREE } from 'expo-three';
import * as Astronomy from 'astronomy-engine';

function matToQuat(m: any) {
  // astronomy-engine m.rot is row-major [row][col]
  // THREE.Matrix4 is column-major, so we transpose while filling
  const m4 = new THREE.Matrix4().set(
    m.rot[0][0], m.rot[0][1], m.rot[0][2], 0,
    m.rot[1][0], m.rot[1][1], m.rot[1][2], 0,
    m.rot[2][0], m.rot[2][1], m.rot[2][2], 0,
    0, 0, 0, 1
  );
  return new THREE.Quaternion().setFromRotationMatrix(m4);
}

// Horizontal frame in astronomy-engine: x=North, y=West, z=Zenith
// Three.js frame: x=East, y=Up, z=South  (right-handed, y-up)
// This 90° rotation around X aligns astro's z-up zenith → Three's y-up,
// and flips West→East handedness. Compute once at startup.
const ASTRO_TO_THREEJS = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(Math.PI / 2, 0, Math.PI, 'XYZ')
);

export function getCelestialOrientation(latitude: number, longitude: number, date = new Date()) {
  const time = Astronomy.MakeTime(date);
  const observer = new Astronomy.Observer(latitude, longitude, 0);

  const R_gal2eqj = Astronomy.Rotation_GAL_EQJ();
  const R_eqj2hor = Astronomy.Rotation_EQJ_HOR(time, observer);
  const R_combined = Astronomy.CombineRotation(R_eqj2hor, R_gal2eqj);

  const Q_celestial = matToQuat(R_combined);

  // Re-express in Three.js coordinate convention
  Q_celestial.premultiply(ASTRO_TO_THREEJS);

  return Q_celestial;
}