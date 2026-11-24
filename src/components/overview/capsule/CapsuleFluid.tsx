import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  AETHER_DIMS,
  computeLiquidHeight,
  evalMeniscusRadius,
} from './capsuleConstants';
import type { AetherRuntimeState } from './capsuleAnimation';

interface CapsuleFluidProps {
  animStateRef: MutableRefObject<AetherRuntimeState>;
  radialSegments: number;
  isLowQuality: boolean;
}

interface FluidUniforms {
  uTime: THREE.IUniform<number>;
  uLiquidBottomY: THREE.IUniform<number>;
  uLiquidHeight: THREE.IUniform<number>;
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
  isLowQuality: boolean,
  initialHeight: number
): FluidUniforms {
  return {
    uTime: { value: 0 },
    uLiquidBottomY: { value: AETHER_DIMS.liquidBottomY },
    uLiquidHeight: { value: initialHeight },
    uEmissiveBoost: { value: 1 },
    uRippleAmp: { value: 1 },
    uLowQuality: { value: isLowQuality ? 1 : 0 },
    uColorDeep: { value: new THREE.Color(deepHex) },
    uColorMid: { value: new THREE.Color(midHex) },
    uColorGlow: { value: new THREE.Color(glowHex) },
  };
}

// Exact GLSL twin of evalFluidOuterRadius(y) in capsuleConstants.ts
const GLSL_FLUID_CONTOUR_FN = `
float evalContouredFluidR(float y) {
  float lowerBelly = smoothstep(-1.20, -0.38, y);
  float upperNeck = smoothstep(-0.32, 0.88, y);
  float rOut = 0.89 + lowerBelly * 0.16 - upperNeck * 0.33;
  return rOut - 0.100;
}
`;

/**
 * Contoured 3-layer bioluminescent electrolyte fluid system:
 * - Dynamically conforms vertex-by-vertex to the sculpted amphora bore without frame allocations
 * - Preserves Beer-Lambert depth absorption core + luminous curved-wall scattering
 * - Dynamically scales concave capillary meniscus radius across belly & tapered neck elevations
 */
