"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Line as DreiLine, OrbitControls } from "@react-three/drei";
import type { Group, Mesh, MeshStandardMaterial, Points } from "three";
import {
  AdditiveBlending,
  BufferGeometry,
  CubicBezierCurve3,
  Float32BufferAttribute,
  Quaternion,
  TextureLoader,
  Vector3,
} from "three";
import type { ReactNode } from "react";
import { Component, Suspense, useMemo, useRef, useState } from "react";

export interface EarthSignal {
  id: number;
  lat: number;
  lng: number;
  title: string;
  city: string;
  state: string;
  region?: string;
  country?: string;
  category: string;
  description: string;
  budget: number | null;
  timeline: string;
  stakeholders: string[];
  source_url?: string;
}

type GlobeStatus = "initializing" | "stable" | "offline";

interface Earth3DProps {
  signals: EarthSignal[];
  onSignalClick: (signal: EarthSignal) => void;
  onStatusChange?: (status: GlobeStatus) => void;
  isSearching?: boolean;
}

const EARTH_TEXTURE =
  "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
const EARTH_RADIUS = 0.9;

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/* ─── Signal Marker with entrance animation ────────────────────── */

function SignalMarker({
  position,
  onClick,
  appearDelay,
}: {
  position: Vector3;
  onClick: () => void;
  appearDelay?: number;
}) {
  const markerRef = useRef<Mesh>(null);
  const orbitGroupRef = useRef<Group>(null);
  const orbitMaterialRef = useRef<MeshStandardMaterial>(null);
  const pulseGroupRef = useRef<Group>(null);
  const scaleRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const direction = useMemo(() => position.clone().normalize(), [position]);
  const orbitRadius = useMemo(() => position.length(), [position]);
  const orbitQuaternion = useMemo(() => {
    const worldUp = new Vector3(0, 1, 0);
    const normal = direction.clone().cross(worldUp);
    if (normal.lengthSq() < 1e-4) {
      normal.set(1, 0, 0);
    }
    normal.normalize();
    const quaternion = new Quaternion();
    quaternion.setFromUnitVectors(new Vector3(0, 0, 1), normal);
    return quaternion;
  }, [direction]);

  useFrame(({ clock }) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime + (appearDelay ?? 0);
    }

    const timeSinceAppear = clock.elapsedTime - startTimeRef.current;

    // Entrance animation: scale from 0 → 1 with elastic ease
    if (timeSinceAppear < 0) {
      scaleRef.current = 0;
    } else if (timeSinceAppear < 0.8) {
      const t = timeSinceAppear / 0.8;
      // Elastic ease out
      scaleRef.current =
        t === 1
          ? 1
          : 1 - Math.pow(2, -10 * t) * Math.cos((t * 10 - 0.75) * ((2 * Math.PI) / 3)) * -1;
      scaleRef.current = Math.max(0, Math.min(1.15, scaleRef.current));
    } else {
      scaleRef.current = 1;
    }

    const pulse = 0.05 + Math.sin(clock.elapsedTime * 2.5) * 0.02;
    if (markerRef.current) {
      markerRef.current.scale.setScalar(scaleRef.current * (1 + pulse));
    }
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.z += 0.004;
      orbitGroupRef.current.scale.setScalar(scaleRef.current);
    }
    if (orbitMaterialRef.current) {
      orbitMaterialRef.current.emissiveIntensity = 0.75;
    }
    if (pulseGroupRef.current) {
      pulseGroupRef.current.rotation.z = clock.elapsedTime * 1.1;
    }
  });

  const pulsePoints = useMemo(() => {
    const arcLength = Math.PI * 1.85;
    const segments = 96;
    const points: Vector3[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const angle = t * arcLength;
      points.push(
        new Vector3(
          Math.cos(angle) * orbitRadius,
          Math.sin(angle) * orbitRadius,
          0,
        ),
      );
    }
    return points;
  }, [orbitRadius]);

  return (
    <group>
      <mesh
        ref={markerRef}
        position={position}
        onPointerDown={(event) => {
          event.stopPropagation();
          onClick();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[0.028, 16, 16]} />
        <meshStandardMaterial
          color="#00D9FF"
          emissive="#00D9FF"
          emissiveIntensity={0.8}
        />
      </mesh>
      <group ref={orbitGroupRef} quaternion={orbitQuaternion}>
        <mesh raycast={() => null}>
          <torusGeometry args={[orbitRadius, 0.006, 10, 240]} />
          <meshStandardMaterial
            ref={orbitMaterialRef}
            color="#8CEEFF"
            emissive="#7CEBFF"
            emissiveIntensity={0.8}
            transparent
            opacity={0.75}
          />
        </mesh>
        <group ref={pulseGroupRef} raycast={() => null}>
          <DreiLine
            points={pulsePoints}
            color="#8CEEFF"
            lineWidth={1}
            dashed={false}
          />
        </group>
      </group>
    </group>
  );
}

