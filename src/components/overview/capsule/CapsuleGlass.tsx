import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { AETHER_DIMS } from './capsuleConstants';
import type { AetherMaterials } from './capsuleMaterials';

interface CapsuleGlassProps {
  materials: AetherMaterials;
  radialSegments: number;
}

export function CapsuleGlass({ materials, radialSegments }: CapsuleGlassProps) {
  const {
    chamberWallGeo,
    specularSleeveGeo,
    majorMarkGeo,
    standardMarkGeo,
    minorMarkGeo,
    datumBracketGeo,
    majorMarkMat,
    minorMarkMat,
  } = useMemo(() => {
    const rIn = AETHER_DIMS.glassInnerRadius;
    const rOut = AETHER_DIMS.glassOuterRadius;
    const halfH = AETHER_DIMS.glassHalfHeight;
    const straightOff = 0.045;
    const lipRadius = 0.014;

    // Closed thick-walled borosilicate profile with rounded polished optical chamfers
    // and subtle end-collar seating steps where the titanium viton seals clamp the glass.
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(rIn, -halfH + straightOff),
      new THREE.Vector2(rIn, -halfH + lipRadius),
      new THREE.Vector2(rIn + lipRadius * 0.6, -halfH + 0.003),
      new THREE.Vector2(rIn + lipRadius * 1.4, -halfH),
      new THREE.Vector2(rOut - lipRadius * 1.4, -halfH),
      new THREE.Vector2(rOut - lipRadius * 0.6, -halfH + 0.003),
      new THREE.Vector2(rOut, -halfH + lipRadius),
      new THREE.Vector2(rOut, -halfH + straightOff),

      new THREE.Vector2(rOut, halfH - straightOff),
      new THREE.Vector2(rOut, halfH - lipRadius),
      new THREE.Vector2(rOut - lipRadius * 0.6, halfH - 0.003),
      new THREE.Vector2(rOut - lipRadius * 1.4, halfH),
      new THREE.Vector2(rIn + lipRadius * 1.4, halfH),
      new THREE.Vector2(rIn + lipRadius * 0.6, halfH - 0.003),
      new THREE.Vector2(rIn, halfH - lipRadius),
      new THREE.Vector2(rIn, halfH - straightOff),
      new THREE.Vector2(rIn, -halfH + straightOff),
    ];

    const wallGeo = new THREE.LatheGeometry(profile, radialSegments, Math.PI, Math.PI * 2);

    // Dedicated open outer specular sleeve so studio vertical softboxes gleam across front glass
    const sleeveGeo = new THREE.CylinderGeometry(
      rOut + 0.002,
      rOut + 0.002,
      AETHER_DIMS.glassHeight - 0.08,
      radialSegments,
      1,
      true
    );

    // Front-facing curved laser-etched sight-glass graduations centered at +Z
    const mr = AETHER_DIMS.markRadius;
    const majorArc = 0.3;
    const stdArc = 0.2;
    const minArc = 0.09;

    const majGeo = new THREE.TorusGeometry(mr, 0.0055, 8, 28, majorArc);
    majGeo.rotateX(Math.PI / 2);
    majGeo.rotateY(majorArc / 2 - Math.PI / 2);

    const stdGeo = new THREE.TorusGeometry(mr, 0.0046, 8, 24, stdArc);
    stdGeo.rotateX(Math.PI / 2);
    stdGeo.rotateY(stdArc / 2 - Math.PI / 2);

    const minGeo = new THREE.TorusGeometry(mr, 0.0032, 8, 14, minArc);
    minGeo.rotateX(Math.PI / 2);
    minGeo.rotateY(minArc / 2 - Math.PI / 2);

    // Delicate vertical sight-line hairlines flanking the primary scale
    const bracketGeo = new THREE.CylinderGeometry(0.003, 0.003, 1.96, 8);

    const majMat = new THREE.MeshStandardMaterial({
      color: '#8e9eb3',
      emissive: new THREE.Color('#475569'),
      emissiveIntensity: 0.34,
      metalness: 0.76,
      roughness: 0.22,
      transparent: true,
      opacity: 0.92,
    });

    const minMat = new THREE.MeshStandardMaterial({
      color: '#7a8a9e',
      metalness: 0.66,
      roughness: 0.3,
      transparent: true,
      opacity: 0.64,
    });

    return {
      chamberWallGeo: wallGeo,
      specularSleeveGeo: sleeveGeo,
      majorMarkGeo: majGeo,
      standardMarkGeo: stdGeo,
      minorMarkGeo: minGeo,
      datumBracketGeo: bracketGeo,
      majorMarkMat: majMat,
      minorMarkMat: minMat,
    };
  }, [radialSegments]);

  useEffect(() => {
    return () => {
      chamberWallGeo.dispose();
      specularSleeveGeo.dispose();
      majorMarkGeo.dispose();
      standardMarkGeo.dispose();
      minorMarkGeo.dispose();
      datumBracketGeo.dispose();
      majorMarkMat.dispose();
      minorMarkMat.dispose();
    };
  }, [
    chamberWallGeo,
    specularSleeveGeo,
    majorMarkGeo,
    standardMarkGeo,
    minorMarkGeo,
    datumBracketGeo,
    majorMarkMat,
    minorMarkMat,
  ]);

  const yAtPct = (pct: number) =>
    AETHER_DIMS.liquidBottomY + AETHER_DIMS.liquidMaxHeight * pct;

  const bracketAngle = 0.19;
  const bracketX = Math.sin(bracketAngle) * AETHER_DIMS.markRadius;
  const bracketZ = Math.cos(bracketAngle) * AETHER_DIMS.markRadius;

  return (
    <group>
      {/* Hollow Thick Optical Glass Chamber */}
      <mesh
        geometry={chamberWallGeo}
        material={materials.opticalGlass}
        renderOrder={4}
      />

      {/* Crisp Studio Softbox Specular Coat */}
      <mesh
        geometry={specularSleeveGeo}
        material={materials.glassSpecularCoat}
        renderOrder={7}
      />

      {/* Precision Front Sight-Glass Graduations (25%, 50%, 75%) */}
      <mesh
        geometry={standardMarkGeo}
        material={majorMarkMat}
        position={[0, yAtPct(0.25), 0]}
        renderOrder={8}
      />
      <mesh
        geometry={majorMarkGeo}
        material={majorMarkMat}
        position={[0, yAtPct(0.5), 0]}
        renderOrder={8}
      />
      <mesh
        geometry={standardMarkGeo}
        material={majorMarkMat}
        position={[0, yAtPct(0.75), 0]}
        renderOrder={8}
      />

      {/* Intermediate Hairline Ticks */}
      {[0.125, 0.375, 0.625, 0.875].map((pct) => (
        <mesh
          key={pct}
          geometry={minorMarkGeo}
          material={minorMarkMat}
          position={[0, yAtPct(pct), 0]}
          renderOrder={8}
        />
      ))}

      {/* Twin Vertical Sight-Gauge Reference Hairlines */}
      <mesh
        geometry={datumBracketGeo}
        material={minorMarkMat}
        position={[-bracketX, 0, bracketZ]}
        renderOrder={8}
      />
      <mesh
        geometry={datumBracketGeo}
        material={minorMarkMat}
        position={[bracketX, 0, bracketZ]}
        renderOrder={8}
      />
    </group>
  );
}
