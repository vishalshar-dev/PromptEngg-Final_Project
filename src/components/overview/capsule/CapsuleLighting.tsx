import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import type { QualityProfile } from './capsuleConstants';
import type { AetherRuntimeState } from './capsuleAnimation';

interface CapsuleLightingProps {
  profile: QualityProfile;
  isSoftwareGl: boolean;
  animStateRef: MutableRefObject<AetherRuntimeState>;
}

let rectLightsInitialized = false;

export function CapsuleLighting({
  profile,
  isSoftwareGl,
  animStateRef,
}: CapsuleLightingProps) {
  const keyRectRef = useRef<THREE.RectAreaLight>(null);
  const rimRectRef = useRef<THREE.RectAreaLight>(null);
  const lowerLightRef = useRef<THREE.PointLight>(null);
  const coreLightRef = useRef<THREE.PointLight>(null);

  const enableRectArea = profile.useRectAreaLights && !isSoftwareGl;

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

  useFrame(() => {
    const s = animStateRef.current;
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
      <hemisphereLight args={['#dceafe', '#1f2c42', 0.48]} />

      {/* Controlled Warm Studio Key Light */}
      <directionalLight
        position={[-4.5, 6.5, 5.2]}
        intensity={1.42}
        color="#fff6e8"
      />

      {/* Secondary Cool Fill */}
      <directionalLight
        position={[-5.2, -1.5, 3.8]}
        intensity={0.5}
        color="#bfd9ff"
      />

      {/* Strong Restrained Rim Backlight */}
      <directionalLight
        position={[4.8, 4.6, -4.5]}
        intensity={1.32}
        color="#c2e4ff"
      />

      {/* GPU Studio Softbox Area Lights */}
      {enableRectArea && (
        <>
          <rectAreaLight
            ref={keyRectRef}
            width={2.6}
            height={6.5}
            intensity={4.2}
            color="#fff7ec"
            position={[-4.2, 1.4, 3.8]}
          />
          <rectAreaLight
            ref={rimRectRef}
            width={2.0}
            height={6.0}
            intensity={3.4}
            color="#cbe5ff"
            position={[4.4, 1.2, -2.8]}
          />
        </>
      )}

      {/* Dynamic Internal Liquid Illumination responding to budget health */}
      <pointLight
        ref={lowerLightRef}
        position={[0, -0.7, 0]}
        intensity={1.35}
        distance={4.4}
        decay={2}
        color="#00f5d4"
      />
      <pointLight
        ref={coreLightRef}
        position={[0, 0.25, 0]}
        intensity={0.65}
        distance={3.8}
        decay={2}
        color="#1fffe2"
      />

      {/* Procedural High-Contrast Studio Softbox Environment (Zero External 404/HDR Fetch) */}
      <Environment
        resolution={profile.envResolution}
        frames={1}
        environmentIntensity={0.82}
      >
        {/* Tall vertical warm softbox strip for curved glass & strut reflections */}
        <Lightformer
          form="rect"
          intensity={3.0}
          color="#fff6ea"
          position={[-4.8, 1.8, 4.0]}
          scale={[1.4, 9.5, 1]}
          target={[0, 0, 0]}
        />
        {/* Tall cool specular strip along right optical glass edge */}
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#cbe5ff"
          position={[5.0, 1.6, 3.0]}
          scale={[1.0, 9.0, 1]}
          target={[0, 0, 0]}
        />
        {/* Front-upper & front-lower studio cards illuminating chamfered titanium bevels */}
        <Lightformer
          form="rect"
          intensity={1.45}
          color="#f8fafc"
          position={[0, 3.8, 5.2]}
          scale={[8.5, 2.2, 1]}
          target={[0, 1.4, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.25}
          color="#dbeafe"
          position={[0, -3.1, 5.2]}
          scale={[8.5, 2.0, 1]}
          target={[0, -1.5, 0]}
        />
        {/* Overhead circular studio diffuser for top sapphire crown */}
        <Lightformer
          form="ring"
          intensity={1.85}
          color="#e8f3ff"
          position={[0, 6.2, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={5.4}
        />
        {/* Rear rim panel */}
        <Lightformer
          form="rect"
          intensity={2.0}
          color="#bae6fd"
          position={[3.2, 4.0, -5.2]}
          scale={[6, 6, 1]}
          target={[0, 0, 0]}
        />
        {/* Subtle studio horizon band */}
        <Lightformer
          form="rect"
          intensity={0.95}
          color="#94a3b8"
          position={[0, 0.3, -6.5]}
          scale={[14, 2.2, 1]}
          target={[0, 0, 0]}
        />
        {/* Studio floor bounce */}
        <Lightformer
          form="rect"
          intensity={0.55}
          color="#1e293b"
          position={[0, -5.2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[14, 14, 1]}
        />
      </Environment>

      {/* Grounded Studio Contact Shadow */}
      <ContactShadows
        position={[0, -1.94, 0]}
        opacity={0.48}
        scale={6.4}
        blur={2.15}
        far={4}
        frames={1}
        resolution={profile.shadowResolution}
        color="#070b13"
      />
    </>
  );
}
