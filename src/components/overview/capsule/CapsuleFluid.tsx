import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AETHER_DIMS, computeLiquidHeight } from './capsuleConstants';
import type { AetherRuntimeState } from './capsuleAnimation';

interface CapsuleFluidProps {
  animStateRef: MutableRefObject<AetherRuntimeState>;
  radialSegments: number;
  isLowQuality: boolean;
}

interface FluidUniforms {
  uTime: THREE.IUniform<number>;
  uEmissiveBoost: THREE.IUniform<number>;
  uRippleAmp: THREE.IUniform<number>;
  uLowQuality: THREE.IUniform<number>;
  uColorDeep: THREE.IUniform<THREE.Color>;
  uColorMid: THREE.IUniform<THREE.Color>;
  uColorGlow: THREE.IUniform<THREE.Color>;
}

function createFluidUniforms(
  deepHex: string,
  midHex: string,
  glowHex: string,
  isLowQuality: boolean
): FluidUniforms {
  return {
    uTime: { value: 0 },
    uEmissiveBoost: { value: 1 },
    uRippleAmp: { value: 1 },
    uLowQuality: { value: isLowQuality ? 1 : 0 },
    uColorDeep: { value: new THREE.Color(deepHex) },
    uColorMid: { value: new THREE.Color(midHex) },
    uColorGlow: { value: new THREE.Color(glowHex) },
  };
}

/**
 * Dynamic layered bioluminescent energy fluid system:
 * - Bottom-pivoted unit-height geometry scaled smoothly in useFrame (zero geometry rebuilds)
 * - Custom GLSL Beer-Lambert depth absorption, Fresnel rim luminance & gentle caustic waves
 * - Contoured capillary meniscus anchored dynamically to the live liquid top surface
 */
