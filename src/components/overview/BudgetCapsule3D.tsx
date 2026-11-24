import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import {
  AETHER_DIMS,
  ALL_VISUAL_PALETTES,
  clampFillRatio,
  QUALITY_PROFILES,
  resolveHealthState,
  resolveQualityTier,
  resolveVisualMode,
  type CapsuleQualityTier,
  type CapsuleVisualState,
  type QualityProfile,
} from './capsule/capsuleConstants';
import {
  CapsuleScene,
  type CapsuleSceneControlsHandle,
} from './capsule/CapsuleScene';

export interface CapsuleQualityInfo {
  tier: CapsuleQualityTier;
  label: string;
  isSoftwareGl: boolean;
  webglSupported: boolean;
}

export interface BudgetCapsule3DProps {
  className?: string;
  minHeight?: number | string;
  themeMode?: 'light' | 'dark';
  quality?: CapsuleQualityTier | 'auto';
  fillRatio?: number;
  visualState?: CapsuleVisualState;
  reducedMotion?: boolean;
  forceFallback?: boolean;
  embedded?: boolean;
  showStageHeader?: boolean;
  ariaLabel?: string;
  onQualityResolved?: (info: CapsuleQualityInfo) => void;
}

interface WebGLCapabilitiesProbe {
  supported: boolean;
  isSoftwareGl: boolean;
}

function probeWebGLCapabilities(): WebGLCapabilitiesProbe {
  if (typeof document === 'undefined') {
    return { supported: false, isSoftwareGl: true };
  }

  try {
    const probeCanvas = document.createElement('canvas');
    const gl =
      (probeCanvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (probeCanvas.getContext('webgl') as WebGLRenderingContext | null);

    if (!gl) {
      return { supported: false, isSoftwareGl: true };
    }

    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererParam = debugExt ? debugExt.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpuName = String(gl.getParameter(rendererParam) ?? '');
    const isSoftwareGl =
      /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpuName);

    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { supported: true, isSoftwareGl };
  } catch {
    return { supported: false, isSoftwareGl: true };
  }
}

function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setPrefersReduced(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return prefersReduced;
}

/* -------------------------------------------------------------------------- */
/* Error Boundary & Safe Fallback UI                                          */
/* -------------------------------------------------------------------------- */

interface CapsuleErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface CapsuleErrorBoundaryState {
  hasError: boolean;
}

class CapsuleErrorBoundary extends Component<
  CapsuleErrorBoundaryProps,
  CapsuleErrorBoundaryState
