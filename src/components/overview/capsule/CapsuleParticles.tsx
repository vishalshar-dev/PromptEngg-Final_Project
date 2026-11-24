import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  evaluateParticlePosition,
  generateParticleSeeds,
} from './capsuleConstants';
import type { AetherRuntimeState } from './capsuleAnimation';

interface CapsuleParticlesProps {
  count: number;
  animStateRef: MutableRefObject<AetherRuntimeState>;
}

// Reusable scratch objects outside render loop (zero per-frame GC allocations)
const _dummy = new THREE.Object3D();
const _instanceTint = new THREE.Color();

export function CapsuleParticles({ count, animStateRef }: CapsuleParticlesProps) {
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const seeds = useMemo(() => generateParticleSeeds(count), [count]);

  const { sphereGeo, particleMat } = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 10, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: '#c9fff6',
      emissive: new THREE.Color('#00f5d4'),
      emissiveIntensity: 1.45,
      roughness: 0.16,
      metalness: 0,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    return { sphereGeo: geo, particleMat: mat };
  }, []);

  useEffect(() => {
    return () => {
      sphereGeo.dispose();
      particleMat.dispose();
    };
  }, [sphereGeo, particleMat]);

  useEffect(() => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const s = animStateRef.current;

    for (let i = 0; i < seeds.length; i++) {
      const p = evaluateParticlePosition(
        seeds[i],
        s.motionTime,
        s.currentFill,
        i,
        seeds.length,
        s.reducedMotion
      );
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.setScalar(p.scale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);

      // Subtle per-bubble brightness variation encoded once per seed setup
      _instanceTint.setRGB(
        seeds[i].brightness,
        seeds[i].brightness,
        seeds[i].brightness
      );
      mesh.setColorAt(i, _instanceTint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [seeds, animStateRef]);

  useFrame(() => {
    const mesh = instancedRef.current;
    if (!mesh || seeds.length === 0) return;

    const s = animStateRef.current;
    if (s.particleOpacity <= 0.01 || s.currentFill <= 0.005) {
      mesh.visible = false;
      return;
    }

    mesh.visible = true;
    particleMat.color.copy(s.particleColor);
    particleMat.emissive.copy(s.particleEmissiveColor);
    particleMat.emissiveIntensity = 1.45 * s.breathFactor;
    particleMat.opacity = s.particleOpacity;

    for (let i = 0; i < seeds.length; i++) {
      const p = evaluateParticlePosition(
        seeds[i],
        s.motionTime,
        s.currentFill,
        i,
        seeds.length,
        s.reducedMotion
      );
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.setScalar(p.scale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count <= 0) return null;

  return (
    <instancedMesh
      ref={instancedRef}
      args={[sphereGeo, particleMat, count]}
      frustumCulled={false}
      renderOrder={3}
    />
  );
}
