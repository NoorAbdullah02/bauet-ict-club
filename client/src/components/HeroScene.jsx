import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Stars } from '@react-three/drei';
import * as THREE from 'three';

function Particles({ count = 200 }) {
  const mesh = useRef();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.02;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#C9A84C"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function GlowingSphere() {
  const mesh = useRef();
  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.1;
      mesh.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.8, 4]} />
        <meshStandardMaterial
          color="#0096C7"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
    </Float>
  );
}

function NetworkLines({ count = 30 }) {
  const lines = useMemo(() => {
    const result = [];
    const points = [];
    for (let i = 0; i < count; i++) {
      points.push(new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      ));
    }
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (points[i].distanceTo(points[j]) < 4) {
          result.push([points[i], points[j]]);
        }
      }
    }
    return result;
  }, [count]);

  return (
    <group>
      {lines.map((pair, i) => {
        const geom = new THREE.BufferGeometry().setFromPoints(pair);
        return (
          <line key={i} geometry={geom}>
            <lineBasicMaterial color="#C9A84C" transparent opacity={0.06} />
          </line>
        );
      })}
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{ position: 'absolute', inset: 0 }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.5} color="#C9A84C" />
      <pointLight position={[-5, -5, 5]} intensity={0.3} color="#0096C7" />
      <Stars radius={50} depth={50} count={1000} factor={3} saturation={0} fade speed={1} />
      <Particles />
      <GlowingSphere />
      <NetworkLines />
    </Canvas>
  );
}
