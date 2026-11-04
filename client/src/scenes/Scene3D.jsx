import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Sparkles, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { palette } from '../lib/webgl';

/** Eases the whole group toward the pointer for a subtle parallax. */
function Rig({ children, strength = 0.35 }) {
  const g = useRef();
  useFrame(({ pointer }) => {
    if (!g.current) return;
    g.current.rotation.y += (pointer.x * strength - g.current.rotation.y) * 0.04;
    g.current.rotation.x += (-pointer.y * strength * 0.6 - g.current.rotation.x) * 0.04;
  });
  return <group ref={g}>{children}</group>;
}

function Spin({ speed = [0.1, 0.15, 0], children, ...rest }) {
  const r = useRef();
  useFrame((_, d) => {
    if (!r.current) return;
    r.current.rotation.x += d * speed[0];
    r.current.rotation.y += d * speed[1];
    r.current.rotation.z += d * speed[2];
  });
  return <group ref={r} {...rest}>{children}</group>;
}

function Orbiters({ count = 8, radius = 3, size = 0.12, color, geometry = 'sphere', speed = 0.3 }) {
  const g = useRef();
  useFrame((_, d) => { if (g.current) g.current.rotation.y += d * speed; });
  return (
    <group ref={g}>
      {Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * radius, Math.sin(a * 2) * 0.6, Math.sin(a) * radius]}>
            {geometry === 'octa' ? <octahedronGeometry args={[size * 1.6]} /> : <sphereGeometry args={[size, 24, 24]} />}
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function HeroScene3D({ p, dark, lite }) {
  return (
    <Rig>
      <Float speed={1.6} rotationIntensity={0.4} floatIntensity={0.8}>
        <mesh scale={1.35}>
          <sphereGeometry args={[1.5, lite ? 48 : 128, lite ? 48 : 128]} />
          <MeshDistortMaterial color={p.a} emissive={p.a} emissiveIntensity={dark ? 0.35 : 0.12} roughness={0.15} metalness={0.7} distort={0.42} speed={1.8} />
        </mesh>
      </Float>
      <Spin speed={[0.12, 0.2, 0.05]}><mesh rotation={[1.2, 0, 0]}><torusGeometry args={[3.1, 0.014, 16, 220]} /><meshBasicMaterial color={p.b} /></mesh></Spin>
      <Spin speed={[-0.1, 0.16, 0.08]}><mesh rotation={[0.4, 0.8, 0]}><torusGeometry args={[3.7, 0.01, 16, 220]} /><meshBasicMaterial color={p.c} transparent opacity={0.8} /></mesh></Spin>
      <Orbiters count={10} radius={3.1} color={p.b} />
      <Orbiters count={6} radius={3.7} color={p.c} size={0.09} speed={-0.2} />
      <Sparkles count={lite ? 35 : 90} scale={[10, 6, 6]} size={dark ? 3 : 2.4} speed={0.4} color={p.b} />
      {dark && <Stars radius={40} depth={40} count={lite ? 500 : 1400} factor={3} fade speed={1} />}
    </Rig>
  );
}

function CommitteeScene3D({ p, dark, lite }) {
  return (
    <Rig strength={0.5}>
      <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1}>
        <Spin speed={[0.12, 0.28, 0]}>
          <mesh>
            <torusKnotGeometry args={[1.25, 0.38, lite ? 110 : 260, lite ? 16 : 36]} />
            <MeshDistortMaterial color={p.c} emissive={p.a} emissiveIntensity={dark ? 0.5 : 0.18} roughness={0.2} metalness={0.8} distort={0.18} speed={2} />
          </mesh>
        </Spin>
      </Float>
      <Orbiters count={9} radius={3.2} color={p.a} geometry="octa" size={0.1} speed={0.35} />
      <Spin speed={[0.2, 0, 0.1]}><mesh rotation={[1.4, 0, 0]}><torusGeometry args={[2.6, 0.012, 16, 200]} /><meshBasicMaterial color={p.b} /></mesh></Spin>
      <Sparkles count={lite ? 28 : 70} scale={[9, 7, 6]} size={3.2} speed={0.5} color={p.c} />
    </Rig>
  );
}

