"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Group, Line, Mesh, MeshStandardMaterial } from "three";
import { BufferGeometry, Float32BufferAttribute, Quaternion, TextureLoader, Vector3 } from "three";
import type { ReactNode } from "react";
import type { Signal } from "../lib/api";
import { Component, Suspense, useMemo, useRef } from "react";

interface Earth3DProps {
  signals: Signal[];
  onSignalClick: (signal: Signal) => void;
}

const EARTH_TEXTURE =
  "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
const EARTH_BUMP =
  "https://threejs.org/examples/textures/planets/earth_normal_2048.jpg";
const EARTH_RADIUS = 0.9;

function latLngToVector3(lat: number, lng: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function SignalMarker({
  position,
  onClick
}: {
  position: Vector3;
  onClick: () => void;
}) {
  const markerRef = useRef<Mesh>(null);
  const orbitGroupRef = useRef<Group>(null);
  const orbitRingRef = useRef<Mesh>(null);
  const orbitMaterialRef = useRef<MeshStandardMaterial>(null);
  const pulseRef = useRef<Line>(null);
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
    const pulse = 0.05 + Math.sin(clock.elapsedTime * 2.5) * 0.02;
    if (markerRef.current) {
      markerRef.current.scale.setScalar(1 + pulse);
    }
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.z += 0.004;
    }
    if (orbitMaterialRef.current) {
      orbitMaterialRef.current.emissiveIntensity = 0.75;
    }
    if (pulseRef.current) {
      const angle = clock.elapsedTime * 1.1;
      pulseRef.current.rotation.z = angle;
    }
  });

  const pulseGeometry = useMemo(() => {
    const arcLength = Math.PI * 1.85;
    const segments = 96;
    const positions = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const angle = t * arcLength;
      const x = Math.cos(angle) * orbitRadius;
      const y = Math.sin(angle) * orbitRadius;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = 0;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    return geometry;
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
      >
        <sphereGeometry args={[0.028, 16, 16]} />
        <meshStandardMaterial color="#00D9FF" emissive="#00D9FF" emissiveIntensity={0.8} />
      </mesh>
      <group ref={orbitGroupRef} quaternion={orbitQuaternion}>
        <mesh ref={orbitRingRef} raycast={() => null}>
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
        <line ref={pulseRef} raycast={() => null}>
          <primitive object={pulseGeometry} attach="geometry" />
          <lineBasicMaterial color="#8CEEFF" linewidth={2} />
        </line>
      </group>
    </group>
  );
}

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
      <pointsMaterial color="#D0FBFF" size={0.016} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function EarthGlobe() {
  const meshRef = useRef<Mesh>(null);
  const [colorMap, normalMap] = useLoader(TextureLoader, [EARTH_TEXTURE, EARTH_BUMP]);

  return (
    <>
      <mesh ref={meshRef} raycast={() => null}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial
          map={colorMap}
          normalMap={normalMap}
          metalness={0.3}
          roughness={0.9}
          color="#0a1f2b"
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
      <meshStandardMaterial color="#0b2a3d" emissive="#00D9FF" emissiveIntensity={0.2} />
    </mesh>
  );
}

class EarthErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
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

function Atmosphere() {
  return (
    <mesh raycast={() => null}>
      <sphereGeometry args={[EARTH_RADIUS + 0.06, 64, 64]} />
      <meshStandardMaterial
        color="#00D9FF"
        transparent
        opacity={0.15}
        emissive="#00D9FF"
        emissiveIntensity={0.4}
      />
    </mesh>
  );
}

function EarthScene({ signals, onSignalClick }: Earth3DProps) {
  const worldRef = useRef<Group>(null);
  const markerPositions = useMemo(
    () =>
      signals.map((signal) => ({
        signal,
        position: latLngToVector3(signal.lat, signal.lng, EARTH_RADIUS + 0.05)
      })),
    [signals]
  );

  useFrame(() => {
    if (worldRef.current) {
      worldRef.current.rotation.y += 0.0015;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 2, 4]} intensity={1.2} />
      <group ref={worldRef}>
        <EarthGlobe />
        <Atmosphere />
        {markerPositions.map(({ signal, position }) => (
          <SignalMarker key={signal.id} position={position} onClick={() => onSignalClick(signal)} />
        ))}
      </group>
      <OrbitControls enableZoom={false} enablePan={false} />
    </>
  );
}

export function Earth3D({ signals, onSignalClick }: Earth3DProps) {
  return (
    <div className="h-full w-full">
      <EarthErrorBoundary>
      <Canvas camera={{ position: [0, 0, 2.9], fov: 45 }}>
          <Suspense fallback={<EarthPlaceholder />}>
            <EarthScene signals={signals} onSignalClick={onSignalClick} />
          </Suspense>
        </Canvas>
      </EarthErrorBoundary>
    </div>
  );
}
