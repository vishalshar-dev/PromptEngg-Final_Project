import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  AETHER_DIMS,
  evalStrutCenterRadius,
} from './capsuleConstants';
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

function ensureTangents(geo: THREE.BufferGeometry): void {
  if (geo.index && geo.attributes.uv && geo.attributes.normal) {
    geo.computeTangents();
  }
}

/**
 * Radial spider clevis arm extending outward from the narrow upper bayonet crown
 * to anchor each swept buttress rail with sculpted negative space around the glass neck.
 * Oriented so local +Z points radially outward and local Y is vertical.
 */
function createSpiderClevisArmGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.072, -0.09);
  shape.lineTo(0.072, -0.09);
  shape.lineTo(0.056, 0.02);
  shape.quadraticCurveTo(0.052, 0.095, 0.024, 0.118);
  shape.quadraticCurveTo(0, 0.128, -0.024, 0.118);
  shape.quadraticCurveTo(-0.052, 0.095, -0.056, 0.02);
  shape.lineTo(-0.072, -0.09);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.068,
    bevelEnabled: true,
    bevelThickness: 0.011,
    bevelSize: 0.01,
    bevelSegments: 3,
    curveSegments: 14,
  });
  geo.translate(0, 0, -0.034);
  geo.rotateX(Math.PI / 2);
  return geo;
}

/**
 * Outboard plinth anchor buttress cradling the lower foot of each swept buttress rail.
 * Oriented so local +Z points radially outward.
 */
function createPlinthButtressGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.094, -0.105);
  shape.lineTo(0.094, -0.105);
  shape.lineTo(0.076, 0.05);
  shape.quadraticCurveTo(0.068, 0.132, 0.026, 0.155);
  shape.quadraticCurveTo(0, 0.164, -0.026, 0.155);
  shape.quadraticCurveTo(-0.068, 0.132, -0.076, 0.05);
  shape.lineTo(-0.094, -0.105);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.095,
    bevelEnabled: true,
    bevelThickness: 0.013,
    bevelSize: 0.011,
    bevelSegments: 3,
    curveSegments: 14,
  });
  geo.translate(0, 0, -0.0475);
  geo.rotateX(Math.PI / 2);
  return geo;
}

/**
 * Contoured lightguide retention saddle bridging over the recessed illuminated status channel.
 */
function createBeveledBridgeClipGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.017, -0.034);
  shape.lineTo(0.017, -0.034);
  shape.quadraticCurveTo(0.023, 0, 0.017, 0.034);
  shape.lineTo(-0.017, 0.034);
  shape.quadraticCurveTo(-0.023, 0, -0.017, -0.034);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.0055,
    bevelSize: 0.0045,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.center();
  return geo;
}

function evalStrutTiltAngle(y: number): number {
  const eps = 0.02;
  const dr = evalStrutCenterRadius(y + eps) - evalStrutCenterRadius(y - eps);
  return Math.atan2(dr, eps * 2);
}