/* ─── Scan Ring: radar sweep during search ─────────────────────── */

function ScanRing({ active }: { active: boolean }) {
  const ringRef = useRef<Group>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current || !materialRef.current) return;
    if (active) {
      ringRef.current.rotation.x = clock.elapsedTime * 1.2;
      ringRef.current.rotation.y = clock.elapsedTime * 0.8;
      materialRef.current.opacity = 0.3 + Math.sin(clock.elapsedTime * 3) * 0.15;
    } else {
      materialRef.current.opacity = Math.max(0, materialRef.current.opacity - 0.02);
    }
  });

  return (
    <group ref={ringRef} raycast={() => null}>
      <mesh>
        <torusGeometry args={[EARTH_RADIUS + 0.15, 0.004, 8, 128]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#00D9FF"
          emissive="#00D9FF"
          emissiveIntensity={1.2}
          transparent
          opacity={0}
        />
      </mesh>
    </group>
  );
}

/* ─── Second scan ring: perpendicular to first ─────────────────── */

function ScanRing2({ active }: { active: boolean }) {
  const ringRef = useRef<Group>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!ringRef.current || !materialRef.current) return;
    if (active) {
      ringRef.current.rotation.z = clock.elapsedTime * 1.5;
      ringRef.current.rotation.x = Math.PI / 3 + clock.elapsedTime * 0.4;
      materialRef.current.opacity = 0.25 + Math.sin(clock.elapsedTime * 2.5 + 1) * 0.12;
    } else {
      materialRef.current.opacity = Math.max(0, materialRef.current.opacity - 0.02);
    }
  });

  return (
    <group ref={ringRef} raycast={() => null}>
      <mesh>
        <torusGeometry args={[EARTH_RADIUS + 0.22, 0.003, 8, 128]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#6FE8FF"
          emissive="#6FE8FF"
          emissiveIntensity={1.0}
          transparent
          opacity={0}
        />
      </mesh>
    </group>
  );
}

/* ─── Grid sphere: holographic wireframe that appears during scan ─ */

function HoloGrid({ active }: { active: boolean }) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !matRef.current) return;
    if (active) {
      meshRef.current.rotation.y = clock.elapsedTime * -0.3;
      matRef.current.opacity = 0.08 + Math.sin(clock.elapsedTime * 2) * 0.04;
    } else {
      matRef.current.opacity = Math.max(0, matRef.current.opacity - 0.01);
    }
  });

  return (
    <mesh ref={meshRef} raycast={() => null}>
      <sphereGeometry args={[EARTH_RADIUS + 0.12, 24, 24]} />
      <meshStandardMaterial
        ref={matRef}
        color="#00D9FF"
        emissive="#00D9FF"
        emissiveIntensity={0.6}
        wireframe
        transparent
        opacity={0}
      />
    </mesh>
  );
}

/* ─── Search Pulse: expanding sphere on search start ───────────── */

