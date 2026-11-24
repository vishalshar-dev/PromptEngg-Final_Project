import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  AETHER_DIMS,
  evalChamberInnerRadius,
  evalChamberOuterRadius,
} from './capsuleConstants';
import type { AetherMaterials } from './capsuleMaterials';

interface CapsuleGlassProps {
  materials: AetherMaterials;
  radialSegments: number;
  themeMode: 'light' | 'dark';
}

const PCT_MARKS = [0.25, 0.5, 0.75] as const;
const MINOR_PCT_MARKS = [0.125, 0.375, 0.625, 0.875] as const;

export function CapsuleGlass({
  materials,
  radialSegments,
  themeMode,
}: CapsuleGlassProps) {
  const {
    outerWallGeo,
    innerBoreGeo,
    topEndRimGeo,
    bottomEndRimGeo,
    tickSpecs,
    leftDatumGeo,
    rightDatumGeo,
    majorMarkMat,
    minorMarkMat,
  } = useMemo(() => {
    const yMin = AETHER_DIMS.glassBottomY;
    const yMax = AETHER_DIMS.glassTopY;
    const lipRadius = 0.014;
    const sampleSteps = 44;

    const rBotOut = evalChamberOuterRadius(yMin);
    const rBotIn = evalChamberInnerRadius(yMin);
    const rTopOut = evalChamberOuterRadius(yMax);
    const rTopIn = evalChamberInnerRadius(yMax);

    // Outer optical borosilicate envelope following the contoured belly-to-neck curve
    const outerProfile: THREE.Vector2[] = [
      new THREE.Vector2(rBotIn + lipRadius * 1.1, yMin),
      new THREE.Vector2(rBotOut - lipRadius * 1.2, yMin),
      new THREE.Vector2(rBotOut - lipRadius * 0.45, yMin + 0.004),
    ];

    for (let i = 0; i <= sampleSteps; i++) {
      const t = i / sampleSteps;
      const y = yMin + lipRadius + (yMax - yMin - lipRadius * 2) * t;
      outerProfile.push(new THREE.Vector2(evalChamberOuterRadius(y), y));
    }

    outerProfile.push(
      new THREE.Vector2(rTopOut - lipRadius * 0.45, yMax - 0.004),
      new THREE.Vector2(rTopOut - lipRadius * 1.2, yMax),
      new THREE.Vector2(rTopIn + lipRadius * 1.1, yMax)
    );

    const oWallGeo = new THREE.LatheGeometry(
      outerProfile,
      radialSegments,
      Math.PI,
      Math.PI * 2
    );
    if (oWallGeo.index && oWallGeo.attributes.uv && oWallGeo.attributes.normal) {
      oWallGeo.computeTangents();
    }

    // Concentric contoured inner bore wall showing the full 8.8mm physical wall thickness
    const innerProfile: THREE.Vector2[] = [];
    for (let i = 0; i <= sampleSteps; i++) {
      const t = i / sampleSteps;
      const y = yMin + 0.018 + (yMax - yMin - 0.036) * t;
      innerProfile.push(new THREE.Vector2(evalChamberInnerRadius(y), y));
    }
    const iBoreGeo = new THREE.LatheGeometry(
      innerProfile,
      radialSegments,
      Math.PI,
      Math.PI * 2
    );

    // Separate top neck rim and lower base rim rings matching contoured openings
    const tRimGeo = new THREE.TorusGeometry(
      (evalChamberInnerRadius(yMax - 0.02) + evalChamberOuterRadius(yMax - 0.02)) * 0.5,
      AETHER_DIMS.glassWallThickness * 0.34,
      12,
      radialSegments
    );
    const bRimGeo = new THREE.TorusGeometry(
      (evalChamberInnerRadius(yMin + 0.02) + evalChamberOuterRadius(yMin + 0.02)) * 0.5,
      AETHER_DIMS.glassWallThickness * 0.34,
      12,
      radialSegments
    );

    // Curved laser-etched volumetric sight-glass ticks conforming to local outer radius
    const yAtPct = (pct: number) =>
      AETHER_DIMS.liquidBottomY + AETHER_DIMS.liquidMaxHeight * pct;

    const specs: Array<{
      pct: number;
      y: number;
      isMajor: boolean;
      geo: THREE.TorusGeometry;
    }> = [];

    for (const pct of PCT_MARKS) {
      const y = yAtPct(pct);
      const r = evalChamberOuterRadius(y) + AETHER_DIMS.markWallOffset;
      const is50 = pct === 0.5;
      const arc = is50 ? 0.27 : 0.175;
      const geo = new THREE.TorusGeometry(r, is50 ? 0.003 : 0.0024, 8, 26, arc);
      geo.rotateX(Math.PI / 2);
      geo.rotateY(arc / 2 - Math.PI / 2);
      specs.push({ pct, y, isMajor: true, geo });
    }

    for (const pct of MINOR_PCT_MARKS) {
      const y = yAtPct(pct);
      const r = evalChamberOuterRadius(y) + AETHER_DIMS.markWallOffset;
      const arc = 0.088;
      const geo = new THREE.TorusGeometry(r, 0.0018, 6, 14, arc);
      geo.rotateX(Math.PI / 2);
      geo.rotateY(arc / 2 - Math.PI / 2);
      specs.push({ pct, y, isMajor: false, geo });
    }

    // Twin curved vertical sight-gauge datum hairlines hugging the glass silhouette
    const buildDatumSpline = (azimuth: number) => {
      const pts: THREE.Vector3[] = [];
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const y = -1.04 + 2.08 * (i / steps);
        const r = evalChamberOuterRadius(y) + AETHER_DIMS.markWallOffset;
        pts.push(new THREE.Vector3(Math.sin(azimuth) * r, y, Math.cos(azimuth) * r));
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.0019, 6, false);
    };

    const lDatumGeo = buildDatumSpline(-0.165);
    const rDatumGeo = buildDatumSpline(0.165);

    const majMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      emissive: new THREE.Color('#334155'),
      emissiveIntensity: 0.2,
      metalness: 0.78,
      roughness: 0.24,
      transparent: true,
      opacity: 0.88,
    });

    const minMat = new THREE.MeshStandardMaterial({
      color: '#64748b',
      metalness: 0.65,
      roughness: 0.32,
      transparent: true,
      opacity: 0.58,
    });

    return {
      outerWallGeo: oWallGeo,
      innerBoreGeo: iBoreGeo,
      topEndRimGeo: tRimGeo,
      bottomEndRimGeo: bRimGeo,
      tickSpecs: specs,
      leftDatumGeo: lDatumGeo,
      rightDatumGeo: rDatumGeo,
      majorMarkMat: majMat,
      minorMarkMat: minMat,
    };
  }, [radialSegments]);

  useEffect(() => {
    const isDark = themeMode === 'dark';
    majorMarkMat.color.set(isDark ? '#a8b8cc' : '#3d4c63');
    majorMarkMat.emissive.set(isDark ? '#64748b' : '#1e293b');
    majorMarkMat.emissiveIntensity = isDark ? 0.28 : 0.08;
    minorMarkMat.color.set(isDark ? '#8a9ab0' : '#4d5d75');
  }, [themeMode, majorMarkMat, minorMarkMat]);

  useEffect(() => {
    return () => {
      outerWallGeo.dispose();
      innerBoreGeo.dispose();
      topEndRimGeo.dispose();
      bottomEndRimGeo.dispose();
      tickSpecs.forEach((s) => s.geo.dispose());
      leftDatumGeo.dispose();
      rightDatumGeo.dispose();
      majorMarkMat.dispose();
      minorMarkMat.dispose();
    };
  }, [
    outerWallGeo,
    innerBoreGeo,
    topEndRimGeo,
    bottomEndRimGeo,
    tickSpecs,
    leftDatumGeo,
    rightDatumGeo,
    majorMarkMat,
    minorMarkMat,
  ]);

  return (
    <group>
      {/* Inner Borosilicate Wall Edge (shows true 8.8mm contoured glass thickness) */}
      <mesh
        geometry={innerBoreGeo}
        material={materials.opticalGlassInner}
        renderOrder={4}
      />

      {/* Polished Top Neck & Lower Base Chamfered Glass Termination Rims */}
      <mesh
        geometry={topEndRimGeo}
        material={materials.glassEndRim}
        position={[0, AETHER_DIMS.glassTopY - 0.02, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={5}
      />
      <mesh
        geometry={bottomEndRimGeo}
        material={materials.glassEndRim}
        position={[0, AETHER_DIMS.glassBottomY + 0.02, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        renderOrder={5}
      />

      {/* Outer Contoured Optical-Grade Borosilicate Chamber */}
      <mesh
        geometry={outerWallGeo}
        material={materials.opticalGlassOuter}
        renderOrder={6}
      />

      {/* Contoured Laser-Etched Sight-Glass Graduations */}
      {tickSpecs.map((tick) => (
        <mesh
          key={tick.pct}
          geometry={tick.geo}
          material={tick.isMajor ? majorMarkMat : minorMarkMat}
          position={[0, tick.y, 0]}
          renderOrder={8}
        />
      ))}

      {/* Twin Curved Sight-Gauge Datum Splines */}
      <mesh
        geometry={leftDatumGeo}
        material={minorMarkMat}
        renderOrder={8}
      />
      <mesh
        geometry={rightDatumGeo}
        material={minorMarkMat}
        renderOrder={8}
      />
    </group>
  );
}