function GeneralScene3D({ p, dark, lite }) {
  const { nodes, lines } = useMemo(() => {
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const nodes = Array.from({ length: 34 }, () => {
      const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = 1.6 + rnd() * 1.6, k = Math.sqrt(1 - u * u);
      return new THREE.Vector3(r * k * Math.cos(t), r * u, r * k * Math.sin(t));
    });
    const pts = [];
    nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => { if (a.distanceTo(b) < 1.9) pts.push(a, b); }));
    return { nodes, lines: new THREE.BufferGeometry().setFromPoints(pts) };
  }, []);

  return (
    <Rig strength={0.5}>
      <Spin speed={[0.02, 0.14, 0]}>
        <lineSegments geometry={lines}><lineBasicMaterial color={p.b} transparent opacity={dark ? 0.45 : 0.55} /></lineSegments>
        {nodes.map((n, i) => (
          <mesh key={i} position={n}>
            <sphereGeometry args={[i % 5 === 0 ? 0.13 : 0.07, 20, 20]} />
            <meshStandardMaterial color={i % 5 === 0 ? p.c : p.a} emissive={i % 5 === 0 ? p.c : p.a} emissiveIntensity={0.9} />
          </mesh>
        ))}
        <mesh><icosahedronGeometry args={[1.1, 2]} /><meshBasicMaterial color={p.a} wireframe transparent opacity={0.35} /></mesh>
      </Spin>
      <Sparkles count={lite ? 24 : 60} scale={[9, 7, 6]} size={2.6} speed={0.35} color={p.b} />
    </Rig>
  );
}

function OrbsScene3D({ p, dark, lite }) {
  return (
    <Rig strength={0.2}>
      <Float speed={1.2} floatIntensity={1.2}><Spin speed={[0.1, 0.12, 0]} position={[-4, 1.2, -1]}><mesh><icosahedronGeometry args={[1.2, 1]} /><meshBasicMaterial color={p.a} wireframe transparent opacity={0.5} /></mesh></Spin></Float>
      <Float speed={1.5} floatIntensity={1}><Spin speed={[0.15, 0.08, 0.1]} position={[4.2, -0.6, -2]}><mesh><torusGeometry args={[1, 0.3, 24, 80]} /><meshBasicMaterial color={p.b} wireframe transparent opacity={0.5} /></mesh></Spin></Float>
      <Float speed={1.8} floatIntensity={1.4}><mesh position={[0.5, 2, -3]}><octahedronGeometry args={[0.7]} /><meshBasicMaterial color={p.c} wireframe transparent opacity={0.55} /></mesh></Float>
      <Sparkles count={lite ? 20 : 50} scale={[14, 6, 6]} size={dark ? 3 : 2.2} speed={0.3} color={p.b} />
    </Rig>
  );
}

const SCENES = { hero: HeroScene3D, committee: CommitteeScene3D, general: GeneralScene3D, orbs: OrbsScene3D };

export default function Scene3D({ variant = 'orbs', dark, active = true, lite = false, onLost }) {
  const p = palette(dark);
  const Scene = SCENES[variant] || OrbsScene3D;
  return (
    <Canvas eventSource={document.getElementById('root')} eventPrefix="client" dpr={lite ? [1, 1.25] : [1, 1.5]} camera={{ position: [0, 0, 8], fov: 48 }} frameloop={active ? 'always' : 'never'} gl={{ antialias: !lite, alpha: true, powerPreference: 'default' }}
      onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onLost?.(); })}>
      <ambientLight intensity={dark ? 0.55 : 0.9} />
      <pointLight position={[6, 5, 6]} intensity={dark ? 60 : 40} color={p.a} />
      <pointLight position={[-6, -4, 5]} intensity={dark ? 45 : 25} color={p.b} />
      <pointLight position={[0, 6, -4]} intensity={30} color={p.c} />
      <Scene p={p} dark={dark} lite={lite} />
    </Canvas>
  );
}