function SearchPulse({ active }: { active: boolean }) {
  const meshRef = useRef<Mesh>(null);
  const matRef = useRef<MeshStandardMaterial>(null);
  const phaseRef = useRef(0);
  const wasActive = useRef(false);

  useFrame((_, delta) => {
    if (!meshRef.current || !matRef.current) return;

    // Trigger new pulse when search starts
    if (active && !wasActive.current) {
      phaseRef.current = 0;
    }
    wasActive.current = active;

    if (active || phaseRef.current < 2) {
      phaseRef.current += delta * 1.5;
      const scale = EARTH_RADIUS + phaseRef.current * 0.5;
      const opacity = Math.max(0, 0.35 - phaseRef.current * 0.18);
      meshRef.current.scale.setScalar(scale);
      matRef.current.opacity = opacity;

      // Loop the pulse while searching
      if (active && phaseRef.current > 2) {
        phaseRef.current = 0;
      }
    } else {
      matRef.current.opacity = 0;
    }
  });

  return (
    <mesh ref={meshRef} raycast={() => null}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        ref={matRef}
        color="#00D9FF"
        emissive="#00D9FF"
        emissiveIntensity={0.8}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ─── Connection Arc: curved line from globe center to signal ──── */

function ConnectionArc({
  target,
  delay,
}: {
  target: Vector3;
  delay: number;
}) {
  const lineRef = useRef<{ geometry: BufferGeometry } | null>(null);
  const progressRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  const fullCurve = useMemo(() => {
    const mid = target
      .clone()
      .normalize()
      .multiplyScalar(EARTH_RADIUS + 0.4 + Math.random() * 0.3);
    // Offset the midpoint for a curved arc
    const perpendicular = new Vector3()
      .crossVectors(target.clone().normalize(), new Vector3(0, 1, 0))
      .normalize()
      .multiplyScalar(0.15);
    mid.add(perpendicular);

    const curve = new CubicBezierCurve3(
      new Vector3(0, 0, 0),
      mid.clone().multiplyScalar(0.4),
      mid,
      target,
    );
    return curve.getPoints(64);
  }, [target]);

  useFrame(({ clock }) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = clock.elapsedTime + delay;
    }
    const elapsed = clock.elapsedTime - startTimeRef.current;
    if (elapsed < 0) return;

    const t = Math.min(1, elapsed / 1.2); // 1.2s animation
    // Ease out cubic
    progressRef.current = 1 - Math.pow(1 - t, 3);

    const pointCount = Math.max(2, Math.floor(progressRef.current * fullCurve.length));
    const visiblePoints = fullCurve.slice(0, pointCount);

    if (lineRef.current?.geometry) {
      const positions = new Float32Array(visiblePoints.length * 3);
      for (let i = 0; i < visiblePoints.length; i++) {
        positions[i * 3] = visiblePoints[i].x;
        positions[i * 3 + 1] = visiblePoints[i].y;
        positions[i * 3 + 2] = visiblePoints[i].z;
      }
      lineRef.current.geometry.setAttribute(
        "position",
        new Float32BufferAttribute(positions, 3),
      );
      lineRef.current.geometry.setDrawRange(0, visiblePoints.length);
    }
  });

  return (
    <DreiLine
      ref={lineRef as never}
      points={fullCurve.slice(0, 2)}
      color="#00D9FF"
      lineWidth={1.5}
      transparent
      opacity={0.6}
      dashed={false}
    />
  );
}

/* ─── Particle burst effect radiating outward during search ────── */