> {
  state: CapsuleErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): CapsuleErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // Isolates WebGL errors cleanly without impacting the host dashboard.
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function CapsuleFallback({
  reason = 'WebGL rendering is unavailable on this device.',
  themeMode = 'dark',
  fillRatio = AETHER_DIMS.staticHealthyFill,
  visualState = 'normal',
  embedded = false,
}: {
  reason?: string;
  themeMode?: 'light' | 'dark';
  fillRatio?: number;
  visualState?: CapsuleVisualState;
  embedded?: boolean;
}) {
  const isDark = themeMode === 'dark';
  const clamped = visualState === 'normal' ? clampFillRatio(fillRatio) : 0;
  const pct = Math.round(clamped * 100);
  const mode = resolveVisualMode(clamped, visualState);
  const palette = ALL_VISUAL_PALETTES[mode];
  const isStandby = visualState !== 'normal';

  const statusHeadline =
    visualState === 'unconfigured'
      ? 'Budget Not Configured'
      : visualState === 'invalid'
        ? 'Financial Data Unavailable'
        : `Capsule Safe View · ${pct}% ${palette.label}`;

  return (
    <div
      data-testid="budget-capsule-fallback"
      role="status"
      className={`w-full h-full flex flex-col items-center justify-center gap-4 px-5 py-5 transition-colors ${
        embedded
          ? isDark
            ? 'text-[#f3f6fc]'
            : 'text-[#0f172a]'
          : isDark
            ? 'min-h-[340px] rounded-[18px] border bg-[#0b1019] border-[#22293b] text-[#f3f6fc]'
            : 'min-h-[340px] rounded-[18px] border bg-[#edf2f8] border-[#d5dbe5] text-[#0f172a]'
      }`}
    >
      <div className="relative flex flex-col items-center" aria-hidden="true">
        <div className="w-14 h-2.5 rounded-t-lg bg-gradient-to-b from-[#475569] to-[#1e2634] border border-white/15 shadow-sm" />
        <div
          className={`relative w-[72px] h-28 sm:h-32 border-x overflow-hidden flex flex-col justify-end p-1.5 ${
            isDark
              ? 'bg-[#070b14]/90 border-white/20'
              : 'bg-[#111827]/90 border-[#334155]/40'
          }`}
        >
          <div
            className="w-full rounded-md transition-all duration-500"
            style={{
              height: `${Math.max(3, pct)}%`,
              background: `linear-gradient(to top, ${palette.deepHex}, ${palette.midHex}, ${palette.mainHex})`,
              opacity: mode === 'depleted' || isStandby ? 0.72 : 0.92,
              boxShadow:
                mode === 'depleted' || isStandby
                  ? 'none'
                  : `0 0 18px ${palette.emissiveHex}66`,
            }}
          />
          <div className="pointer-events-none absolute inset-y-2 left-1.5 w-1.5 rounded-full bg-white/20" />
        </div>
        <div className="w-16 h-3 rounded-b-lg bg-gradient-to-b from-[#252f40] to-[#12161f] border border-white/10 shadow-md" />
      </div>

      <div className="w-full max-w-[220px] space-y-1.5 text-center">
        <p className="text-[11px] font-semibold tracking-wide uppercase opacity-80">
          {statusHeadline}
        </p>
        <div
          className={`w-full h-1.5 rounded-full overflow-hidden ${
            isDark ? 'bg-[#171d2d]' : 'bg-[#dbe2ee]'
          }`}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor: palette.mainHex,
            }}
          />
        </div>
        <p className="text-[11px] opacity-70 leading-relaxed">{reason}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Canvas Mount                                                               */
/* -------------------------------------------------------------------------- */

function AetherCanvas({
  profile,
  isSoftwareGl,
  isActive,
  fillRatio,
  visualState,
  reducedMotion,
  controlsHandleRef,
  onSceneReady,
  onContextLost,
}: {
  profile: QualityProfile;
  isSoftwareGl: boolean;
  isActive: boolean;
  fillRatio: number;
  visualState: CapsuleVisualState;
  reducedMotion: boolean;
  controlsHandleRef: MutableRefObject<CapsuleSceneControlsHandle | null>;
  onSceneReady: () => void;
  onContextLost: () => void;
}) {
  const cleanupRef = useRef<(() => void) | null>(null);
  const readyRafRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (readyRafRef.current) {
        window.cancelAnimationFrame(readyRafRef.current);
      }
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  const demandMode =
    profile.demandFrameloop ||
    isSoftwareGl ||
    !isActive ||
    reducedMotion ||
    visualState !== 'normal';

  return (
    <Canvas
      key={isSoftwareGl ? 'sw' : 'hw'}
      dpr={profile.dpr}
      camera={{ position: [2.45, 1.44, 7.22], fov: 35 }}
      gl={{
        antialias: profile.antialias,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      frameloop={demandMode ? 'demand' : 'always'}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        gl.outputColorSpace = THREE.SRGBColorSpace;

        const canvasEl = gl.domElement;
        const handleLost = (event: Event) => {
          event.preventDefault();
          onContextLost();
        };
        canvasEl.addEventListener('webglcontextlost', handleLost, false);
        cleanupRef.current = () => {
          canvasEl.removeEventListener('webglcontextlost', handleLost, false);
        };

        readyRafRef.current = window.requestAnimationFrame(() => {
          onSceneReady();
        });
      }}
    >
      <CapsuleScene
        profile={profile}
        isSoftwareGl={isSoftwareGl}
        isActive={isActive}
        fillRatio={fillRatio}
        visualState={visualState}
        reducedMotion={reducedMotion}
        controlsHandleRef={controlsHandleRef}
      />
    </Canvas>
  );
}

/* -------------------------------------------------------------------------- */
/* Public Project Aether Component                                            */
/* -------------------------------------------------------------------------- */