export function CapsuleFluid({
  animStateRef,
  radialSegments,
  isLowQuality,
}: CapsuleFluidProps) {
  const meniscusGroupRef = useRef<THREE.Group>(null);
  const initialHeight = computeLiquidHeight(animStateRef.current.currentFill);

  const outerUniforms = useMemo(
    () => createFluidUniforms('#022a30', '#009688', '#28f0d4', isLowQuality, initialHeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLowQuality]
  );
  const coreUniforms = useMemo(
    () => createFluidUniforms('#01191d', '#004d47', '#009682', isLowQuality, initialHeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isLowQuality]
  );
  const meniscusUniforms = useMemo(
    () => createFluidUniforms('#006b5f', '#00b89f', '#7affec', isLowQuality, initialHeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // 48 height rings allow smooth conforming across the S-curve belly-to-neck transition
    const oGeo = new THREE.CylinderGeometry(1, 1, 1, radialSegments, 48, false);
    oGeo.translate(0, 0.5, 0);

    const cGeo = new THREE.CylinderGeometry(
      1,
      1,
      1,
      Math.max(48, Math.floor(radialSegments * 0.75)),
      36,
      false
    );
    cGeo.translate(0, 0.5, 0);

    // Normalized unit-radius concave capillary wetting meniscus (scaled dynamically by evalMeniscusRadius(surfaceY))
    const mt = AETHER_DIMS.meniscusThickness;
    const meniscusProfile: THREE.Vector2[] = [
      new THREE.Vector2(0, -mt * 0.55),
      new THREE.Vector2(0.88, -mt * 0.5),
      new THREE.Vector2(1.0, -mt * 0.14),
      new THREE.Vector2(1.003, mt * 0.74),
      new THREE.Vector2(0.96, mt * 0.34),
      new THREE.Vector2(0.82, mt * 0.08),
      new THREE.Vector2(0.56, mt * 0.04),
      new THREE.Vector2(0.25, mt * 0.07),
      new THREE.Vector2(0, mt * 0.08),
    ];
    const mGeo = new THREE.LatheGeometry(
      meniscusProfile,
      radialSegments,
      Math.PI,
      Math.PI * 2
    );

    // Unit-radius wet specular rim along wall adhesion contact
    const rimGeo = new THREE.TorusGeometry(0.992, 0.0056, 12, radialSegments);

    const oMat = new THREE.MeshPhysicalMaterial({
      color: '#009688',
      metalness: 0,
      roughness: 0.14,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      emissive: new THREE.Color('#009682'),
      emissiveIntensity: 0.62,
      ior: 1.36,
      envMapIntensity: 1.38,
      transparent: true,
      opacity: 0.84,
      depthWrite: false,
    });

    oMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, outerUniforms);

      shader.vertexShader =
        `
        uniform float uLiquidBottomY;
        uniform float uLiquidHeight;
        varying vec3 vFluidLocalPos;
        varying vec3 vFluidWorldObjPos;
        ${GLSL_FLUID_CONTOUR_FN}
        ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `
        #include <beginnormal_vertex>
        float normWorldY = uLiquidBottomY + position.y * uLiquidHeight;
        if (abs(objectNormal.y) < 0.5) {
          float nEps = 0.012;
          float drdy = (evalContouredFluidR(normWorldY + nEps) - evalContouredFluidR(normWorldY - nEps)) / (2.0 * nEps);
          objectNormal = normalize(vec3(objectNormal.x, -drdy, objectNormal.z));
        }
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float worldY = uLiquidBottomY + position.y * uLiquidHeight;
        float rFluid = evalContouredFluidR(worldY);
        transformed.x *= rFluid;
        transformed.z *= rFluid;
        transformed.y = worldY;
        vFluidLocalPos = vec3(position.x * rFluid, position.y, position.z * rFluid);
        vFluidWorldObjPos = transformed;
        `
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
        varying vec3 vFluidWorldObjPos;
        ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        vec3 viewDir = normalize(vViewPosition);
        float ndv = clamp(abs(dot(normalize(normal), viewDir)), 0.0, 1.0);
        float radialRim = pow(1.0 - ndv, 2.35);
        float crispWallEdge = pow(1.0 - ndv, 5.2);
        float hNorm = clamp(vFluidLocalPos.y, 0.0, 1.0);
        float subSurfaceTop = smoothstep(0.72, 1.0, hNorm) * 0.28;

        float caustic = 0.0;
        if (uLowQuality < 0.5) {
          float angle = atan(vFluidLocalPos.z, vFluidLocalPos.x);
          float waveA = sin(vFluidWorldObjPos.y * 5.2 - uTime * 0.72 + angle * 2.0);
          float waveB = cos(vFluidWorldObjPos.y * 8.4 - uTime * 1.1 - angle * 3.0);
          caustic = smoothstep(-0.2, 0.92, 0.5 * (waveA + waveB)) * 0.12;
        } else {
          caustic = smoothstep(-0.2, 0.9, sin(vFluidWorldObjPos.y * 4.6 - uTime * 0.72)) * 0.06;
        }

        vec3 baseAbsorption = mix(uColorDeep, uColorMid, 0.32 + hNorm * 0.44 + subSurfaceTop);
        vec3 scattered = mix(baseAbsorption, uColorGlow, radialRim * 0.54 + caustic + subSurfaceTop * 0.32);

        diffuseColor.rgb = scattered;
        diffuseColor.a = clamp(0.68 + radialRim * 0.22 + crispWallEdge * 0.08 + hNorm * 0.04, 0.64, 0.95);

        vec3 subtleGlow = mix(uColorDeep * 0.28, uColorGlow, 0.22 + radialRim * 0.42 + subSurfaceTop + caustic);
        totalEmissiveRadiance = subtleGlow * uEmissiveBoost;
        `
      );
    };
    oMat.customProgramCacheKey = () => 'aether-fluid-contoured-outer-v4';

    // Deep saturated Beer-Lambert core column sculpted to follow the vessel waist
    const cMat = new THREE.MeshStandardMaterial({
      color: '#022a30',
      metalness: 0,
      roughness: 0.48,
      emissive: new THREE.Color('#006b5f'),
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });

    cMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, coreUniforms);

      shader.vertexShader =
        `
        uniform float uLiquidBottomY;
        uniform float uLiquidHeight;
        varying vec3 vCoreLocalPos;
        varying vec3 vCoreWorldObjPos;
        ${GLSL_FLUID_CONTOUR_FN}
        ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <beginnormal_vertex>',
        `
        #include <beginnormal_vertex>
        float coreHeight = uLiquidHeight * 0.985;
        float normCoreY = uLiquidBottomY + position.y * coreHeight;
        if (abs(objectNormal.y) < 0.5) {
          float cEps = 0.012;
          float cDrdy = ((evalContouredFluidR(normCoreY + cEps) - evalContouredFluidR(normCoreY - cEps)) / (2.0 * cEps)) * ${AETHER_DIMS.fluidCoreFraction.toFixed(2)};
          objectNormal = normalize(vec3(objectNormal.x, -cDrdy, objectNormal.z));
        }
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float cWorldY = uLiquidBottomY + position.y * (uLiquidHeight * 0.985);
        float rCore = evalContouredFluidR(cWorldY) * ${AETHER_DIMS.fluidCoreFraction.toFixed(2)};
        transformed.x *= rCore;
        transformed.z *= rCore;
        transformed.y = cWorldY;
        vCoreLocalPos = vec3(position.x * rCore, position.y, position.z * rCore);
        vCoreWorldObjPos = transformed;
        `
      );

      shader.fragmentShader =
        `
        uniform float uTime;
        uniform float uEmissiveBoost;
        uniform vec3 uColorDeep;
        uniform vec3 uColorMid;
        uniform vec3 uColorGlow;
        varying vec3 vCoreLocalPos;
        varying vec3 vCoreWorldObjPos;
        ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `
        #include <emissivemap_fragment>
        float hNorm = clamp(vCoreLocalPos.y, 0.0, 1.0);
        float ndv = clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0);
        float radialFeather = pow(ndv, 1.55);
        float ribbon = 0.5 + 0.5 * sin(vCoreWorldObjPos.y * 5.6 - uTime * 0.85 + vCoreLocalPos.x * 2.5);
        vec3 deepCore = mix(uColorDeep * 0.72, uColorMid * 0.84, 0.22 + hNorm * 0.36);
        deepCore = mix(deepCore, uColorGlow * 0.76, ribbon * 0.12 * (1.0 - ndv * 0.4));
        diffuseColor.rgb = deepCore;
        diffuseColor.a = clamp(radialFeather * 0.86, 0.0, 0.88);
        totalEmissiveRadiance = deepCore * (0.42 * uEmissiveBoost * radialFeather);
        `
      );
    };
    cMat.customProgramCacheKey = () => 'aether-fluid-contoured-core-v4';

    const mMat = new THREE.MeshPhysicalMaterial({
      color: '#00b89f',
      metalness: 0.02,
      roughness: 0.04,
      emissive: new THREE.Color('#009682'),
      emissiveIntensity: 0.7,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      ior: 1.38,
      reflectivity: 0.95,
      envMapIntensity: 1.82,
      transparent: true,
      opacity: 0.93,
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
        float edgeDamp = smoothstep(0.92, 0.18, rDist);
        transformed.y += sin(rDist * 14.0 - uTime * 1.8) * 0.0022 * edgeDamp * uRippleAmp;
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
        float rad = clamp(length(vMeniscusPos.xz), 0.0, 1.0);
        vec3 surfColor = mix(uColorDeep * 0.92, uColorMid, 0.35 + pow(rad, 1.4) * 0.55);
        surfColor = mix(surfColor, uColorGlow, smoothstep(0.80, 1.0, rad) * 0.62);
        diffuseColor.rgb = surfColor;
        totalEmissiveRadiance = surfColor * ((0.52 + smoothstep(0.80, 1.0, rad) * 0.44) * uEmissiveBoost);
        `
      );
    };
    mMat.customProgramCacheKey = () => 'aether-fluid-contoured-meniscus-v4';

    const rimMat = new THREE.MeshPhysicalMaterial({
      color: '#7affec',
      emissive: new THREE.Color('#009682'),
      emissiveIntensity: 0.72,
      roughness: 0.05,
      clearcoat: 1,
      metalness: 0.04,
      transparent: true,
      opacity: 0.76,
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
    const surfaceY = AETHER_DIMS.liquidBottomY + h;
    const mRad = evalMeniscusRadius(surfaceY);

    if (meniscusGroupRef.current) {
      meniscusGroupRef.current.position.y = surfaceY;
      const meniscusYScale = Math.min(1, Math.max(0.45, h / 0.08));
      meniscusGroupRef.current.scale.set(mRad, meniscusYScale, mRad);
    }

    const boost = s.fluidEmissiveBoost * s.breathFactor;
    const rippleAmp = s.reducedMotion || s.currentFill <= 0.005 ? 0 : 1;

    outerUniforms.uTime.value = s.motionTime;
    outerUniforms.uLiquidHeight.value = h;
    outerUniforms.uEmissiveBoost.value = boost;
    outerUniforms.uColorDeep.value.copy(s.deepColor);
    outerUniforms.uColorMid.value.copy(s.midColor);
    outerUniforms.uColorGlow.value.copy(s.glowColor);

    coreUniforms.uTime.value = s.motionTime;
    coreUniforms.uLiquidHeight.value = h;
    coreUniforms.uEmissiveBoost.value = boost;
    coreUniforms.uColorDeep.value.copy(s.deepColor);
    coreUniforms.uColorMid.value.copy(s.midColor);
    coreUniforms.uColorGlow.value.copy(s.glowColor);

    meniscusUniforms.uTime.value = s.motionTime;
    meniscusUniforms.uLiquidHeight.value = h;
    meniscusUniforms.uRippleAmp.value = rippleAmp;
    meniscusUniforms.uEmissiveBoost.value =
      Math.max(0.12, s.meniscusEmissiveIntensity * 0.88) * s.breathFactor;
    meniscusUniforms.uColorDeep.value.copy(s.deepColor);
    meniscusUniforms.uColorMid.value.copy(s.meniscusSurfaceColor);
    meniscusUniforms.uColorGlow.value.copy(s.meniscusRimColor);

    outerFluidMat.color.copy(s.midColor);
    outerFluidMat.emissive.copy(s.emissiveColor);
    outerFluidMat.opacity = s.fluidOpacity;

    innerCoreMat.color.copy(s.deepColor);
    innerCoreMat.emissive.copy(s.emissiveColor);
    innerCoreMat.opacity = Math.min(0.92, s.fluidOpacity + 0.06);

    meniscusMat.color.copy(s.meniscusSurfaceColor);
    meniscusMat.emissive.copy(s.emissiveColor);
    meniscusMat.emissiveIntensity = s.meniscusEmissiveIntensity * s.breathFactor;
    meniscusMat.opacity = s.currentFill <= 0.005 ? 0.94 : 0.93;

    meniscusRimMat.color.copy(s.meniscusRimColor);
    meniscusRimMat.emissive.copy(s.emissiveColor);
    meniscusRimMat.emissiveIntensity =
      s.meniscusEmissiveIntensity * 0.95 * s.breathFactor;
    meniscusRimMat.opacity = s.currentFill <= 0.005 ? 0.22 : 0.72;
  });

  const initialSurfaceY = AETHER_DIMS.liquidBottomY + initialHeight;
  const initialMeniscusR = evalMeniscusRadius(initialSurfaceY);

  return (
    <group>
      {/* Contoured fluid column conformed analytically in object space */}
      <group>
        <mesh geometry={innerCoreGeo} material={innerCoreMat} renderOrder={1} />
        <mesh geometry={outerFluidGeo} material={outerFluidMat} renderOrder={2} />
      </group>

      {/* Dynamic contoured capillary meniscus anchored to live fluid elevation & bore radius */}
      <group
        ref={meniscusGroupRef}
        position={[0, initialSurfaceY, 0]}
        scale={[initialMeniscusR, 1, initialMeniscusR]}
      >
        <mesh geometry={meniscusGeo} material={meniscusMat} renderOrder={3} />
        <mesh
          geometry={meniscusRimGeo}
          material={meniscusRimMat}
          position={[0, AETHER_DIMS.meniscusThickness * 0.56, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          renderOrder={3}
        />
      </group>
    </group>
  );
}