function ParticleBurst({ active }: { active: boolean }) {
  const pointsRef = useRef<Points | null>(null);
  const count = 200;
  const velocities = useRef<Float32Array>(new Float32Array(count * 3));
  const lifetimes = useRef<Float32Array>(new Float32Array(count));
  const wasActive = useRef(false);

  const initialPositions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const life = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Random direction on sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.3 + Math.random() * 0.4;
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.cos(phi) * speed;
      vel[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
      pos[i * 3] = vel[i * 3] * EARTH_RADIUS * 0.5;
      pos[i * 3 + 1] = vel[i * 3 + 1] * EARTH_RADIUS * 0.5;
      pos[i * 3 + 2] = vel[i * 3 + 2] * EARTH_RADIUS * 0.5;
      life[i] = Math.random() * 2;
    }
    velocities.current = vel;
    lifetimes.current = life;
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current?.geometry) return;
    const posAttr = (pointsRef.current.geometry as BufferGeometry).getAttribute("position");
    if (!posAttr) return;
    const positions = posAttr.array as Float32Array;

    // Reset particles when search starts
    if (active && !wasActive.current) {
      for (let i = 0; i < count; i++) {
        lifetimes.current[i] = Math.random() * 0.5;
        const idx = i * 3;
        positions[idx] = velocities.current[idx] * EARTH_RADIUS * 0.3;
        positions[idx + 1] = velocities.current[idx + 1] * EARTH_RADIUS * 0.3;
        positions[idx + 2] = velocities.current[idx + 2] * EARTH_RADIUS * 0.3;
      }
    }
    wasActive.current = active;

    if (!active) return;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      lifetimes.current[i] += delta;
      if (lifetimes.current[i] > 2.5) {
        lifetimes.current[i] = 0;
        positions[idx] = velocities.current[idx] * EARTH_RADIUS * 0.3;
        positions[idx + 1] = velocities.current[idx + 1] * EARTH_RADIUS * 0.3;
        positions[idx + 2] = velocities.current[idx + 2] * EARTH_RADIUS * 0.3;
      }
      positions[idx] += velocities.current[idx] * delta * 0.6;
      positions[idx + 1] += velocities.current[idx + 1] * delta * 0.6;
      positions[idx + 2] += velocities.current[idx + 2] * delta * 0.6;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[initialPositions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#00D9FF"
        size={0.012}
        sizeAttenuation
        transparent
        opacity={active ? 0.6 : 0}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

/* ─── Land Dots ────────────────────────────────────────────────── */

function LandDots({ map }: { map: HTMLImageElement | null }) {
  const points = useMemo(() => {
    if (!map) {
      return new Float32Array();
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return new Float32Array();
    }

    canvas.width = map.width;
    canvas.height = map.height;
    ctx.drawImage(map, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const positions: number[] = [];
    const targetPoints = 14000;
    let attempts = 0;

    while (positions.length / 3 < targetPoints && attempts < targetPoints * 6) {
      const x = Math.floor(Math.random() * canvas.width);
      const y = Math.floor(Math.random() * canvas.height);
      const index = (y * canvas.width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 50) {
        const lat = 90 - (y / canvas.height) * 180;
        const lng = (x / canvas.width) * 360 - 180;
        const point = latLngToVector3(lat, lng, EARTH_RADIUS + 0.005);
        positions.push(point.x, point.y, point.z);
      }
      attempts += 1;
    }

    return new Float32Array(positions);
  }, [map]);

  if (points.length === 0) {
    return null;
  }

  return (
    <points raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#E5E7EB"
        size={0.014}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* ─── Earth Globe ──────────────────────────────────────────────── */

function EarthGlobe() {
  const meshRef = useRef<Mesh>(null);
  const [colorMap] = useLoader(TextureLoader, [EARTH_TEXTURE]);

  return (
    <>
      {/* Near-invisible sphere — just enough to hint at shape */}
      <mesh ref={meshRef} raycast={() => null}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#111827"
          transparent
          opacity={0.03}
          depthWrite={false}
        />
      </mesh>
      <LandDots map={colorMap?.image ?? null} />
    </>
  );
}

function EarthPlaceholder() {
  return (
    <mesh>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#050A12"
        emissive="#3B82F6"
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

class EarthErrorBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center text-xs text-white/60">
          Globe temporarily offline
        </div>
      );
    }

    return this.props.children;
  }
}

/* ─── Atmosphere with dynamic glow ─────────────────────────────── */

function Atmosphere({ isSearching }: { isSearching: boolean }) {
  const matRef = useRef<MeshStandardMaterial>(null);
  const targetOpacity = useRef(0.15);

  useFrame(() => {
    if (!matRef.current) return;
    targetOpacity.current = isSearching ? 0.3 : 0.15;
    matRef.current.opacity +=
      (targetOpacity.current - matRef.current.opacity) * 0.05;
    matRef.current.emissiveIntensity = isSearching
      ? 0.7 + Math.sin(Date.now() * 0.005) * 0.2
      : 0.4;
  });

  return (
    <mesh raycast={() => null}>
      <sphereGeometry args={[EARTH_RADIUS + 0.06, 64, 64]} />
      <meshStandardMaterial
        ref={matRef}
        color="#00D9FF"
        transparent
        opacity={0.15}
        emissive="#00D9FF"
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

/* ─── Main Scene ───────────────────────────────────────────────── */

function EarthScene({
  signals,
  onSignalClick,
  onStatusChange,
  isSearching,
}: Earth3DProps) {
  const worldRef = useRef<Group>(null);
  const reportedRef = useRef(false);
  const [showArcs, setShowArcs] = useState(false);
  const prevSignalCount = useRef(0);

  const markerPositions = useMemo(
    () =>
      signals.map((signal) => ({
        signal,
        position: latLngToVector3(signal.lat, signal.lng, EARTH_RADIUS + 0.05),
      })),
    [signals],
  );

  // Trigger arc animations when new signals arrive
  useFrame(() => {
    if (signals.length > prevSignalCount.current) {
      setShowArcs(true);
    }
    prevSignalCount.current = signals.length;
  });

  // Globe rotation: faster during search
  useFrame(() => {
    if (worldRef.current) {
      const speed = isSearching ? 0.008 : 0.0015;
      worldRef.current.rotation.y += speed;
      if (!reportedRef.current) {
        onStatusChange?.("stable");
        reportedRef.current = true;
      }
    }
  });

  return (
    <>
      <ambientLight intensity={isSearching ? 0.55 : 0.4} />
      <pointLight
        position={[4, 2, 4]}
        intensity={isSearching ? 1.6 : 1.2}
      />

      {/* Search effects (outside world group so they don't rotate with globe) */}
      <ScanRing active={!!isSearching} />
      <ScanRing2 active={!!isSearching} />
      <SearchPulse active={!!isSearching} />
      <ParticleBurst active={!!isSearching} />

      <group ref={worldRef}>
        <EarthGlobe />
        <Atmosphere isSearching={!!isSearching} />
        <HoloGrid active={!!isSearching} />
        {markerPositions.map(({ signal, position }, idx) => (
          <SignalMarker
            key={signal.id}
            position={position}
            onClick={() => onSignalClick(signal)}
            appearDelay={idx * 0.15}
          />
        ))}
      </group>

      {/* Connection arcs from center to signals */}
      {showArcs &&
        markerPositions.map(({ signal, position }, idx) => (
          <ConnectionArc
            key={`arc-${signal.id}`}
            target={position}
            delay={idx * 0.2}
          />
        ))}

      <OrbitControls enableZoom={false} enablePan={false} />
    </>
  );
}

/* ─── Exported Component ───────────────────────────────────────── */

export function Earth3D({
  signals,
  onSignalClick,
  onStatusChange,
  isSearching,
}: Earth3DProps) {
  return (
    <div className="h-full w-full">
      <EarthErrorBoundary onError={() => onStatusChange?.("offline")}>
        <Canvas camera={{ position: [0, 0, 2.9], fov: 45 }}>
          <Suspense fallback={<EarthPlaceholder />}>
            <EarthScene
              signals={signals}
              onSignalClick={onSignalClick}
              onStatusChange={onStatusChange}
              isSearching={isSearching}
            />
          </Suspense>
        </Canvas>
      </EarthErrorBoundary>
    </div>
  );
}