export function BudgetCapsule3D({
  className = '',
  minHeight,
  themeMode = 'dark',
  quality = 'auto',
  fillRatio = AETHER_DIMS.staticHealthyFill,
  visualState = 'normal',
  reducedMotion: reducedMotionProp,
  forceFallback = false,
  embedded = false,
  showStageHeader = true,
  ariaLabel,
  onQualityResolved,
}: BudgetCapsule3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsHandleRef = useRef<CapsuleSceneControlsHandle | null>(null);

  const [{ supported, isSoftwareGl }] = useState<WebGLCapabilitiesProbe>(() =>
    probeWebGLCapabilities()
  );
  const osReducedMotion = usePrefersReducedMotion();
  const effectiveReducedMotion = reducedMotionProp ?? osReducedMotion;

  const [contextLost, setContextLost] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const [isNarrowViewport, setIsNarrowViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      setIsNarrowViewport(window.innerWidth < 640);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsInView(entry.isIntersecting);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleContextLost = useCallback(() => {
    setContextLost(true);
  }, []);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  const resolvedTier = useMemo(
    () =>
      resolveQualityTier({
        requested: quality,
        isSoftwareGl,
        isNarrowViewport,
        devicePixelRatio:
          typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      }),
    [quality, isSoftwareGl, isNarrowViewport]
  );

  const clampedFill = visualState === 'normal' ? clampFillRatio(fillRatio) : 0;
  const healthState = resolveHealthState(clampedFill);
  const visualMode = resolveVisualMode(clampedFill, visualState);
  const profile = QUALITY_PROFILES[resolvedTier];
  const isDark = themeMode === 'dark';
  const showFallback = forceFallback || !supported || contextLost;
  const isActive = isInView && isPageVisible;

  useEffect(() => {
    onQualityResolved?.({
      tier: profile.tier,
      label: profile.label,
      isSoftwareGl,
      webglSupported: supported && !contextLost && !forceFallback,
    });
  }, [
    onQualityResolved,
    profile.tier,
    profile.label,
    isSoftwareGl,
    supported,
    contextLost,
    forceFallback,
  ]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (showFallback || !controlsHandleRef.current) return;
    const step = 0.22;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        controlsHandleRef.current.nudgeOrbit(-step, 0);
        break;
      case 'ArrowRight':
        e.preventDefault();
        controlsHandleRef.current.nudgeOrbit(step, 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        controlsHandleRef.current.nudgeOrbit(0, -step * 0.65);
        break;
      case 'ArrowDown':
        e.preventDefault();
        controlsHandleRef.current.nudgeOrbit(0, step * 0.65);
        break;
      case 'r':
      case 'R':
      case '0':
        e.preventDefault();
        controlsHandleRef.current.resetView();
        break;
      default:
        break;
    }
  };

  const resolvedMinHeight =
    minHeight !== undefined ? minHeight : embedded ? undefined : 340;

  const fallbackNode = (
    <CapsuleFallback
      embedded={embedded}
      themeMode={themeMode}
      fillRatio={clampedFill}
      visualState={visualState}
      reason={
        forceFallback
          ? 'Safe mode preview active.'
          : contextLost
            ? 'Graphics context interrupted. Static capsule view active.'
            : 'WebGL is unavailable on this browser. Static capsule view active.'
      }
    />
  );

  const stageSurfaceClass = embedded
    ? isDark
      ? 'rounded-[16px] bg-[radial-gradient(ellipse_at_50%_46%,#182032_0%,#0f1420_66%,#0a0e17_100%)] ring-1 ring-inset ring-white/[0.06]'
      : 'rounded-[16px] bg-[radial-gradient(ellipse_at_50%_46%,#f4f7fc_0%,#e7edf7_68%,#dde5f2_100%)] ring-1 ring-inset ring-black/[0.04]'
    : isDark
      ? 'min-h-[340px] rounded-[20px] border bg-[radial-gradient(ellipse_at_50%_42%,#212a3b_0%,#111622_58%,#090c14_100%)] border-[#232b3d]'
      : 'min-h-[340px] rounded-[20px] border bg-[radial-gradient(ellipse_at_50%_42%,#f8fafd_0%,#e7edf7_64%,#d8e1f0_100%)] border-[#d5dbe5]';

  const defaultAriaLabel =
    visualState === 'unconfigured'
      ? '3D budget capsule on standby: no monthly budget configured.'
      : visualState === 'invalid'
        ? '3D budget capsule on standby: financial data unavailable.'
        : `3D budget capsule at ${Math.round(clampedFill * 100)}% fill (${ALL_VISUAL_PALETTES[visualMode].label}). Use arrow keys to rotate or R to reset view.`;

  return (
    <div
      ref={containerRef}
      data-testid="budget-capsule-container"
      data-webgl-supported={String(supported && !contextLost && !forceFallback)}
      data-quality-tier={profile.tier}
      data-fill-pct={String(Math.round(clampedFill * 100))}
      data-health-state={healthState}
      data-capsule-mode={visualMode}
      data-reduced-motion={String(effectiveReducedMotion)}
      data-scene-ready={String(sceneReady)}
      role={!showFallback ? 'img' : undefined}
      aria-roledescription={!showFallback ? 'Interactive 3D budget capsule' : undefined}
      aria-label={!showFallback ? ariaLabel ?? defaultAriaLabel : undefined}
      tabIndex={!showFallback ? 0 : undefined}
      onKeyDown={handleKeyDown}
      style={resolvedMinHeight !== undefined ? { minHeight: resolvedMinHeight } : undefined}
      className={`relative w-full h-full overflow-hidden select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#365FE8] focus-visible:ring-offset-1 ${stageSurfaceClass} ${className}`}
    >
      {showStageHeader ? (
        <div className="pointer-events-none absolute inset-x-4 top-3.5 z-10 flex items-center justify-between">
          <span
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide border ${
              isDark
                ? 'bg-[#111622]/85 border-[#29334a] text-[#cbd5e1]'
                : 'bg-white/85 border-[#d5dbe5] text-[#475569]'
            }`}
          >
            {visualState === 'unconfigured'
              ? 'No Budget Set'
              : visualState === 'invalid'
                ? 'Data Unavailable'
                : 'Aether Capsule'}
          </span>
          {!showFallback && (
            <span
              className={`px-2 py-1 rounded-lg text-[10.5px] font-medium ${
                isDark ? 'text-[#8b96aa]' : 'text-[#64748b]'
              }`}
            >
              Drag to orbit
            </span>
          )}
        </div>
      ) : (
        !showFallback && (
          <div className="pointer-events-none absolute bottom-2.5 right-3 z-10">
            <span
              className={`text-[11px] font-medium ${
                isDark ? 'text-[#94a3b8]' : 'text-[#526075]'
              }`}
            >
              Drag to rotate
            </span>
          </div>
        )
      )}

      {/* Subtle optical chamber silhouette shown only during initial WebGL context boot */}
      {!showFallback && !sceneReady && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            className={`w-16 h-32 rounded-xl border ${
              isDark
                ? 'border-white/10 bg-white/[0.03]'
                : 'border-slate-900/10 bg-slate-900/[0.03]'
            }`}
          />
        </div>
      )}

      {/* Dedicated WebGL Viewport */}
      <div
        data-testid="budget-capsule-canvas-host"
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
          showFallback || sceneReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {showFallback ? (
          fallbackNode
        ) : (
          <CapsuleErrorBoundary fallback={fallbackNode}>
            <Suspense
              fallback={
                <CapsuleFallback
                  embedded={embedded}
                  themeMode={themeMode}
                  fillRatio={clampedFill}
                  visualState={visualState}
                  reason="Initializing optical chamber…"
                />
              }
            >
              <AetherCanvas
                profile={profile}
                isSoftwareGl={isSoftwareGl}
                isActive={isActive}
                fillRatio={clampedFill}
                visualState={visualState}
                reducedMotion={effectiveReducedMotion}
                controlsHandleRef={controlsHandleRef}
                onSceneReady={handleSceneReady}
                onContextLost={handleContextLost}
              />
            </Suspense>
          </CapsuleErrorBoundary>
        )}
      </div>
    </div>
  );
}

export default BudgetCapsule3D;