export function CapsuleFluid({
  animStateRef,
  radialSegments,
  isLowQuality,
}: CapsuleFluidProps) {
  const columnGroupRef = useRef<THREE.Group>(null);
  const meniscusGroupRef = useRef<THREE.Group>(null);

  const outerUniforms = useMemo(
    () => createFluidUniforms('#01383c', '#00bfa5', '#34ffe3', isLowQuality),
    [isLowQuality]
  );
  const coreUniforms = useMemo(
    () => createFluidUniforms('#012327', '#00887a', '#00f5d4', isLowQuality),
    [isLowQuality]
  );
  const meniscusUniforms = useMemo(
    () => createFluidUniforms('#009f8c', '#19f5d8', '#a6fff1', isLowQuality),
    [isLowQuality]
  );

  const {
    outerFluidGeo,
    innerCoreGeo,
    meniscusGeo,
    meniscusRimGeo,
    outerFluidMat,
    innerCoreMat,
    meniscusMat,
    meniscusRimMat,
  } = useMemo(() => {
    const oGeo = new THREE.CylinderGeometry(
      AETHER_DIMS.liquidRadius,
      AETHER_DIMS.liquidRadius,
      1,
      radialSegments,
      16,
      false
    );
    oGeo.translate(0, 0.5, 0);

    const cGeo = new THREE.CylinderGeometry(
      AETHER_DIMS.liquidCoreRadius,
      AETHER_DIMS.liquidCoreRadius,
      1,
      Math.max(48, Math.floor(radialSegments * 0.75)),
      12,
      false
    );
    cGeo.translate(0, 0.5, 0);

    const mr = AETHER_DIMS.meniscusRadius;
    const mt = AETHER_DIMS.meniscusThickness;
    const meniscusProfile: THREE.Vector2[] = [
      new THREE.Vector2(0, -mt * 0.58),
      new THREE.Vector2(mr * 0.86, -mt * 0.54),
      new THREE.Vector2(mr, -mt * 0.22),
      new THREE.Vector2(mr, mt * 0.62),
      new THREE.Vector2(mr * 0.94, mt * 0.38),
      new THREE.Vector2(mr * 0.76, mt * 0.14),
      new THREE.Vector2(mr * 0.48, mt * 0.16),
      new THREE.Vector2(mr * 0.2, mt * 0.21),
      new THREE.Vector2(0, mt * 0.22),
    ];
    const mGeo = new THREE.LatheGeometry(
      meniscusProfile,
      radialSegments,
      Math.PI,
      Math.PI * 2
    );

    const rimGeo = new THREE.TorusGeometry(mr - 0.01, 0.011, 14, radialSegments);

    const oMat = new THREE.MeshPhysicalMaterial({
      color: '#00f5d4',
      metalness: 0,
      roughness: 0.22,
      emissive: new THREE.Color('#00b89c'),
      emissiveIntensity: 0.85,
      ior: 1.36,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    oMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, outerUniforms);

      shader.vertexShader = `varying vec3 vFluidLocalPos;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvFluidLocalPos = position;`
      );

      shader.fragmentShader =
        `
        uniform float uTime;
        uniform float uEmissiveBoost;
        uniform float uLowQuality;
        uniform vec3 uColorDeep;
        uniform vec3 uColorMid;
        uniform vec3 uColorGlow;
        varying vec3 vFluidLocalPos;
        ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        vec3 viewDir = normalize(vViewPosition);
        float ndv = abs(dot(normalize(normal), viewDir));
        float fresnel = pow(1.0 - ndv, 2.2);
        float hNorm = clamp(vFluidLocalPos.y, 0.0, 1.0);
        float caustic = 0.0;
        if (uLowQuality < 0.5) {
          float angle = atan(vFluidLocalPos.z, vFluidLocalPos.x);
          float waveA = sin(vFluidLocalPos.y * 9.5 - uTime * 0.9 + angle * 2.0);
          float waveB = cos(vFluidLocalPos.y * 15.0 - uTime * 1.35 - angle * 3.0);
          caustic = smoothstep(-0.3, 0.9, 0.5 * (waveA + waveB)) * 0.14;
        } else {
          caustic = smoothstep(-0.2, 0.9, sin(vFluidLocalPos.y * 8.0 - uTime * 0.85)) * 0.07;
        }

        vec3 bodyTint = mix(uColorDeep, uColorMid, 0.35 + hNorm * 0.55);
        bodyTint = mix(bodyTint, uColorGlow, fresnel * 0.52 + caustic);

        diffuseColor.rgb = bodyTint;
        diffuseColor.a = clamp(0.64 + (1.0 - ndv) * 0.24 + hNorm * 0.06, 0.58, 0.90);
        totalEmissiveRadiance = mix(uColorDeep * 0.45, uColorGlow, 0.28 + hNorm * 0.38 + fresnel * 0.30 + caustic) * uEmissiveBoost;
        `
      );
    };
    oMat.customProgramCacheKey = () => 'aether-fluid-outer-v2';

    const cMat = new THREE.MeshStandardMaterial({
      color: '#033c40',
      metalness: 0,
      roughness: 0.42,
      emissive: new THREE.Color('#00d4b8'),
      emissiveIntensity: 0.92,
      transparent: true,
      opacity: 0.74,
      depthWrite: false,
    });

    cMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, coreUniforms);

      shader.vertexShader = `varying vec3 vCoreLocalPos;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvCoreLocalPos = position;`
      );

      shader.fragmentShader =
        `
        uniform float uTime;
        uniform float uEmissiveBoost;
        uniform vec3 uColorDeep;
        uniform vec3 uColorMid;
        uniform vec3 uColorGlow;
        varying vec3 vCoreLocalPos;
        ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        float hNorm = clamp(vCoreLocalPos.y, 0.0, 1.0);
        float ribbon = 0.5 + 0.5 * sin(vCoreLocalPos.y * 11.0 - uTime * 1.1 + vCoreLocalPos.x * 3.0);
        vec3 coreLum = mix(uColorDeep, uColorMid, 0.35 + hNorm * 0.55);
        coreLum = mix(coreLum, uColorGlow, ribbon * 0.24 + pow(hNorm, 2.0) * 0.35);
        diffuseColor.rgb = coreLum;
        totalEmissiveRadiance = coreLum * (0.95 * uEmissiveBoost);
        `
      );
    };
    cMat.customProgramCacheKey = () => 'aether-fluid-core-v2';

    const mMat = new THREE.MeshPhysicalMaterial({
      color: '#00e6c6',
      metalness: 0.04,
      roughness: 0.07,
      emissive: new THREE.Color('#00b89c'),
      emissiveIntensity: 1.15,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      ior: 1.38,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });

    mMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, meniscusUniforms);

      shader.vertexShader =
        `uniform float uTime;\nuniform float uRippleAmp;\nvarying vec3 vMeniscusPos;\n` +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float rDist = length(position.xz);
        float edgeDamp = smoothstep(0.88, 0.2, rDist);
        transformed.y += sin(rDist * 14.0 - uTime * 2.1) * 0.0032 * edgeDamp * uRippleAmp;
        vMeniscusPos = transformed;
        `
      );

      shader.fragmentShader =
        `
        uniform float uEmissiveBoost;
        uniform vec3 uColorDeep;
        uniform vec3 uColorMid;
        uniform vec3 uColorGlow;
        varying vec3 vMeniscusPos;
        ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        float rad = clamp(length(vMeniscusPos.xz) / ${AETHER_DIMS.meniscusRadius.toFixed(3)}, 0.0, 1.0);
        vec3 surfColor = mix(uColorDeep, uColorMid, 0.4 + rad * 0.5);
        surfColor = mix(surfColor, uColorGlow, smoothstep(0.72, 1.0, rad) * 0.7);
        diffuseColor.rgb = surfColor;
        totalEmissiveRadiance = surfColor * ((0.9 + smoothstep(0.75, 1.0, rad) * 0.45) * uEmissiveBoost);
        `
      );
    };
    mMat.customProgramCacheKey = () => 'aether-fluid-meniscus-v2';

    const rimMat = new THREE.MeshStandardMaterial({
      color: '#42ffe4',
      emissive: new THREE.Color('#00b89c'),
      emissiveIntensity: 1.35,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });

    return {
      outerFluidGeo: oGeo,
      innerCoreGeo: cGeo,
      meniscusGeo: mGeo,
      meniscusRimGeo: rimGeo,
      outerFluidMat: oMat,
      innerCoreMat: cMat,
      meniscusMat: mMat,
      meniscusRimMat: rimMat,
    };
  }, [radialSegments, outerUniforms, coreUniforms, meniscusUniforms]);

  useEffect(() => {
    return () => {
      outerFluidGeo.dispose();
      innerCoreGeo.dispose();
      meniscusGeo.dispose();
      meniscusRimGeo.dispose();
      outerFluidMat.dispose();
      innerCoreMat.dispose();
      meniscusMat.dispose();
      meniscusRimMat.dispose();
    };
  }, [
    outerFluidGeo,
    innerCoreGeo,
    meniscusGeo,
    meniscusRimGeo,
    outerFluidMat,
    innerCoreMat,
    meniscusMat,
    meniscusRimMat,
  ]);

  useFrame(() => {
    const s = animStateRef.current;
    const h = computeLiquidHeight(s.currentFill);

    if (columnGroupRef.current) {
      columnGroupRef.current.scale.set(1, h, 1);
    }

    if (meniscusGroupRef.current) {
      meniscusGroupRef.current.position.y = AETHER_DIMS.liquidBottomY + h;
      const meniscusYScale = Math.min(1, Math.max(0.45, h / 0.08));
      meniscusGroupRef.current.scale.set(1, meniscusYScale, 1);
    }

    const boost = s.fluidEmissiveBoost * s.breathFactor;
    const rippleAmp = s.reducedMotion || s.currentFill <= 0.005 ? 0 : 1;

    outerUniforms.uTime.value = s.motionTime;
    outerUniforms.uEmissiveBoost.value = boost;
    outerUniforms.uColorDeep.value.copy(s.deepColor);
    outerUniforms.uColorMid.value.copy(s.midColor);
    outerUniforms.uColorGlow.value.copy(s.glowColor);

    coreUniforms.uTime.value = s.motionTime;
    coreUniforms.uEmissiveBoost.value = boost;
    coreUniforms.uColorDeep.value.copy(s.deepColor);
    coreUniforms.uColorMid.value.copy(s.midColor);
    coreUniforms.uColorGlow.value.copy(s.glowColor);

    meniscusUniforms.uTime.value = s.motionTime;
    meniscusUniforms.uRippleAmp.value = rippleAmp;
    meniscusUniforms.uEmissiveBoost.value =
      Math.max(0.14, s.meniscusEmissiveIntensity * 0.85) * s.breathFactor;
    meniscusUniforms.uColorDeep.value.copy(s.deepColor);
    meniscusUniforms.uColorMid.value.copy(s.meniscusSurfaceColor);
    meniscusUniforms.uColorGlow.value.copy(s.meniscusRimColor);

    outerFluidMat.color.copy(s.mainColor);
    outerFluidMat.emissive.copy(s.emissiveColor);
    outerFluidMat.opacity = s.fluidOpacity;

    innerCoreMat.color.copy(s.deepColor);
    innerCoreMat.emissive.copy(s.emissiveColor);
    innerCoreMat.opacity = Math.min(0.88, s.fluidOpacity + 0.05);

    meniscusMat.color.copy(s.meniscusSurfaceColor);
    meniscusMat.emissive.copy(s.emissiveColor);
    meniscusMat.emissiveIntensity = s.meniscusEmissiveIntensity * s.breathFactor;
    meniscusMat.opacity = s.currentFill <= 0.005 ? 0.94 : 0.92;

    meniscusRimMat.color.copy(s.meniscusRimColor);
    meniscusRimMat.emissive.copy(s.emissiveColor);
    meniscusRimMat.emissiveIntensity =
      s.meniscusEmissiveIntensity * 1.18 * s.breathFactor;
    meniscusRimMat.opacity = s.currentFill <= 0.005 ? 0.25 : 0.88;
  });

  const initialHeight = computeLiquidHeight(animStateRef.current.currentFill);

  return (
    <group>
      {/* Bottom-pivoted fluid column scaled smoothly along Y */}
      <group
        ref={columnGroupRef}
        position={[0, AETHER_DIMS.liquidBottomY, 0]}
        scale={[1, initialHeight, 1]}
      >
        <mesh
          geometry={innerCoreGeo}
          material={innerCoreMat}
          scale={[1, 0.985, 1]}
          renderOrder={1}
        />
        <mesh geometry={outerFluidGeo} material={outerFluidMat} renderOrder={2} />
      </group>

      {/* Contoured capillary liquid meniscus anchored to live fluid surface */}
      <group
        ref={meniscusGroupRef}
        position={[0, AETHER_DIMS.liquidBottomY + initialHeight, 0]}
      >
        <mesh geometry={meniscusGeo} material={meniscusMat} renderOrder={3} />
        <mesh
          geometry={meniscusRimGeo}
          material={meniscusRimMat}
          position={[0, AETHER_DIMS.meniscusThickness * 0.44, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          renderOrder={3}
        />
      </group>
    </group>
  );
}
