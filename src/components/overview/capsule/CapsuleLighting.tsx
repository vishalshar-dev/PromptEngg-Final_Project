import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { QualityProfile } from './capsuleConstants';
import type { AetherRuntimeState } from './capsuleAnimation';

interface CapsuleLightingProps {
  profile: QualityProfile;
  isSoftwareGl: boolean;
  themeMode: 'light' | 'dark';
  isInteracting: boolean;
  animStateRef: MutableRefObject<AetherRuntimeState>;
}

let rectLightsInitialized = false;

const _hemiSkyLight = new THREE.Color('#f1f5f9');
const _hemiSkyDark = new THREE.Color('#dceafe');
const _hemiGroundLight = new THREE.Color('#475569');
const _hemiGroundDark = new THREE.Color('#263348');

export function CapsuleLighting({
  profile,
  isSoftwareGl,
  themeMode,
  isInteracting,
  animStateRef,
}: CapsuleLightingProps) {
  const { scene, invalidate } = useThree();
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const keyDirRef = useRef<THREE.DirectionalLight>(null);
  const rimDirRef = useRef<THREE.DirectionalLight>(null);
  const keyRectRef = useRef<THREE.RectAreaLight>(null);
  const rimRectRef = useRef<THREE.RectAreaLight>(null);
  const lowerLightRef = useRef<THREE.PointLight>(null);
  const coreLightRef = useRef<THREE.PointLight>(null);

  const interactionBoostRef = useRef(0);
  const themeFactorRef = useRef(themeMode === 'dark' ? 1 : 0);

  const enableRectArea = profile.useRectAreaLights && !isSoftwareGl;
  const isDark = themeMode === 'dark';

  useEffect(() => {
    if (enableRectArea && !rectLightsInitialized) {
      RectAreaLightUniformsLib.init();
      rectLightsInitialized = true;
    }
  }, [enableRectArea]);

  useEffect(() => {
    if (keyRectRef.current) keyRectRef.current.lookAt(0, 0.2, 0);
    if (rimRectRef.current) rimRectRef.current.lookAt(0, 0, 0);
  }, [enableRectArea]);

  useFrame((_, delta) => {
    const s = animStateRef.current;
    const dt = Math.min(Math.max(delta, 0.001), 0.16);
    const smoothRate = s.reducedMotion ? 16 : 8.5;
    const alpha = 1 - Math.exp(-smoothRate * dt);

    // Smoothly transition theme factor without rebuilding Environment PMREM cubemap
    const targetTheme = isDark ? 1 : 0;
    const targetInteract = isInteracting && !s.reducedMotion ? 1 : 0;

    if (s.reducedMotion) {
      themeFactorRef.current = targetTheme;
      interactionBoostRef.current = targetInteract;
    } else {
      if (Math.abs(targetTheme - themeFactorRef.current) < 0.005) {
        themeFactorRef.current = targetTheme;
      } else {
        themeFactorRef.current += (targetTheme - themeFactorRef.current) * alpha;
        invalidate();
      }

      if (Math.abs(targetInteract - interactionBoostRef.current) < 0.005) {
        interactionBoostRef.current = targetInteract;
      } else {
        interactionBoostRef.current += (targetInteract - interactionBoostRef.current) * alpha;
        invalidate();
      }
    }

    const tf = themeFactorRef.current;
    const interactMul = 1 + interactionBoostRef.current * 0.12;

    if (hemiRef.current) {
      hemiRef.current.color.copy(_hemiSkyLight).lerp(_hemiSkyDark, tf);
      hemiRef.current.groundColor.copy(_hemiGroundLight).lerp(_hemiGroundDark, tf);
      hemiRef.current.intensity = THREE.MathUtils.lerp(0.62, 0.52, tf);
    }

    if (keyDirRef.current) {
      keyDirRef.current.intensity = THREE.MathUtils.lerp(1.38, 1.5, tf) * interactMul;
    }
    if (rimDirRef.current) {
      rimDirRef.current.intensity = THREE.MathUtils.lerp(1.18, 1.45, tf) * interactMul;
    }
    if (keyRectRef.current) {
      keyRectRef.current.intensity = 4.0 * interactMul;
    }
    if (rimRectRef.current) {
      rimRectRef.current.intensity = 3.2 * interactMul;
    }

    if ('environmentIntensity' in scene) {
      scene.environmentIntensity = THREE.MathUtils.lerp(0.88, 0.94, tf) * (1 + interactionBoostRef.current * 0.08);
    }

    if (lowerLightRef.current) {
      lowerLightRef.current.color.copy(s.lightColor);
      lowerLightRef.current.intensity = s.lightIntensity * s.breathFactor;
    }
    if (coreLightRef.current) {
      coreLightRef.current.color.copy(s.lightColor);
      coreLightRef.current.intensity = s.coreLightIntensity * s.breathFactor;
    }
  });

  return (
    <>
      <hemisphereLight
        ref={hemiRef}
        args={['#dceafe', '#263348', isDark ? 0.52 : 0.62]}
      />

      {/* Primary Controlled Warm Studio Key Light */}
      <directionalLight
        ref={keyDirRef}
        position={[-4.2, 6.2, 5.4]}
        intensity={isDark ? 1.5 : 1.38}
        color="#fff6e8"
      />

      {/* Secondary Cool Fill Light */}
      <directionalLight
        position={[-5.0, -1.2, 4.2]}
        intensity={isDark ? 0.62 : 0.56}
        color="#c6dfff"
      />

      {/* Rim Backlight Separating Titanium & Borosilicate Silhouette */}
      <directionalLight
        ref={rimDirRef}
        position={[4.8, 4.4, -4.4]}
        intensity={isDark ? 1.45 : 1.18}
        color="#cce8ff"
      />

      {/* Low Front Bounce Filling Under-Bevel Fasteners & Yoke Clamps */}
      <directionalLight
        position={[1.8, -3.5, 4.5]}
        intensity={isDark ? 0.42 : 0.34}
        color="#d4e2f4"
      />

      {/* GPU Studio Softbox Area Lights */}
      {enableRectArea && (
        <>
          <rectAreaLight
            ref={keyRectRef}
            width={2.6}
            height={6.5}
            intensity={4.0}
            color="#fff7ec"
            position={[-4.2, 1.4, 3.8]}
          />
          <rectAreaLight
            ref={rimRectRef}
            width={2.0}
            height={6.0}
            intensity={3.2}
            color="#cbe5ff"
            position={[4.4, 1.2, -2.8]}
          />
        </>
      )}

      {/* Restrained Dynamic Internal Liquid Illumination (centered in belly & mid neck) */}
      <pointLight
        ref={lowerLightRef}
        position={[0, -0.58, 0]}
        intensity={0.96}
        distance={4.2}
        decay={2}
        color="#00f5d4"
      />
      <pointLight
        ref={coreLightRef}
        position={[0, 0.28, 0]}
        intensity={0.42}
        distance={3.6}
        decay={2}
        color="#1fffe2"
      />

      {/* Static Wraparound Studio Cyclorama (Zero Cubemap Rebuilds on Theme Switch) */}
      <Environment
        resolution={profile.envResolution}
        frames={1}
        environmentIntensity={0.91}
      >
        {/* Continuous neutral studio room enclosure so metals never reflect dead black voids */}
        <mesh scale={30}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshBasicMaterial color="#3c4b61" side={THREE.BackSide} />
        </mesh>

        {/* Broad vertical warm softbox key strip for smooth brushed metal & curved glass gradients */}
        <Lightformer
          form="rect"
          intensity={3.4}
          color="#fff8ef"
          position={[-4.8, 1.5, 4.2]}
          scale={[2.2, 10.6, 1]}
          target={[0, 0, 0]}
        />
        {/* Crisp adjacent dark negative-fill flag creating authentic studio metallic edge break */}
        <Lightformer
          form="rect"
          intensity={0.04}
          color="#06090f"
          position={[-2.05, 0.5, 5.4]}
          scale={[0.85, 10.0, 1]}
          target={[0, 0, 0]}
        />
        {/* Broad cool specular fill strip along right edge */}
        <Lightformer
          form="rect"
          intensity={3.0}
          color="#d5eaff"
          position={[4.9, 1.4, 3.4]}
          scale={[1.55, 10.0, 1]}
          target={[0, 0, 0]}
        />
        {/* Secondary right negative-fill card */}
        <Lightformer
          form="rect"
          intensity={0.05}
          color="#080c14"
          position={[2.5, 0.2, 5.2]}
          scale={[0.8, 9.5, 1]}
          target={[0, 0, 0]}
        />
        {/* Front-upper & front-lower studio cards illuminating chamfered titanium bevels */}
        <Lightformer
          form="rect"
          intensity={1.75}
          color="#f8fafc"
          position={[0, 3.6, 5.2]}
          scale={[8.5, 2.4, 1]}
          target={[0, 1.4, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.55}
          color="#dbeafe"
          position={[0, -3.1, 5.2]}
          scale={[8.5, 2.2, 1]}
          target={[0, -1.5, 0]}
        />
        {/* Overhead circular studio diffuser for top sapphire crown */}
        <Lightformer
          form="ring"
          intensity={2.1}
          color="#eef6ff"
          position={[0, 6.0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={5.4}
        />
        {/* Rear rim panel */}
        <Lightformer
          form="rect"
          intensity={2.2}
          color="#c5e6ff"
          position={[3.2, 3.8, -5.2]}
          scale={[6.5, 6.5, 1]}
          target={[0, 0, 0]}
        />
        {/* Soft studio horizon bounce */}
        <Lightformer
          form="rect"
          intensity={1.1}
          color="#94a3b8"
          position={[0, 0.2, -6.5]}
          scale={[15, 2.8, 1]}
          target={[0, 0, 0]}
        />
        {/* Studio deck bounce */}
        <Lightformer
          form="rect"
          intensity={0.72}
          color="#334155"
          position={[0, -5.2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[14, 14, 1]}
        />
      </Environment>

      {/* Grounded Studio Contact Shadow */}
      <ContactShadows
        position={[0, -1.78, 0]}
        opacity={isDark ? 0.58 : 0.44}
        scale={6.2}
        blur={2.15}
        far={4}
        frames={1}
        resolution={profile.shadowResolution}
        color="#0b101b"
      />
    </>
  );
}
