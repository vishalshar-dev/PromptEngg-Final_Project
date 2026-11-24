import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type MutableRefObject,
} from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  clampFillRatio,
  type CapsuleVisualState,
  type QualityProfile,
} from './capsuleConstants';
import {
  createAetherRuntimeState,
  stepAetherRuntimeState,
  type AetherRuntimeState,
} from './capsuleAnimation';
import { createAetherMaterials } from './capsuleMaterials';
import { CapsuleLighting } from './CapsuleLighting';
import { CapsuleTitanium } from './CapsuleTitanium';
import { CapsuleFluid } from './CapsuleFluid';
import { CapsuleParticles } from './CapsuleParticles';
import { CapsuleGlass } from './CapsuleGlass';

export interface CapsuleSceneControlsHandle {
  nudgeOrbit: (deltaAzimuth: number, deltaPolar: number) => void;
  resetView: () => void;
}

interface CapsuleSceneProps {
  profile: QualityProfile;
  isSoftwareGl: boolean;
  isActive: boolean;
  fillRatio: number;
  visualState?: CapsuleVisualState;
  reducedMotion: boolean;
  controlsHandleRef?: MutableRefObject<CapsuleSceneControlsHandle | null>;
}

const DEFAULT_CAMERA_DIRECTION = new THREE.Vector3(2.45, 1.44, 7.22).normalize();
const _offsetVec = new THREE.Vector3();
const _spherical = new THREE.Spherical();

/**
 * Leaf tick component mounted first in scene tree so runtime physics/color damping
 * runs before all sibling subsystems read animStateRef in the same frame.
 */
function AetherEngineTick({
  animStateRef,
  isTransitioningRef,
  isActive,
}: {
  animStateRef: MutableRefObject<AetherRuntimeState>;
  isTransitioningRef: MutableRefObject<boolean>;
  isActive: boolean;
}) {
  useFrame(({ clock }, delta) => {
    if (!isActive) return;
    isTransitioningRef.current = stepAetherRuntimeState(
      animStateRef.current,
      delta,
      clock.getElapsedTime()
    );
  });
  return null;
}

function SoftwareGlPacer({
  enabled,
  isActive,
  animStateRef,
  isTransitioningRef,
  fillRatio,
  visualState,
  reducedMotion,
}: {
  enabled: boolean;
  isActive: boolean;
  animStateRef: MutableRefObject<AetherRuntimeState>;
  isTransitioningRef: MutableRefObject<boolean>;
  fillRatio: number;
  visualState: CapsuleVisualState;
  reducedMotion: boolean;
}) {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    if (isActive) {
      invalidate();
    }
  }, [fillRatio, visualState, reducedMotion, isActive, invalidate]);

  useEffect(() => {
    if (!enabled || !isActive) return;

    let cancelled = false;
    let timerId = 0;

    const scheduleNext = () => {
      if (cancelled || document.hidden) return;
      const s = animStateRef.current;
      const effectiveTarget = s.visualState === 'normal' ? s.targetFill : 0;
      const needsFrames =
        (!s.reducedMotion && s.visualState === 'normal') ||
        isTransitioningRef.current ||
        Math.abs(effectiveTarget - s.currentFill) >= 0.0004;

      if (!needsFrames) {
        timerId = window.setTimeout(scheduleNext, 160);
        return;
      }

      const context = gl.getContext() as WebGL2RenderingContext;
      const hasFence =
        typeof context.fenceSync === 'function' &&
        typeof context.getSyncParameter === 'function';

      if (hasFence) {
        const sync = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
        context.flush();
        const poll = () => {
          if (cancelled) {
            if (sync) context.deleteSync(sync);
            return;
          }
          const status = sync
            ? context.getSyncParameter(sync, context.SYNC_STATUS)
            : context.SIGNALED;
          if (status === context.UNSIGNALED) {
            timerId = window.setTimeout(poll, 8);
          } else {
            if (sync) context.deleteSync(sync);
            const activeSwap =
              isTransitioningRef.current ||
              Math.abs(animStateRef.current.targetFill - animStateRef.current.currentFill) >= 0.001;
            timerId = window.setTimeout(() => {
              if (!cancelled && !document.hidden) {
                invalidate();
                scheduleNext();
              }
            }, activeSwap ? 45 : 75);
          }
        };
        timerId = window.setTimeout(poll, 8);
      } else {
        const activeSwap =
          isTransitioningRef.current ||
          Math.abs(animStateRef.current.targetFill - animStateRef.current.currentFill) >= 0.001;
        timerId = window.setTimeout(() => {
          if (!cancelled && !document.hidden) {
            invalidate();
            scheduleNext();
          }
        }, activeSwap ? 48 : 78);
      }
    };

    const handleVisibilityResume = () => {
      if (!cancelled && !document.hidden) {
        window.clearTimeout(timerId);
        invalidate();
        scheduleNext();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityResume);
    invalidate();
    scheduleNext();

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityResume);
    };
  }, [enabled, isActive, gl, invalidate, animStateRef, isTransitioningRef]);

  return null;
}

