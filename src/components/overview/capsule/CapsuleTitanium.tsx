import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AETHER_DIMS } from './capsuleConstants';
import type { AetherMaterials } from './capsuleMaterials';
import type { AetherRuntimeState } from './capsuleAnimation';

interface CapsuleTitaniumProps {
  materials: AetherMaterials;
  latheSegments: number;
  animStateRef: MutableRefObject<AetherRuntimeState>;
}

const _mtx = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _yAxis = new THREE.Vector3(0, 1, 0);

export function CapsuleTitanium({
  materials,
  latheSegments,
  animStateRef,
}: CapsuleTitaniumProps) {
  const fastenerRef = useRef<THREE.InstancedMesh>(null);
  const bridgeClipRef = useRef<THREE.InstancedMesh>(null);

  const {
    topHeadGeo,
    topBevelGeo,
    topCrownLensGeo,
    topCrownRingGeo,
    gasketGeo,
    bottomBaseGeo,
    bottomFootBevelGeo,
    bottomEmitterGeo,
    strutGeo,
    strutAccentRingGeo,
    yokeLugGeo,
    fastenerGeo,
    bridgeClipGeo,
    statusRingGeo,
    statusRingMat,
    emitterMat,
  } = useMemo(() => {
    // 1. Upper Precision-Machined Titanium Head (y = 1.35 to 1.84)
    const headProfile: THREE.Vector2[] = [
      new THREE.Vector2(0, 1.345),
      new THREE.Vector2(0.92, 1.345), // Inner optical baffle ceiling
      new THREE.Vector2(0.935, 1.375), // Inner glass seal flange
      new THREE.Vector2(1.06, 1.375), // Glass top rim seat (glass ends at 1.38)
      new THREE.Vector2(1.065, 1.352), // Outer glass retention skirt
      new THREE.Vector2(1.13, 1.352),
      new THREE.Vector2(1.18, 1.4), // Lower chamfer
      new THREE.Vector2(1.18, 1.46), // Lower barrel
      new THREE.Vector2(1.155, 1.472), // Precision CNC groove 1
      new THREE.Vector2(1.155, 1.488),
      new THREE.Vector2(1.18, 1.5), // Mid barrel
      new THREE.Vector2(1.18, 1.555),
      new THREE.Vector2(1.155, 1.567), // Precision CNC groove 2
      new THREE.Vector2(1.155, 1.582),
      new THREE.Vector2(1.18, 1.594),
      new THREE.Vector2(1.18, 1.635),
      new THREE.Vector2(1.06, 1.73), // Tapered shoulder
      new THREE.Vector2(0.92, 1.755), // Upper deck
      new THREE.Vector2(0.65, 1.755),
      new THREE.Vector2(0.59, 1.795), // Optical dome bezel
      new THREE.Vector2(0.55, 1.795),
      new THREE.Vector2(0.52, 1.71), // Recessed optical pocket
      new THREE.Vector2(0, 1.71),
    ];
    const headGeo = new THREE.LatheGeometry(headProfile, latheSegments, Math.PI, Math.PI * 2);

    const tBevelGeo = new THREE.TorusGeometry(1.12, 0.012, 12, latheSegments);

    // Smoked sapphire optical dome lens
    const lensProfile: THREE.Vector2[] = [
      new THREE.Vector2(0, 1.785),
      new THREE.Vector2(0.28, 1.782),
      new THREE.Vector2(0.46, 1.77),
      new THREE.Vector2(0.535, 1.752),
      new THREE.Vector2(0.535, 1.736),
      new THREE.Vector2(0, 1.736),
    ];
    const lensGeo = new THREE.LatheGeometry(
      lensProfile,
      Math.max(48, latheSegments / 2),
      Math.PI,
      Math.PI * 2
    );

    const crownRing = new THREE.TorusGeometry(0.41, 0.011, 12, 64);

    // Viton elastomer compression gasket ring (reused at top & bottom)
    const gGeo = new THREE.CylinderGeometry(1.045, 1.045, 0.026, latheSegments, 1, true);

    // 2. Lower Precision-Machined Titanium Base (y = -1.86 to -1.30)
    const baseProfile: THREE.Vector2[] = [
      new THREE.Vector2(0, -1.86),
      new THREE.Vector2(1.16, -1.86), // Recessed foot pad
      new THREE.Vector2(1.21, -1.84),
      new THREE.Vector2(1.26, -1.795), // Heavy beveled plinth
      new THREE.Vector2(1.26, -1.72),
      new THREE.Vector2(1.225, -1.705), // Precision cooling groove
      new THREE.Vector2(1.225, -1.688),
      new THREE.Vector2(1.25, -1.674),
      new THREE.Vector2(1.25, -1.58),
      new THREE.Vector2(1.19, -1.51), // Stepped transition
      new THREE.Vector2(1.19, -1.465), // Lower lightguide lip
      new THREE.Vector2(1.085, -1.465), // Undercut lightguide channel (status ring @ -1.43)
      new THREE.Vector2(1.085, -1.395), // Upper lightguide lip
      new THREE.Vector2(1.14, -1.395),
      new THREE.Vector2(1.13, -1.352), // Upper glass collar
      new THREE.Vector2(1.06, -1.352),
      new THREE.Vector2(1.06, -1.375),
      new THREE.Vector2(0.935, -1.375), // Glass bottom seat
      new THREE.Vector2(0.92, AETHER_DIMS.liquidBottomY), // Internal reservoir floor (-1.30)
      new THREE.Vector2(0.45, AETHER_DIMS.liquidBottomY - 0.018), // Slight dished emitter basin
      new THREE.Vector2(0, AETHER_DIMS.liquidBottomY - 0.018),
    ];
    const baseGeo = new THREE.LatheGeometry(baseProfile, latheSegments, Math.PI, Math.PI * 2);

    const footBevel = new THREE.TorusGeometry(1.245, 0.013, 12, latheSegments);

    const floorEmitGeo = new THREE.RingGeometry(0.28, 0.85, 64);

    // 3. Lathe-Turned Tapered Structural Tie-Rod Struts (y = -1.43 to +1.43)
    const strutProfile: THREE.Vector2[] = [
      new THREE.Vector2(0, -1.43),
      new THREE.Vector2(0.054, -1.43),
      new THREE.Vector2(0.056, -1.34), // Lower machined shoulder
      new THREE.Vector2(0.044, -1.29),
      new THREE.Vector2(0.036, -1.2), // Tapered rod
      new THREE.Vector2(0.035, -0.14),
      new THREE.Vector2(0.045, -0.11), // Central stabilizer sleeve
      new THREE.Vector2(0.045, 0.11),
      new THREE.Vector2(0.035, 0.14),
      new THREE.Vector2(0.036, 1.2),
      new THREE.Vector2(0.044, 1.29),
      new THREE.Vector2(0.056, 1.34), // Upper machined shoulder
      new THREE.Vector2(0.054, 1.43),
      new THREE.Vector2(0, 1.43),
    ];
    const stGeo = new THREE.LatheGeometry(strutProfile, 28, Math.PI, Math.PI * 2);

    const stRingGeo = new THREE.TorusGeometry(0.047, 0.007, 10, 28);

    // Yoke mounting lug bridging chassis to each strut
    const lugGeo = new THREE.BoxGeometry(0.15, 0.11, 0.15);

    // Hex socket fastener (instanced x6 at upper & lower yoke lugs)
    const hexGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.026, 6);

    // Lightguide bridge clips (instanced x6 around recessed status channel)
    const clipGeo = new THREE.BoxGeometry(0.032, 0.072, 0.055);

    // Recessed Illuminated Status Ring
    const sRingGeo = new THREE.TorusGeometry(
      AETHER_DIMS.statusRingRadius,
      AETHER_DIMS.statusRingTube,
      16,
      Math.max(64, latheSegments)
    );

    const sRingMat = new THREE.MeshStandardMaterial({
      color: '#19ffe1',
      emissive: new THREE.Color('#00d4b8'),
      emissiveIntensity: 1.05,
      roughness: 0.2,
      metalness: 0.1,
    });

    const fEmitMat = new THREE.MeshStandardMaterial({
      color: '#0b252b',
      emissive: new THREE.Color('#00b89c'),
      emissiveIntensity: 0.55,
      metalness: 0.72,
      roughness: 0.26,
    });

    return {
      topHeadGeo: headGeo,
      topBevelGeo: tBevelGeo,
      topCrownLensGeo: lensGeo,
      topCrownRingGeo: crownRing,
      gasketGeo: gGeo,
      bottomBaseGeo: baseGeo,
      bottomFootBevelGeo: footBevel,
      bottomEmitterGeo: floorEmitGeo,
      strutGeo: stGeo,
      strutAccentRingGeo: stRingGeo,
      yokeLugGeo: lugGeo,
      fastenerGeo: hexGeo,
      bridgeClipGeo: clipGeo,
      statusRingGeo: sRingGeo,
      statusRingMat: sRingMat,
      emitterMat: fEmitMat,
    };
  }, [latheSegments]);

  useEffect(() => {
    return () => {
      topHeadGeo.dispose();
      topBevelGeo.dispose();
      topCrownLensGeo.dispose();
      topCrownRingGeo.dispose();
      gasketGeo.dispose();
      bottomBaseGeo.dispose();
      bottomFootBevelGeo.dispose();
      bottomEmitterGeo.dispose();
      strutGeo.dispose();
      strutAccentRingGeo.dispose();
      yokeLugGeo.dispose();
      fastenerGeo.dispose();
      bridgeClipGeo.dispose();
      statusRingGeo.dispose();
      statusRingMat.dispose();
      emitterMat.dispose();
    };
  }, [
    topHeadGeo,
    topBevelGeo,
    topCrownLensGeo,
    topCrownRingGeo,
    gasketGeo,
    bottomBaseGeo,
    bottomFootBevelGeo,
    bottomEmitterGeo,
    strutGeo,
    strutAccentRingGeo,
    yokeLugGeo,
    fastenerGeo,
    bridgeClipGeo,
    statusRingGeo,
    statusRingMat,
    emitterMat,
  ]);

  // Populate instanced hex socket fasteners (3 top + 3 bottom yoke caps)
  useEffect(() => {
    const fMesh = fastenerRef.current;
    if (fMesh) {
      let idx = 0;
      for (const angle of AETHER_DIMS.strutAngles) {
        const x = Math.sin(angle) * AETHER_DIMS.strutRadialPlacement;
        const z = Math.cos(angle) * AETHER_DIMS.strutRadialPlacement;
        for (const y of [1.62, -1.61]) {
          _pos.set(x, y, z);
          _quat.identity();
          _mtx.compose(_pos, _quat, _scale);
          fMesh.setMatrixAt(idx++, _mtx);
        }
      }
      fMesh.instanceMatrix.needsUpdate = true;
      fMesh.computeBoundingSphere();
    }

    const cMesh = bridgeClipRef.current;
    if (cMesh) {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + Math.PI / 6;
        const r = AETHER_DIMS.statusRingRadius + 0.015;
        _pos.set(Math.sin(angle) * r, AETHER_DIMS.statusRingY, Math.cos(angle) * r);
        _quat.setFromAxisAngle(_yAxis, angle);
        _mtx.compose(_pos, _quat, _scale);
        cMesh.setMatrixAt(i, _mtx);
      }
      cMesh.instanceMatrix.needsUpdate = true;
      cMesh.computeBoundingSphere();
    }
  }, []);

  useFrame(() => {
    const s = animStateRef.current;
    statusRingMat.color.copy(s.statusRingColor);
    statusRingMat.emissive.copy(s.statusRingEmissiveColor);
    statusRingMat.emissiveIntensity = s.statusRingIntensity * s.breathFactor;

    emitterMat.emissive.copy(s.emitterColor);
    emitterMat.emissiveIntensity = s.emitterIntensity * s.breathFactor;
  });

  return (
    <group>
      {/* Upper Machined Titanium Head */}
      <mesh geometry={topHeadGeo} material={materials.anodizedTitanium} />
      <mesh
        geometry={topBevelGeo}
        material={materials.satinTitanium}
        position={[0, 1.675, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={topCrownRingGeo}
        material={statusRingMat}
        position={[0, 1.73, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={topCrownLensGeo}
        material={materials.crownSapphire}
        renderOrder={5}
      />

      {/* Top & Bottom Viton Elastomer Seals */}
      <mesh
        geometry={gasketGeo}
        material={materials.gasketElastomer}
        position={[0, 1.375, 0]}
      />
      <mesh
        geometry={gasketGeo}
        material={materials.gasketElastomer}
        position={[0, -1.375, 0]}
      />

      {/* Lower Machined Titanium Plinth */}
      <mesh geometry={bottomBaseGeo} material={materials.anodizedTitanium} />
      <mesh
        geometry={bottomFootBevelGeo}
        material={materials.satinTitanium}
        position={[0, -1.78, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={bottomEmitterGeo}
        material={emitterMat}
        position={[0, AETHER_DIMS.liquidBottomY - 0.012, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* Recessed Illuminated Energy Status Ring */}
      <mesh
        geometry={statusRingGeo}
        material={statusRingMat}
        position={[0, AETHER_DIMS.statusRingY, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Embedded Lightguide Titanium Bridge Clips */}
      <instancedMesh
        ref={bridgeClipRef}
        args={[bridgeClipGeo, materials.satinTitanium, 6]}
      />

      {/* Three Tapered Structural Struts + Machined Yoke Lugs */}
      {AETHER_DIMS.strutAngles.map((angle, idx) => {
        const x = Math.sin(angle) * AETHER_DIMS.strutRadialPlacement;
        const z = Math.cos(angle) * AETHER_DIMS.strutRadialPlacement;
        const lugR = 1.11;
        return (
          <group key={idx}>
            <group position={[x, 0, z]}>
              <mesh geometry={strutGeo} material={materials.strutTitanium} />
              <mesh
                geometry={strutAccentRingGeo}
                material={materials.satinTitanium}
                position={[0, 1.32, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              />
              <mesh
                geometry={strutAccentRingGeo}
                material={materials.satinTitanium}
                position={[0, 0.11, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              />
              <mesh
                geometry={strutAccentRingGeo}
                material={materials.satinTitanium}
                position={[0, -0.11, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              />
              <mesh
                geometry={strutAccentRingGeo}
                material={materials.satinTitanium}
                position={[0, -1.32, 0]}
                rotation={[Math.PI / 2, 0, 0]}
              />
            </group>

            {/* Upper & Lower Yoke Mounting Lugs */}
            <mesh
              geometry={yokeLugGeo}
              material={materials.anodizedTitanium}
              position={[Math.sin(angle) * lugR, 1.54, Math.cos(angle) * lugR]}
              rotation={[0, angle, 0]}
            />
            <mesh
              geometry={yokeLugGeo}
              material={materials.anodizedTitanium}
              position={[Math.sin(angle) * lugR, -1.53, Math.cos(angle) * lugR]}
              rotation={[0, angle, 0]}
            />
          </group>
        );
      })}

      {/* Instanced Hex Socket Fasteners */}
      <instancedMesh
        ref={fastenerRef}
        args={[fastenerGeo, materials.fastenerSteel, 6]}
      />
    </group>
  );
}
