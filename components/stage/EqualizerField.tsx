"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { readLevels } from "./audio-reactive";

// A field of glowing equalizer bars on a tilted stage. The cursor sends a
// ripple through the bars; while a clip plays, each column follows its
// frequency band so the stage dances to the song.

interface FieldProps {
  cols: number;
  rows: number;
}

const SPACING = 0.52;
// Resting bars sit in dark indigo; only energy (cursor or music) lights
// them up through peacock → rani → marigold, so the glow means something.
const INDIGO = new THREE.Color("#2a1a52");
const PEACOCK = new THREE.Color("#16d9c8");
const RANI = new THREE.Color("#ff2e88");
const MARIGOLD = new THREE.Color("#ffb020");

function Bars({ cols, rows }: FieldProps) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const { camera, size } = useThree();
  const count = cols * rows;

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(0.3, 1, 0.3);
    g.translate(0, 0.5, 0); // grow upward from the floor
    return g;
  }, []);

  const state = useMemo(
    () => ({
      heights: new Float32Array(count),
      levels: new Float32Array(cols),
      pointerNdc: new THREE.Vector2(0, -0.2),
      pointerWorld: new THREE.Vector3(0, 0, 2),
      energy: 0.6,
      lastMove: 0,
      dummy: new THREE.Object3D(),
      color: new THREE.Color(),
      raycaster: new THREE.Raycaster(),
      floor: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
      hit: new THREE.Vector3(),
    }),
    [count, cols],
  );

  // The canvas sits behind the page, so listen on the window instead of the
  // canvas; content stays fully clickable.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      state.pointerNdc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      state.energy = Math.min(1.6, state.energy + 0.08);
      state.lastMove = performance.now();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [state]);

  useFrame(({ clock }, delta) => {
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;

    state.raycaster.setFromCamera(state.pointerNdc, camera);
    if (state.raycaster.ray.intersectPlane(state.floor, state.hit)) {
      state.pointerWorld.lerp(state.hit, 1 - Math.pow(0.001, delta));
    }
    state.energy = Math.max(0.35, state.energy * Math.pow(0.55, delta));

    const audio = readLevels(state.levels);
    const halfW = ((cols - 1) * SPACING) / 2;
    const halfD = ((rows - 1) * SPACING) / 2;

    // Gentle camera parallax toward the pointer.
    camera.position.x += (state.pointerNdc.x * 1.2 - camera.position.x) * Math.min(1, delta * 2);
    camera.lookAt(0, 0.6, 0);

    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++, i++) {
        const x = c * SPACING - halfW;
        const z = r * SPACING - halfD;
        const dx = x - state.pointerWorld.x;
        const dz = z - state.pointerWorld.z;
        const d = Math.sqrt(dx * dx + dz * dz);

        let target =
          0.08 + 0.16 * (Math.sin(x * 0.55 + t * 0.9) * Math.cos(z * 0.45 + t * 0.6) + 1) * 0.5;
        target += state.energy * 2.4 * Math.exp(-(d * d) / 1.8);
        target += state.energy * 0.3 * Math.max(0, Math.sin(d * 2.2 - t * 5)) * Math.exp(-d * 0.3);
        if (audio) {
          // Mirror bands around the centre column; nearer rows react more.
          const band = Math.abs(c - (cols - 1) / 2) / ((cols - 1) / 2);
          const raw = state.levels[Math.min(cols - 1, Math.floor(band * (cols - 1)))];
          // Gate out the constant loudness floor of mastered pop so only
          // peaks rise, and fade the effect toward the back rows.
          const level = Math.pow(Math.max(0, raw - 0.45) / 0.55, 1.6);
          target += level * 2.2 * Math.pow(r / (rows - 1), 1.5);
        }

        const h = (state.heights[i] += (Math.max(0.05, target) - state.heights[i]) * Math.min(1, delta * 9));
        state.dummy.position.set(x, 0, z);
        state.dummy.scale.set(1, h, 1);
        state.dummy.updateMatrix();
        m.setMatrixAt(i, state.dummy.matrix);

        const k = Math.min(1, h / 2.4);
        if (k < 0.28) state.color.copy(INDIGO).lerp(PEACOCK, Math.pow(k / 0.28, 2));
        else if (k < 0.6) state.color.copy(PEACOCK).lerp(RANI, (k - 0.28) / 0.32);
        else state.color.copy(RANI).lerp(MARIGOLD, (k - 0.6) / 0.4);
        state.color.multiplyScalar(0.7 + k * 0.8);
        m.setColorAt(i, state.color);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  // Keep the whole field in view on narrow screens.
  useEffect(() => {
    const persp = camera as THREE.PerspectiveCamera;
    persp.fov = size.width < 768 ? 58 : 44;
    persp.updateProjectionMatrix();
  }, [camera, size.width]);

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

export default function EqualizerField() {
  const [visible, setVisible] = useState(true);
  const [grid, setGrid] = useState<FieldProps>({ cols: 40, rows: 22 });

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    const onResize = () => setGrid(window.innerWidth < 768 ? { cols: 20, rows: 14 } : { cols: 40, rows: 22 });
    onResize();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <Canvas
      frameloop={visible ? "always" : "never"}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 8.5, 8.5], fov: 44, near: 0.1, far: 60 }}
      style={{ pointerEvents: "none" }}
    >
      <fog attach="fog" args={["#0b0716", 7, 19]} />
      <Bars key={`${grid.cols}x${grid.rows}`} cols={grid.cols} rows={grid.rows} />
    </Canvas>
  );
}
