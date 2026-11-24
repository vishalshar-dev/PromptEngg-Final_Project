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
      className={`w-full h-full flex flex-col items-center justify-center gap-4 px-5 py-5 transition-colors duration-300 text-[var(--text-primary)] ${
        embedded
          ? ''
          : 'min-h-[340px] rounded-[18px] border border-[var(--border-subtle)] bg-[var(--bg-well)]'
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
        <p className="text-[11px] font-semibold tracking-wide uppercase text-[var(--text-tertiary)]">
          {statusHeadline}
        </p>
        <div
          className="w-full h-1.5 rounded-full overflow-hidden bg-[var(--bg-subtle)]"
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
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{reason}</p>
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
  themeMode,
  fillRatio,
  visualState,
  reducedMotion,
  controlsHandleRef,
  onOrbitedChange,
  onSceneReady,
  onContextLost,
}: {
  profile: QualityProfile;
  isSoftwareGl: boolean;
  isActive: boolean;
  themeMode: 'light' | 'dark';
  fillRatio: number;
  visualState: CapsuleVisualState;
  reducedMotion: boolean;
  controlsHandleRef: MutableRefObject<CapsuleSceneControlsHandle | null>;
  onOrbitedChange: (orbited: boolean) => void;
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
      camera={{ position: [2.51, 1.16, 7.42], fov: 33 }}
      gl={{
        antialias: profile.antialias,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      frameloop={demandMode ? 'demand' : 'always'}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
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
        themeMode={themeMode}
        fillRatio={fillRatio}
        visualState={visualState}
        reducedMotion={reducedMotion}
        controlsHandleRef={controlsHandleRef}
        onOrbitedChange={onOrbitedChange}
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
  const [isOrbited, setIsOrbited] = useState(false);
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
  const palette = ALL_VISUAL_PALETTES[visualMode];
  const profile = QUALITY_PROFILES[resolvedTier];
  const isDark = themeMode === 'dark';
  const showFallback = forceFallback || !supported || contextLost;
  const isActive = isInView && isPageVisible;
  const pct = Math.round(clampedFill * 100);

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

  // Theme-harmonized chamber stage anchored cleanly via global mood & light/dark CSS tokens
  const stageSurfaceClass = embedded
    ? 'rounded-[16px] bg-[var(--bg-well)] ring-1 ring-inset ring-[var(--border-subtle)] shadow-[var(--well-inset-shadow)]'
    : 'min-h-[340px] rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-well)] shadow-[var(--well-inset-shadow)]';

  const ambientGlowOpacity =
    visualState !== 'normal' || visualMode === 'depleted'
      ? 0
      : isDark
        ? 0.14
        : 0.085;

  const defaultAriaLabel =
    visualState === 'unconfigured'
      ? '3D budget capsule on standby: no monthly budget configured.'
      : visualState === 'invalid'
        ? '3D budget capsule on standby: financial data unavailable.'
        : `3D budget capsule at ${pct}% fill (${palette.label}). Drag, use arrow keys to rotate, or double-click / press R to reset view.`;

  return (
    <div
      ref={containerRef}
      data-testid="budget-capsule-container"
      data-webgl-supported={String(supported && !contextLost && !forceFallback)}
      data-quality-tier={profile.tier}
      data-fill-pct={String(pct)}
      data-health-state={healthState}
      data-capsule-mode={visualMode}
      data-reduced-motion={String(effectiveReducedMotion)}
      data-scene-ready={String(sceneReady)}
      data-orbited={String(isOrbited)}
      role={!showFallback ? 'img' : undefined}
      aria-roledescription={!showFallback ? 'Interactive 3D budget capsule' : undefined}
      aria-label={!showFallback ? ariaLabel ?? defaultAriaLabel : undefined}
      tabIndex={!showFallback ? 0 : undefined}
      onKeyDown={handleKeyDown}
      onDoubleClick={() => {
        if (!showFallback) {
          controlsHandleRef.current?.resetView();
        }
      }}
      style={resolvedMinHeight !== undefined ? { minHeight: resolvedMinHeight } : undefined}
      className={`relative w-full h-full overflow-hidden select-none transition-[background-color,border-color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-1 ${
        !showFallback ? 'cursor-grab active:cursor-grabbing' : ''
      } ${stageSurfaceClass} ${className}`}
    >
      {/* Clean Studio Depth Vignette & State-Aligned Chamber Luminescence */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 42%, rgba(148,163,184,0.065) 0%, rgba(15,23,42,0) 58%, rgba(2,6,14,0.42) 100%)'
            : 'radial-gradient(ellipse at 50% 42%, rgba(255,255,255,0.88) 0%, rgba(241,245,251,0.45) 62%, rgba(214,223,238,0.68) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-all duration-500"
        style={{
          opacity: ambientGlowOpacity,
          background: `radial-gradient(circle at 50% 54%, ${palette.mainHex} 0%, transparent 64%)`,
        }}
      />

      {showStageHeader ? (
        <div className="pointer-events-none absolute inset-x-4 top-3.5 z-10 flex items-center justify-between">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold tracking-wide border border-[var(--border-subtle)] bg-[var(--bg-surface-translucent)] text-[var(--text-tertiary)] transition-colors duration-300">
            {visualState === 'unconfigured'
              ? 'No Budget Set'
              : visualState === 'invalid'
                ? 'Data Unavailable'
                : 'Aether Capsule'}
          </span>
          {!showFallback && (
            <div className="pointer-events-auto flex items-center gap-2">
              {isOrbited ? (
                <button
                  type="button"
                  data-testid="capsule-reset-view-btn"
                  aria-label="Reset capsule view"
                  onClick={(e) => {
                    e.stopPropagation();
                    controlsHandleRef.current?.resetView();
                  }}
                  className="min-h-[28px] px-2.5 py-1 rounded-md text-[11px] font-semibold text-[var(--accent-ink)] bg-[var(--bg-surface-translucent)] border border-[var(--border-subtle)] hover:border-[var(--accent-border)] transition-colors"
                >
                  Reset view
                </button>
              ) : (
                <span className="pointer-events-none px-2 py-1 rounded-lg text-[10.5px] font-medium text-[var(--text-secondary)]">
                  Drag to orbit
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        !showFallback && (
          <div className="pointer-events-none absolute inset-x-3 bottom-2.5 z-10 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium font-mono tabular-nums text-[var(--text-secondary)] opacity-85">
              <span
                className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor:
                    visualState === 'normal' ? palette.mainHex : '#94a3b8',
                }}
                aria-hidden="true"
              />
              <span>
                {visualState === 'unconfigured'
                  ? 'Standby'
                  : visualState === 'invalid'
                    ? 'Unavailable'
                    : `${pct}% reserve`}
              </span>
            </span>

            <div className="pointer-events-auto flex items-center">
              {isOrbited ? (
                <button
                  type="button"
                  data-testid="capsule-reset-view-btn"
                  aria-label="Reset capsule view"
                  onClick={(e) => {
                    e.stopPropagation();
                    controlsHandleRef.current?.resetView();
                  }}
                  className="min-h-[28px] px-2.5 py-0.5 rounded-md text-[11px] font-semibold text-[var(--accent-ink)] bg-[var(--bg-surface-translucent)] border border-[var(--border-subtle)] hover:border-[var(--accent-border)] transition-colors"
                >
                  Reset angle
                </button>
              ) : (
                <span className="pointer-events-none text-[11px] font-medium text-[var(--text-secondary)] opacity-80">
                  Drag to rotate
                </span>
              )}
            </div>
          </div>
        )
      )}

      {/* Calm optical chamber silhouette shown cleanly during initial WebGL context boot */}
      {!showFallback && !sceneReady && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        >
          <div className="w-12 h-2.5 rounded-t-md bg-[var(--border-strong)]/60" />
          <div className="w-16 h-32 sm:h-36 border-x border-[var(--border-strong)]/50 bg-[var(--bg-surface)]/25 flex flex-col justify-end p-1.5">
            <div
              className="w-full rounded-sm opacity-35 transition-all duration-300"
              style={{
                height: `${Math.max(8, pct)}%`,
                backgroundColor: palette.mainHex,
              }}
            />
          </div>
          <div className="w-14 h-2.5 rounded-b-md bg-[var(--border-strong)]/60" />
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
                themeMode={themeMode}
                fillRatio={clampedFill}
                visualState={visualState}
                reducedMotion={effectiveReducedMotion}
                controlsHandleRef={controlsHandleRef}
                onOrbitedChange={setIsOrbited}
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