export function CapsuleTitanium({
  materials,
  latheSegments,
  animStateRef,
}: CapsuleTitaniumProps) {
  const fastenerRef = useRef<THREE.InstancedMesh>(null);
  const fastenerSocketRef = useRef<THREE.InstancedMesh>(null);
  const flangeBoltRef = useRef<THREE.InstancedMesh>(null);
  const bridgeClipRef = useRef<THREE.InstancedMesh>(null);

  const upperFerruleY = 1.24;
  const upperFerruleR = evalStrutCenterRadius(upperFerruleY);
  const upperFerruleTilt = evalStrutTiltAngle(upperFerruleY);

  const bellySleeveY = -0.38;
  const bellySleeveR = evalStrutCenterRadius(bellySleeveY);
  const bellySleeveTilt = evalStrutTiltAngle(bellySleeveY);

  const lowerFerruleY = -1.32;
  const lowerFerruleR = evalStrutCenterRadius(lowerFerruleY);
  const lowerFerruleTilt = evalStrutTiltAngle(lowerFerruleY);

  const {
    topHeadGeo,
    topCollarTrimGeo,
    topShoulderBevelGeo,
    topCrownBezelGeo,
    topCrownLensGeo,
    topCrownApertureGeo,
    topCrownRingGeo,
    topGasketORingGeo,
    topGasketSleeveGeo,
    bottomBaseGeo,
    bottomCollarTrimGeo,
    bottomUpperChamferGeo,
    bottomFootBevelGeo,
    bottomGasketORingGeo,
    bottomGasketSleeveGeo,
    bottomEmitterGeo,
    spineShaftGeo,
    spineDiscGeo,
    spineHubGeo,
    strutGeo,
    strutBellySleeveGeo,
    strutFerruleGeo,
    strutAccentRingGeo,
    spiderArmGeo,
    plinthButtressGeo,
    fastenerGeo,
    fastenerSocketGeo,
    flangeBoltGeo,
    bridgeClipGeo,
    statusRingGeo,
    statusRingMat,
    emitterMat,
  } = useMemo(() => {
    // 1. Compact Stepped Upper Instrument Crown (y = 1.19 to 1.82, maxRadius = 0.84)
    const neckIn = AETHER_DIMS.glassNeckOuterRadius - AETHER_DIMS.glassWallThickness;
    const neckOut = AETHER_DIMS.glassNeckOuterRadius;

    const headProfile: THREE.Vector2[] = [
      new THREE.Vector2(0, 1.19),
      new THREE.Vector2(neckIn - 0.015, 1.19), // Inner optical baffle ceiling
      new THREE.Vector2(neckIn, 1.235),
      new THREE.Vector2(neckOut + 0.004, 1.235), // Neck glass rim seat
      new THREE.Vector2(neckOut + 0.012, 1.2), // Outer bayonet retention skirt
      new THREE.Vector2(0.772, 1.2),
      new THREE.Vector2(0.84, 1.258), // Crisp 45deg bayonet chamfer
      new THREE.Vector2(0.84, 1.325), // Barrel band 1
      new THREE.Vector2(0.812, 1.338), // CNC grip groove 1
      new THREE.Vector2(0.812, 1.356),
      new THREE.Vector2(0.84, 1.368), // Barrel band 2
      new THREE.Vector2(0.84, 1.425),
      new THREE.Vector2(0.812, 1.438), // CNC grip groove 2
      new THREE.Vector2(0.812, 1.456),
      new THREE.Vector2(0.84, 1.468),
      new THREE.Vector2(0.84, 1.515),
      new THREE.Vector2(0.755, 1.605), // Stepped chamfered upper deck
      new THREE.Vector2(0.71, 1.655),
      new THREE.Vector2(0.545, 1.665), // Recessed upper flange deck
      new THREE.Vector2(0.495, 1.725), // Raised central optical crown turret
      new THREE.Vector2(0.462, 1.815),
      new THREE.Vector2(0.422, 1.815), // Turret top bevel
      new THREE.Vector2(0.398, 1.718), // Recessed sapphire well
      new THREE.Vector2(0, 1.718),
    ];
    const headGeo = new THREE.LatheGeometry(headProfile, latheSegments, Math.PI, Math.PI * 2);
    ensureTangents(headGeo);

    const topCollarGeo = new THREE.TorusGeometry(0.774, 0.01, 12, latheSegments);
    const tShoulderBevelGeo = new THREE.TorusGeometry(0.822, 0.011, 12, latheSegments);
    const crownBezelGeo = new THREE.TorusGeometry(0.442, 0.014, 14, 64);

    // Compact smoked sapphire dome lens seated in turret well
    const lensProfile: THREE.Vector2[] = [
      new THREE.Vector2(0, 1.806),
      new THREE.Vector2(0.21, 1.802),
      new THREE.Vector2(0.35, 1.788),
      new THREE.Vector2(0.412, 1.766),
      new THREE.Vector2(0.412, 1.744),
      new THREE.Vector2(0, 1.744),
    ];
    const lensGeo = new THREE.LatheGeometry(
      lensProfile,
      Math.max(48, Math.floor(latheSegments * 0.5)),
      Math.PI,
      Math.PI * 2
    );

    const crownAperture = new THREE.TorusGeometry(0.355, 0.01, 10, 56);
    const crownRing = new THREE.TorusGeometry(0.305, 0.008, 10, 56);

    // Top neck & bottom flange Viton compression O-rings + sleeves (separate radii!)
    const topORingGeo = new THREE.TorusGeometry(neckOut + 0.004, 0.014, 12, latheSegments);
    const topSleeveGeo = new THREE.CylinderGeometry(
      neckOut - 0.002,
      neckOut - 0.002,
      0.028,
      latheSegments,
      1,
      true
    );

    const botOut = AETHER_DIMS.glassBaseOuterRadius;
    const botIn = botOut - AETHER_DIMS.glassWallThickness;
    const botORingGeo = new THREE.TorusGeometry(botOut + 0.004, 0.015, 12, latheSegments);
    const botSleeveGeo = new THREE.CylinderGeometry(
      botOut - 0.002,
      botOut - 0.002,
      0.03,
      latheSegments,
      1,
      true
    );

    // 2. Grounded Wide Aerospace Containment Plinth (y = -1.84 to -1.18, maxRadius = 1.24)
    const baseProfile: THREE.Vector2[] = [
      new THREE.Vector2(0, -1.84),
      new THREE.Vector2(1.13, -1.84), // Precision machined foot pad
      new THREE.Vector2(1.195, -1.816),
      new THREE.Vector2(1.24, -1.768), // Broad stepped plinth foot
      new THREE.Vector2(1.24, -1.702),
      new THREE.Vector2(1.202, -1.688), // Cooling channel 1
      new THREE.Vector2(1.202, -1.668),
      new THREE.Vector2(1.232, -1.654),
      new THREE.Vector2(1.232, -1.586),
      new THREE.Vector2(1.158, -1.504), // Architectural bevel shoulder
      new THREE.Vector2(1.158, -1.418),
      new THREE.Vector2(1.06, -1.402), // Lower lightguide lip
      new THREE.Vector2(0.988, -1.394), // Recessed lightguide channel (ring at -1.36, r=1.015)
      new THREE.Vector2(0.988, -1.326),
      new THREE.Vector2(1.045, -1.314), // Upper lightguide overhang
      new THREE.Vector2(1.045, -1.258),
      new THREE.Vector2(0.946, -1.192), // Stepped lower glass clamp collar
      new THREE.Vector2(0.902, -1.192),
      new THREE.Vector2(0.902, -1.214),
      new THREE.Vector2(botIn, -1.214), // Bottom glass flange seat
      new THREE.Vector2(botIn - 0.008, AETHER_DIMS.liquidBottomY), // Reservoir floor (-1.14)
      new THREE.Vector2(0.38, AETHER_DIMS.liquidBottomY - 0.016), // Recessed emitter basin
      new THREE.Vector2(0, AETHER_DIMS.liquidBottomY - 0.016),
    ];
    const baseGeo = new THREE.LatheGeometry(baseProfile, latheSegments, Math.PI, Math.PI * 2);
    ensureTangents(baseGeo);

    const botCollarGeo = new THREE.TorusGeometry(0.948, 0.01, 12, latheSegments);
    const botUpperChamfer = new THREE.TorusGeometry(1.155, 0.011, 12, latheSegments);
    const footBevel = new THREE.TorusGeometry(1.224, 0.013, 14, latheSegments);
    const floorEmitGeo = new THREE.RingGeometry(0.18, 0.72, 64);

    // Subtle Internal Central Optical Telemetry Spine (clears fluid and particles at every fill)
    const spineGeo = new THREE.CylinderGeometry(0.019, 0.023, 2.34, 16);
    const discGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.013, 20);
    const hubGeo = new THREE.CylinderGeometry(0.068, 0.088, 0.046, 24);

    // 3. Swept Contoured Aerospace Buttress Rail built along exact evalStrutCenterRadius(y)
    const railPoints: THREE.Vector3[] = [];
    const railSamples = 28;
    for (let i = 0; i <= railSamples; i++) {
      const t = i / railSamples;
      const y =
        AETHER_DIMS.strutBottomY +
        (AETHER_DIMS.strutTopY - AETHER_DIMS.strutBottomY) * t;
      railPoints.push(new THREE.Vector3(0, y, evalStrutCenterRadius(y)));
    }
    const railCurve = new THREE.CatmullRomCurve3(railPoints);
    const stGeo = new THREE.TubeGeometry(railCurve, 52, 0.031, 18, false);
    ensureTangents(stGeo);

    const bellySleeveGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.21, 24);
    const ferruleGeo = new THREE.CylinderGeometry(0.044, 0.049, 0.095, 24);
    const stRingGeo = new THREE.TorusGeometry(0.047, 0.0065, 10, 24);

    const sArmGeo = createSpiderClevisArmGeometry();
    const pButtressGeo = createPlinthButtressGeometry();

    // Instanced socket-head cap screws + dark hex socket pockets (3 top + 3 bottom)
    const hexGeo = new THREE.CylinderGeometry(0.023, 0.023, 0.022, 18);
    const hexSocketGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.012, 6);
    // Micro perimeter deck bolts (6 around compact upper turret deck)
    const microBoltGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.011, 12);

    const clipGeo = createBeveledBridgeClipGeometry();

    // Recessed Illuminated Lower Status Channel Ring
    const sRingGeo = new THREE.TorusGeometry(
      AETHER_DIMS.statusRingRadius,
      AETHER_DIMS.statusRingTube,
      16,
      Math.max(64, latheSegments)
    );

    const sRingMat = new THREE.MeshStandardMaterial({
      color: '#19ffe1',
      emissive: new THREE.Color('#00c9ae'),
      emissiveIntensity: 1.0,
      roughness: 0.18,
      metalness: 0.12,
    });

    const fEmitMat = new THREE.MeshStandardMaterial({
      color: '#0c2329',
      emissive: new THREE.Color('#009e86'),
      emissiveIntensity: 0.48,
      metalness: 0.72,
      roughness: 0.24,
    });

    return {
      topHeadGeo: headGeo,
      topCollarTrimGeo: topCollarGeo,
      topShoulderBevelGeo: tShoulderBevelGeo,
      topCrownBezelGeo: crownBezelGeo,
      topCrownLensGeo: lensGeo,
      topCrownApertureGeo: crownAperture,
      topCrownRingGeo: crownRing,
      topGasketORingGeo: topORingGeo,
      topGasketSleeveGeo: topSleeveGeo,
      bottomBaseGeo: baseGeo,
      bottomCollarTrimGeo: botCollarGeo,
      bottomUpperChamferGeo: botUpperChamfer,
      bottomFootBevelGeo: footBevel,
      bottomGasketORingGeo: botORingGeo,
      bottomGasketSleeveGeo: botSleeveGeo,
      bottomEmitterGeo: floorEmitGeo,
      spineShaftGeo: spineGeo,
      spineDiscGeo: discGeo,
      spineHubGeo: hubGeo,
      strutGeo: stGeo,
      strutBellySleeveGeo: bellySleeveGeo,
      strutFerruleGeo: ferruleGeo,
      strutAccentRingGeo: stRingGeo,
      spiderArmGeo: sArmGeo,
      plinthButtressGeo: pButtressGeo,
      fastenerGeo: hexGeo,
      fastenerSocketGeo: hexSocketGeo,
      flangeBoltGeo: microBoltGeo,
      bridgeClipGeo: clipGeo,
      statusRingGeo: sRingGeo,
      statusRingMat: sRingMat,
      emitterMat: fEmitMat,
    };
  }, [latheSegments]);

  useEffect(() => {
    return () => {
      topHeadGeo.dispose();
      topCollarTrimGeo.dispose();
      topShoulderBevelGeo.dispose();
      topCrownBezelGeo.dispose();
      topCrownLensGeo.dispose();
      topCrownApertureGeo.dispose();
      topCrownRingGeo.dispose();
      topGasketORingGeo.dispose();
      topGasketSleeveGeo.dispose();
      bottomBaseGeo.dispose();
      bottomCollarTrimGeo.dispose();
      bottomUpperChamferGeo.dispose();
      bottomFootBevelGeo.dispose();
      bottomGasketORingGeo.dispose();
      bottomGasketSleeveGeo.dispose();
      bottomEmitterGeo.dispose();
      spineShaftGeo.dispose();
      spineDiscGeo.dispose();
      spineHubGeo.dispose();
      strutGeo.dispose();
      strutBellySleeveGeo.dispose();
      strutFerruleGeo.dispose();
      strutAccentRingGeo.dispose();
      spiderArmGeo.dispose();
      plinthButtressGeo.dispose();
      fastenerGeo.dispose();
      fastenerSocketGeo.dispose();
      flangeBoltGeo.dispose();
      bridgeClipGeo.dispose();
      statusRingGeo.dispose();
      statusRingMat.dispose();
      emitterMat.dispose();
    };
  }, [
    topHeadGeo,
    topCollarTrimGeo,
    topShoulderBevelGeo,
    topCrownBezelGeo,
    topCrownLensGeo,
    topCrownApertureGeo,
    topCrownRingGeo,
    topGasketORingGeo,
    topGasketSleeveGeo,
    bottomBaseGeo,
    bottomCollarTrimGeo,
    bottomUpperChamferGeo,
    bottomFootBevelGeo,
    bottomGasketORingGeo,
    bottomGasketSleeveGeo,
    bottomEmitterGeo,
    spineShaftGeo,
    spineDiscGeo,
    spineHubGeo,
    strutGeo,
    strutBellySleeveGeo,
    strutFerruleGeo,
    strutAccentRingGeo,
    spiderArmGeo,
    plinthButtressGeo,
    fastenerGeo,
    fastenerSocketGeo,
    flangeBoltGeo,
    bridgeClipGeo,
    statusRingGeo,
    statusRingMat,
    emitterMat,
  ]);

  useEffect(() => {
    const fMesh = fastenerRef.current;
    const sMesh = fastenerSocketRef.current;
    if (fMesh && sMesh) {
      let idx = 0;
      const topR = evalStrutCenterRadius(AETHER_DIMS.strutTopY);
      for (const angle of AETHER_DIMS.strutAngles) {
        // Upper spider clevis cap screw atop strut end
        _pos.set(Math.sin(angle) * topR, 1.396, Math.cos(angle) * topR);
        _quat.identity();
        _mtx.compose(_pos, _quat, _scale);
        fMesh.setMatrixAt(idx, _mtx);
        _pos.set(Math.sin(angle) * topR, 1.404, Math.cos(angle) * topR);
        _mtx.compose(_pos, _quat, _scale);
        sMesh.setMatrixAt(idx, _mtx);
        idx++;

        // Outboard plinth anchor pad cap screw seated squarely on extended buttress pad
        const botBoltR = 1.195;
        _pos.set(Math.sin(angle) * botBoltR, -1.392, Math.cos(angle) * botBoltR);
        _mtx.compose(_pos, _quat, _scale);
        fMesh.setMatrixAt(idx, _mtx);
        _pos.set(Math.sin(angle) * botBoltR, -1.384, Math.cos(angle) * botBoltR);
        _mtx.compose(_pos, _quat, _scale);
        sMesh.setMatrixAt(idx, _mtx);
        idx++;
      }
      fMesh.instanceMatrix.needsUpdate = true;
      fMesh.computeBoundingSphere();
      sMesh.instanceMatrix.needsUpdate = true;
      sMesh.computeBoundingSphere();
    }

    const boltMesh = flangeBoltRef.current;
    if (boltMesh) {
      let bIdx = 0;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + Math.PI / 6;
        const rTop = 0.62;
        _pos.set(Math.sin(angle) * rTop, 1.666, Math.cos(angle) * rTop);
        _quat.identity();
        _mtx.compose(_pos, _quat, _scale);
        boltMesh.setMatrixAt(bIdx++, _mtx);
      }
      boltMesh.instanceMatrix.needsUpdate = true;
      boltMesh.computeBoundingSphere();
    }

    const cMesh = bridgeClipRef.current;
    if (cMesh) {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 + Math.PI / 6;
        const r = AETHER_DIMS.statusRingRadius + 0.022;
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

  const spineElevationAt = (pct: number) =>
    AETHER_DIMS.liquidBottomY + AETHER_DIMS.liquidMaxHeight * pct;

  return (
    <group>
      {/* Compact Stepped Upper Instrument Crown + Chamfer Accents */}
      <mesh geometry={topHeadGeo} material={materials.anodizedTitanium} />
      <mesh
        geometry={topCollarTrimGeo}
        material={materials.satinTitanium}
        position={[0, 1.212, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={topShoulderBevelGeo}
        material={materials.polishedChamferTitanium}
        position={[0, 1.515, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={topCrownBezelGeo}
        material={materials.satinTitanium}
        position={[0, 1.812, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={topCrownApertureGeo}
        material={materials.polishedChamferTitanium}
        position={[0, 1.736, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={topCrownRingGeo}
        material={statusRingMat}
        position={[0, 1.734, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={topCrownLensGeo}
        material={materials.crownSapphire}
        renderOrder={7}
      />

      {/* Neck & Base Viton Elastomer Compression O-Rings + Sleeves */}
      <mesh
        geometry={topGasketSleeveGeo}
        material={materials.gasketElastomer}
        position={[0, 1.22, 0]}
      />
      <mesh
        geometry={topGasketORingGeo}
        material={materials.gasketElastomer}
        position={[0, 1.212, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={bottomGasketSleeveGeo}
        material={materials.gasketElastomer}
        position={[0, -1.202, 0]}
      />
      <mesh
        geometry={bottomGasketORingGeo}
        material={materials.gasketElastomer}
        position={[0, -1.196, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Wide Grounded Aerospace Lower Containment Plinth */}
      <mesh geometry={bottomBaseGeo} material={materials.anodizedTitanium} />
      <mesh
        geometry={bottomCollarTrimGeo}
        material={materials.satinTitanium}
        position={[0, -1.204, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={bottomUpperChamferGeo}
        material={materials.satinTitanium}
        position={[0, -1.504, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={bottomFootBevelGeo}
        material={materials.polishedChamferTitanium}
        position={[0, -1.768, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh
        geometry={bottomEmitterGeo}
        material={emitterMat}
        position={[0, AETHER_DIMS.liquidBottomY - 0.011, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* Subtle Internal Central Optical Telemetry Spine */}
      <group>
        <mesh
          geometry={spineShaftGeo}
          material={materials.strutTitanium}
          position={[0, 0.03, 0]}
        />
        <mesh
          geometry={spineHubGeo}
          material={materials.satinTitanium}
          position={[0, AETHER_DIMS.liquidBottomY + 0.012, 0]}
        />
        <mesh
          geometry={spineHubGeo}
          material={materials.darkRecessMetal}
          position={[0, 1.185, 0]}
          scale={[0.8, 0.85, 0.8]}
        />
        {[0.25, 0.5, 0.75].map((pct) => (
          <mesh
            key={pct}
            geometry={spineDiscGeo}
            material={materials.polishedChamferTitanium}
            position={[0, spineElevationAt(pct), 0]}
          />
        ))}
      </group>

      {/* Recessed Illuminated Energy Status Channel */}
      <mesh
        geometry={statusRingGeo}
        material={statusRingMat}
        position={[0, AETHER_DIMS.statusRingY, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Embedded Contoured Lightguide Titanium Retention Clips */}
      <instancedMesh
        ref={bridgeClipRef}
        args={[bridgeClipGeo, materials.satinTitanium, 6]}
      />

      {/* Three Swept Contoured Aerospace Buttress Rails + Spider Clevis Arms + Plinth Buttresses */}
      {AETHER_DIMS.strutAngles.map((angle, idx) => (
        <group key={idx} rotation={[0, angle, 0]}>
          {/* Curved outboard aerospace strut rail */}
          <mesh geometry={strutGeo} material={materials.strutTitanium} />

          {/* Upper neck ferrule aligned along strut slope */}
          <group
            position={[0, upperFerruleY, upperFerruleR]}
            rotation={[upperFerruleTilt, 0, 0]}
          >
            <mesh geometry={strutFerruleGeo} material={materials.satinTitanium} />
            <mesh
              geometry={strutAccentRingGeo}
              material={materials.polishedChamferTitanium}
              position={[0, 0.042, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
          </group>

          {/* Mid-belly contoured stabilizer clamp */}
          <group
            position={[0, bellySleeveY, bellySleeveR]}
            rotation={[bellySleeveTilt, 0, 0]}
          >
            <mesh geometry={strutBellySleeveGeo} material={materials.satinTitanium} />
            <mesh
              geometry={strutAccentRingGeo}
              material={materials.polishedChamferTitanium}
              position={[0, 0.095, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
            <mesh
              geometry={strutAccentRingGeo}
              material={materials.polishedChamferTitanium}
              position={[0, -0.095, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
          </group>

          {/* Lower plinth ferrule */}
          <group
            position={[0, lowerFerruleY, lowerFerruleR]}
            rotation={[lowerFerruleTilt, 0, 0]}
          >
            <mesh geometry={strutFerruleGeo} material={materials.satinTitanium} />
            <mesh
              geometry={strutAccentRingGeo}
              material={materials.polishedChamferTitanium}
              position={[0, -0.04, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            />
          </group>

          {/* Radial Spider Clevis Arm bridging compact crown to strut top with open negative space */}
          <mesh
            geometry={spiderArmGeo}
            material={materials.satinTitanium}
            position={[0, 1.35, 0.82]}
          />

          {/* Heavy Outboard Plinth Anchor Buttress */}
          <mesh
            geometry={plinthButtressGeo}
            material={materials.satinTitanium}
            position={[0, -1.45, 1.11]}
          />
        </group>
      ))}

      {/* Instanced Socket-Head Cap Fasteners + Hex Recesses + Upper Deck Bolts */}
      <instancedMesh
        ref={fastenerRef}
        args={[fastenerGeo, materials.fastenerSteel, 6]}
      />
      <instancedMesh
        ref={fastenerSocketRef}
        args={[fastenerSocketGeo, materials.darkRecessMetal, 6]}
      />
      <instancedMesh
        ref={flangeBoltRef}
        args={[flangeBoltGeo, materials.fastenerSteel, 6]}
      />
    </group>
  );
}
