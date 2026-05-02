# cmb

A mobile planetarium app built with Expo/React Native and Three.js. It renders the **Cosmic Microwave Background (CMB)** as an immersive sky sphere, oriented to real celestial coordinates based on your geographic location. Enable device control to rotate the view by moving your phone.

---

## Quick Start

```bash
npm install
npx expo run:ios
```

Run on a connected device — device orientation requires physical hardware.

---

## Project Structure

```
cmb3/
├── app.json                                    # Expo config (name, version, slug)
├── eslint.config.js                            # ESLint rules for TS/TSX
├── index.ts                                    # Expo entry point (registers App)
├── package.json                                # Dependencies & scripts
├── tsconfig.json                               # TypeScript configuration
└── src/
    ├── assets/
    │   └── sphere.png                          # CMB sky-map texture (equirectangular projection)
    ├── components/
    │   ├── App.tsx                             # Root component (registers Expo entry)
    │   ├── Planetarium.tsx                     # Main scene: GL renderer, camera, UI overlay
    │   └── Planetarium.styles.ts               # React Native StyleSheet for the control panel
    ├── hooks/
    │   └── useDeviceOrientation.ts             # React hook wrapping DeviceMotion sensors
    ├── nodes/
    │   ├── compass.ts                          # 3D compass helper (ring, tick marks, direction cones)
    │   └── cosmicMicrowaveBackground.ts        # Creates the CMB sky sphere mesh
    └── utils/
        └── astronomy.ts                        # Celestial coordinate transforms (galactic → equatorial → horizontal)
```

### Component breakdown

| File | Role |
|------|------|
| `src/components/Planetarium.tsx` | The core screen. Sets up the `GLView` (WebGL context), creates a Three.js scene with lights, the CMB sky sphere, and a compass. Runs the render loop (`requestAnimationFrame`). Provides a React Native overlay for toggling device control, resetting the camera, and showing debug telemetry. |
| `src/components/Planetarium.styles.ts` | All UI styling for the control panel — buttons, labels, debug panel. Uses `StyleSheet.create` from React Native. |
| `src/components/App.tsx` | Minimal wrapper that registers the root component with Expo's entry system. |
| `src/hooks/useDeviceOrientation.ts` | Custom React hook that subscribes to the device's motion sensors (`expo-sensors`). Returns alpha/beta/gamma angles and a pre-computed `THREE.Quaternion` for direct camera rotation. Handles permission requests on iOS 17+. |
| `src/nodes/compass.ts` | Factory function that builds a Three.js `Group` representing a compass: an outer ring, cardinal-direction tick marks, directional cones (N/S/E/W), and degree markers. |
| `src/nodes/cosmicMicrowaveBackground.ts` | Factory function that loads `sphere.png` as a texture and wraps it in a large `SphereGeometry` with `BackSide` rendering, creating an immersive sky dome. |
| `src/utils/astronomy.ts` | Translates geographic coordinates (latitude/longitude) into a `THREE.Quaternion` that orients the galactic plane within the Three.js scene. Uses rotation matrices from `astronomy-engine` (galactic → equatorial → horizontal frame) and applies a coordinate-system correction to align with Three.js's right-handed, Y-up convention. |

---

## Key Libraries

### [Expo](https://docs.expo.dev/)
The development platform and runtime. Provides the JavaScript bridge, native module system, and over-the-air update infrastructure. This project uses Expo's managed workflow.

### [expo-gl](https://docs.expo.dev/modules/gl-view/)
Provides the `GLView` component — a native OpenGL ES canvas that renders WebGL content inside a React Native app. This is the bridge between React Native and the GPU.

### [expo-three](https://github.com/expo/expo-three)
A thin integration layer between Expo and [Three.js](https://threejs.org/). It wraps the Three.js `WebGLRenderer` so it can render into an `expo-gl` context. All 3D scene logic (geometry, materials, lighting, the render loop) uses Three.js APIs directly.

### [three](https://threejs.org/)
The core 3D graphics library. Used for the scene graph, camera, meshes (CMB sphere, compass), materials, and lighting.

### [astronomy-engine](https://github.com/rhcadams/astronomy)
A lightweight astronomy library that computes celestial coordinate transformations. In this project it builds a rotation matrix chain — **galactic → equatorial → horizontal** — so the CMB sky sphere is oriented correctly for the user's real-world location and time.

### [expo-sensors](https://docs.expo.dev/modules/sensors/)
Provides access to device motion hardware (accelerometer, gyroscope). The `useDeviceOrientation` hook uses `DeviceMotion` to read rotation rates and convert them into a quaternion that drives the camera orientation when "Device Control" is enabled.

### [expo-asset](https://docs.expo.dev/modules/asset/) & [expo-file-system](https://docs.expo.dev/modules/file-system/)
Handle bundling and loading local assets (e.g. `sphere.png`) at runtime within the Expo environment.

### [expo-status-bar](https://docs.expo.dev/modules/status-bar/)
Manages the native status bar (hidden in this app for full immersion).

### React Native / React
- **React** — UI framework and hooks (`useState`, `useEffect`, `useRef`, `useCallback`).
- **React Native** — Cross-platform native UI components (`View`, `Text`, `Switch`, `TouchableOpacity`) for the control overlay.
- **react-native-web** — Enables web builds via `expo start --web`.

### TypeScript
All source is written in TypeScript. Strict typing is used throughout for the Three.js types (`@types/three`), React, and custom interfaces.

### ESLint + @typescript-eslint
Linting configuration for the project, with rules for React, React Native, JSX accessibility, and import ordering.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Launch the Expo dev server |
| `npm run android` | Build and run on an Android device/emulator |
| `npm run ios` | Build and run on an iOS simulator/device |
| `npm run web` | Start a web build at localhost |
| `npm run lint` | Run ESLint on `.ts` and `.tsx` files |
| `npm run lint:fix` | Run ESLint with auto-fix enabled |