function ResponsiveCamera() {
  const { camera, size, invalidate } = useThree();

  useEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const baseDist = 7.75;
    const targetDist = aspect < 1.05 ? baseDist / Math.max(aspect * 0.94, 0.64) : baseDist;
    const currentDist = camera.position.length() || baseDist;

    if (Math.abs(currentDist - targetDist) > 0.05) {
      camera.position.setLength(targetDist);
      camera.updateProjectionMatrix();
      invalidate();
    }
  }, [camera, size.width, size.height, invalidate]);

  return null;
}

export function CapsuleScene({
  profile,
  isSoftwareGl,
  isActive,
  fillRatio,
  visualState = 'normal',
  reducedMotion,
  controlsHandleRef,
}: CapsuleSceneProps) {
  const { camera, gl, invalidate } = useThree();
  const orbitRef = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [initialRuntime] = useState(() =>
    createAetherRuntimeState(fillRatio, reducedMotion, visualState)
  );
  const animStateRef = useRef<AetherRuntimeState>(initialRuntime);
  const isTransitioningRef = useRef<boolean>(false);

  useEffect(() => {
    animStateRef.current.targetFill = clampFillRatio(fillRatio);
    animStateRef.current.visualState = visualState;
    animStateRef.current.reducedMotion = reducedMotion;
    invalidate();
  }, [fillRatio, visualState, reducedMotion, invalidate]);

  // Allow native vertical page scrolling on mobile touch screens while preserving horizontal orbit drag
  useEffect(() => {
    const domElement = gl.domElement;
    domElement.style.touchAction = 'pan-y';
  }, [gl]);

  // Expose lightweight keyboard orbit & view reset controls to the stage container
  useEffect(() => {
    if (!controlsHandleRef) return;
    controlsHandleRef.current = {
      nudgeOrbit: (deltaAzimuth: number, deltaPolar: number) => {
        const controls = orbitRef.current;
        if (!controls) return;
        _offsetVec.copy(camera.position).sub(controls.target);
        _spherical.setFromVector3(_offsetVec);
        _spherical.theta += deltaAzimuth;
        _spherical.phi = THREE.MathUtils.clamp(
          _spherical.phi + deltaPolar,
          Math.PI * 0.22,
          Math.PI * 0.64
        );
        _offsetVec.setFromSpherical(_spherical);
        camera.position.copy(controls.target).add(_offsetVec);
        controls.update();
        invalidate();
      },
      resetView: () => {
        const controls = orbitRef.current;
        if (!controls) return;
        const dist = camera.position.length() || 7.75;
        camera.position.copy(DEFAULT_CAMERA_DIRECTION).multiplyScalar(dist);
        controls.target.set(0, 0, 0);
        controls.update();
        invalidate();
      },
    };
    return () => {
      controlsHandleRef.current = null;
    };
  }, [controlsHandleRef, camera, invalidate]);

  const materials = useMemo(
    () => createAetherMaterials(profile, isSoftwareGl),
    [profile, isSoftwareGl]
  );

  useEffect(() => {
    return () => {
      materials.dispose();
    };
  }, [materials]);

  const useDemandLoop =
    profile.demandFrameloop ||
    isSoftwareGl ||
    !isActive ||
    reducedMotion ||
    visualState !== 'normal';

  return (
    <>
      <AetherEngineTick
        animStateRef={animStateRef}
        isTransitioningRef={isTransitioningRef}
        isActive={isActive}
      />
      <ResponsiveCamera />
      <CapsuleLighting
        profile={profile}
        isSoftwareGl={isSoftwareGl}
        animStateRef={animStateRef}
      />

      <Float
        speed={reducedMotion || !isActive ? 0 : 1.2}
        rotationIntensity={reducedMotion || !isActive ? 0 : 0.045}
        floatIntensity={reducedMotion || !isActive ? 0 : 0.13}
      >
        <group position={[0, 0.1, 0]}>
          <CapsuleTitanium
            materials={materials}
            latheSegments={profile.latheSegments}
            animStateRef={animStateRef}
          />
          <CapsuleFluid
            animStateRef={animStateRef}
            radialSegments={profile.latheSegments}
            isLowQuality={profile.tier === 'low' || isSoftwareGl}
          />
          <CapsuleParticles
            count={profile.particleCount}
            animStateRef={animStateRef}
          />
          <CapsuleGlass
            materials={materials}
            radialSegments={profile.latheSegments}
          />
        </group>
      </Float>

      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableZoom={false}
        enablePan={false}
        enableRotate
        enableDamping={!isSoftwareGl && !reducedMotion}
        dampingFactor={0.06}
        rotateSpeed={0.65}
        minPolarAngle={Math.PI * 0.22}
        maxPolarAngle={Math.PI * 0.64}
      />

      <SoftwareGlPacer
        enabled={useDemandLoop}
        isActive={isActive}
        animStateRef={animStateRef}
        isTransitioningRef={isTransitioningRef}
        fillRatio={fillRatio}
        visualState={visualState}
        reducedMotion={reducedMotion}
      />
    </>
  );
}
