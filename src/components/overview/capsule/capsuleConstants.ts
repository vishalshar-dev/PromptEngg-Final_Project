export type CapsuleQualityTier = 'high' | 'medium' | 'low';

export interface QualityProfile {
  tier: CapsuleQualityTier;
  label: string;
  dpr: number | [number, number];
  antialias: boolean;
  envResolution: number;
  latheSegments: number;
  particleCount: number;
  useTransmission: boolean;
  useRectAreaLights: boolean;
  shadowResolution: number;
  demandFrameloop: boolean;
}

export const AETHER_DIMS = {
  glassOuterRadius: 1.03,
  glassInnerRadius: 0.94,
  glassWallThickness: 0.09,
  glassHeight: 2.76,
  glassHalfHeight: 1.38,

  liquidRadius: 0.88,
  liquidCoreRadius: 0.63,
  liquidBottomY: -1.3,
  liquidMaxHeight: 2.6,
  meniscusRadius: 0.884,
  meniscusThickness: 0.044,

  staticHealthyFill: 0.76,

  headBaseY: 1.36,
  headTopY: 1.84,
  headMaxRadius: 1.18,

  baseTopY: -1.36,
  baseBottomY: -1.86,
  baseMaxRadius: 1.26,

  strutRadialPlacement: 1.135,
  strutAngles: [Math.PI / 3, Math.PI, -Math.PI / 3] as const,
  strutSpanHeight: 2.86,

  statusRingRadius: 1.135,
  statusRingTube: 0.022,
  statusRingY: -1.43,

  markRadius: 1.034,
  particleMaxRadius: 0.77,
} as const;

export const QUALITY_PROFILES: Record<CapsuleQualityTier, QualityProfile> = {
  high: {
    tier: 'high',
    label: 'High (Optical Transmission)',
    dpr: [1, 2],
    antialias: true,
    envResolution: 256,
    latheSegments: 128,
    particleCount: 36,
    useTransmission: true,
    useRectAreaLights: true,
    shadowResolution: 512,
    demandFrameloop: false,
  },
  medium: {
    tier: 'medium',
    label: 'Medium (Balanced Studio)',
    dpr: [1, 1.5],
    antialias: true,
    envResolution: 128,
    latheSegments: 96,
    particleCount: 24,
    useTransmission: true,
    useRectAreaLights: true,
    shadowResolution: 256,
    demandFrameloop: false,
  },
  low: {
    tier: 'low',
    label: 'Low / Software Fallback',
    dpr: 1,
    antialias: false,
    envResolution: 128,
    latheSegments: 64,
    particleCount: 14,
    useTransmission: false,
    useRectAreaLights: false,
    shadowResolution: 128,
    demandFrameloop: true,
  },
};

export function resolveQualityTier({
  requested,
  isSoftwareGl,
  isNarrowViewport,
  devicePixelRatio = 1,
}: {
  requested: CapsuleQualityTier | 'auto';
  isSoftwareGl: boolean;
  isNarrowViewport: boolean;
  devicePixelRatio?: number;
}): CapsuleQualityTier {
  if (isSoftwareGl && requested === 'auto') {
    return 'low';
  }
  if (requested !== 'auto') {
    return isSoftwareGl && requested === 'high' ? 'low' : requested;
  }
  if (isNarrowViewport || devicePixelRatio <= 1.25) {
    return 'medium';
  }
  return 'high';
}

export function clampFillRatio(fillRatio: number): number {
  if (!Number.isFinite(fillRatio)) return 0;
  return Math.max(0, Math.min(1, fillRatio));
}

export const MIN_RESIDUAL_LIQUID_HEIGHT = 0.036;

export function computeLiquidHeight(fillRatio: number): number {
  const clamped = clampFillRatio(fillRatio);
  if (clamped <= 0) return MIN_RESIDUAL_LIQUID_HEIGHT;
  return (
    MIN_RESIDUAL_LIQUID_HEIGHT +
    (AETHER_DIMS.liquidMaxHeight - MIN_RESIDUAL_LIQUID_HEIGHT) * clamped
  );
}

export function computeLiquidSurfaceY(fillRatio: number): number {
  return AETHER_DIMS.liquidBottomY + computeLiquidHeight(fillRatio);
}

export type CapsuleHealthState = 'healthy' | 'caution' | 'critical' | 'depleted';
export type CapsuleVisualState = 'normal' | 'unconfigured' | 'invalid';
export type CapsuleVisualMode = CapsuleHealthState | 'unconfigured' | 'invalid';

export interface CapsuleHealthPalette {
  state: CapsuleVisualMode;
  label: string;
  mainHex: string;
  deepHex: string;
  midHex: string;
  glowHex: string;
  emissiveHex: string;
  meniscusSurfaceHex: string;
  meniscusRimHex: string;
  particleHex: string;
  particleEmissiveHex: string;
  lightHex: string;
  statusRingHex: string;
  statusRingEmissiveHex: string;
  emitterHex: string;
  fluidEmissiveBoost: number;
  fluidOpacity: number;
  meniscusEmissiveIntensity: number;
  lightIntensity: number;
  coreLightIntensity: number;
  statusRingIntensity: number;
  emitterIntensity: number;
}

export const HEALTH_PALETTES: Record<CapsuleHealthState, CapsuleHealthPalette> = {
  healthy: {
    state: 'healthy',
    label: 'Healthy',
    mainHex: '#00f5d4',
    deepHex: '#01383c',
    midHex: '#00bfa5',
    glowHex: '#34ffe3',
    emissiveHex: '#00b89c',
    meniscusSurfaceHex: '#00e6c6',
    meniscusRimHex: '#42ffe4',
    particleHex: '#c9fff6',
    particleEmissiveHex: '#00f5d4',
    lightHex: '#00f5d4',
    statusRingHex: '#19ffe1',
    statusRingEmissiveHex: '#00d4b8',
    emitterHex: '#00b89c',
    fluidEmissiveBoost: 0.96,
    fluidOpacity: 0.7,
    meniscusEmissiveIntensity: 1.15,
    lightIntensity: 1.4,
    coreLightIntensity: 0.65,
    statusRingIntensity: 1.12,
    emitterIntensity: 0.55,
  },
  caution: {
    state: 'caution',
    label: 'Caution',
    mainHex: '#ffb703',
    deepHex: '#4a2100',
    midHex: '#e08500',
    glowHex: '#ffb703',
    emissiveHex: '#d98a00',
    meniscusSurfaceHex: '#ffa800',
    meniscusRimHex: '#ffd166',
    particleHex: '#ffe49e',
    particleEmissiveHex: '#ffb703',
    lightHex: '#ffb703',
    statusRingHex: '#ffc42e',
    statusRingEmissiveHex: '#d98a00',
    emitterHex: '#c97b00',
    fluidEmissiveBoost: 0.9,
    fluidOpacity: 0.76,
    meniscusEmissiveIntensity: 1.08,
    lightIntensity: 1.24,
    coreLightIntensity: 0.54,
    statusRingIntensity: 1.04,
    emitterIntensity: 0.48,
  },
  critical: {
    state: 'critical',
    label: 'Critical',
    mainHex: '#ff2a5f',
    deepHex: '#3b0211',
    midHex: '#dc1448',
    glowHex: '#ff3b6b',
    emissiveHex: '#c91442',
    meniscusSurfaceHex: '#e61c50',
    meniscusRimHex: '#ff527d',
    particleHex: '#ffb3c6',
    particleEmissiveHex: '#ff2a5f',
    lightHex: '#ff2a5f',
    statusRingHex: '#ff4775',
    statusRingEmissiveHex: '#c91442',
    emitterHex: '#b3123a',
    fluidEmissiveBoost: 0.88,
    fluidOpacity: 0.8,
    meniscusEmissiveIntensity: 1.04,
    lightIntensity: 1.08,
    coreLightIntensity: 0.46,
    statusRingIntensity: 1.08,
    emitterIntensity: 0.42,
  },
  depleted: {
    state: 'depleted',
    label: 'Depleted',
    mainHex: '#2a1218',
    deepHex: '#120609',
    midHex: '#220d13',
    glowHex: '#4a1b25',
    emissiveHex: '#360912',
    meniscusSurfaceHex: '#2a1218',
    meniscusRimHex: '#521926',
    particleHex: '#591d2b',
    particleEmissiveHex: '#360912',
    lightHex: '#631424',
    statusRingHex: '#611323',
    statusRingEmissiveHex: '#420a14',
    emitterHex: '#2e0810',
    fluidEmissiveBoost: 0.14,
    fluidOpacity: 0.86,
    meniscusEmissiveIntensity: 0.16,
    lightIntensity: 0.12,
    coreLightIntensity: 0.04,
    statusRingIntensity: 0.28,
    emitterIntensity: 0.08,
  },
};

export const STANDBY_PALETTES: Record<'unconfigured' | 'invalid', CapsuleHealthPalette> = {
  unconfigured: {
    state: 'unconfigured',
    label: 'No Budget Set',
    mainHex: '#475569',
    deepHex: '#1e293b',
    midHex: '#334155',
    glowHex: '#64748b',
    emissiveHex: '#334155',
    meniscusSurfaceHex: '#475569',
    meniscusRimHex: '#64748b',
    particleHex: '#94a3b8',
    particleEmissiveHex: '#475569',
    lightHex: '#64748b',
    statusRingHex: '#5b687c',
    statusRingEmissiveHex: '#3b4657',
    emitterHex: '#334155',
    fluidEmissiveBoost: 0.14,
    fluidOpacity: 0.56,
    meniscusEmissiveIntensity: 0.14,
    lightIntensity: 0.14,
    coreLightIntensity: 0.06,
    statusRingIntensity: 0.24,
    emitterIntensity: 0.08,
  },
  invalid: {
    state: 'invalid',
    label: 'Unavailable',
    mainHex: '#52525b',
    deepHex: '#27272a',
    midHex: '#3f3f46',
    glowHex: '#71717a',
    emissiveHex: '#3f3f46',
    meniscusSurfaceHex: '#52525b',
    meniscusRimHex: '#71717a',
    particleHex: '#a1a1aa',
    particleEmissiveHex: '#52525b',
    lightHex: '#71717a',
    statusRingHex: '#78716c',
    statusRingEmissiveHex: '#44403c',
    emitterHex: '#3f3f46',
    fluidEmissiveBoost: 0.12,
    fluidOpacity: 0.54,
    meniscusEmissiveIntensity: 0.12,
    lightIntensity: 0.1,
    coreLightIntensity: 0.04,
    statusRingIntensity: 0.22,
    emitterIntensity: 0.06,
  },
};

export const ALL_VISUAL_PALETTES: Record<CapsuleVisualMode, CapsuleHealthPalette> = {
  ...HEALTH_PALETTES,
  ...STANDBY_PALETTES,
};

export function resolveHealthState(fillRatio: number): CapsuleHealthState {
  const clamped = clampFillRatio(fillRatio);
  if (clamped <= 0.0001) return 'depleted';
  if (clamped < 0.2) return 'critical';
  if (clamped < 0.5) return 'caution';
  return 'healthy';
}

export function resolveVisualMode(
  fillRatio: number,
  visualState: CapsuleVisualState = 'normal'
): CapsuleVisualMode {
  if (visualState === 'unconfigured' || visualState === 'invalid') {
    return visualState;
  }
  return resolveHealthState(fillRatio);
}

export function computeCriticalBreathFactor(
  fillRatio: number,
  elapsed: number,
  reducedMotion: boolean,
  visualState: CapsuleVisualState = 'normal'
): number {
  if (reducedMotion || visualState !== 'normal') return 1;
  const state = resolveHealthState(fillRatio);
  if (state !== 'critical') return 1;
  // Gentle sine breathing (~2.6s period) for subtle warning signal
  return 0.88 + 0.16 * (0.5 + 0.5 * Math.sin(elapsed * 2.4));
}

export function computeParticleFillVisibility(
  fillRatio: number,
  visualState: CapsuleVisualState = 'normal'
): number {
  if (visualState !== 'normal') return 0;
  const clamped = clampFillRatio(fillRatio);
  if (clamped <= 0.005) return 0;
  return Math.min(1, Math.max(0.18, clamped / 0.35));
}

export interface ParticleSeed {
  angle: number;
  radialFraction: number;
  heightPhase: number;
  speed: number;
  swayFreq: number;
  swayAmp: number;
  swayPhase: number;
  baseScale: number;
  brightness: number;
}

export function generateParticleSeeds(count: number): ParticleSeed[] {
  const safeCount = Math.max(0, Math.floor(count));
  const seeds: ParticleSeed[] = [];
  let state = 48271;
  const rand = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  for (let i = 0; i < safeCount; i++) {
    const r = Math.sqrt(rand()) * AETHER_DIMS.particleMaxRadius;
    seeds.push({
      angle: rand() * Math.PI * 2,
      radialFraction: r,
      heightPhase: rand(),
      speed: 0.045 + rand() * 0.065,
      swayFreq: 0.7 + rand() * 1.1,
      swayAmp: 0.012 + rand() * 0.022,
      swayPhase: rand() * Math.PI * 2,
      baseScale: 0.0085 + Math.pow(rand(), 1.6) * 0.015,
      brightness: 0.55 + rand() * 0.45,
    });
  }

  return seeds;
}

export function evaluateParticlePosition(
  seed: ParticleSeed,
  elapsed: number,
  fillRatio: number,
  index = 0,
  totalCount = 1,
  reducedMotion = false
): { x: number; y: number; z: number; scale: number } {
  const visibility = computeParticleFillVisibility(fillRatio);
  if (visibility <= 0) {
    return { x: 0, y: AETHER_DIMS.liquidBottomY, z: 0, scale: 0 };
  }

  const activeCutoff = Math.max(1, Math.round(totalCount * visibility));
  if (index >= activeCutoff) {
    return { x: 0, y: AETHER_DIMS.liquidBottomY, z: 0, scale: 0 };
  }

  const surfaceY = computeLiquidSurfaceY(fillRatio);
  const bottom = AETHER_DIMS.liquidBottomY + 0.025;
  const top = Math.max(bottom + 0.015, surfaceY - 0.035);
  const span = Math.max(0.015, top - bottom);

  const effectiveElapsed = reducedMotion ? 0 : elapsed;
  const progress = (seed.heightPhase + effectiveElapsed * seed.speed) % 1;
  const y = Math.min(surfaceY - 0.02, Math.max(AETHER_DIMS.liquidBottomY + 0.01, bottom + progress * span));

  const drift = reducedMotion
    ? 0
    : Math.sin(effectiveElapsed * seed.swayFreq + seed.swayPhase) * seed.swayAmp;
  const clampedR = Math.min(
    AETHER_DIMS.particleMaxRadius,
    Math.max(0.05, seed.radialFraction + drift)
  );
  const theta = seed.angle + effectiveElapsed * 0.07;

  // Fade particle scale smoothly near bottom emitter, top meniscus, and low fill
  const edgeFade = Math.min(progress * 6, (1 - progress) * 6, 1);
  const fillScale = Math.min(1, Math.max(0.45, fillRatio / 0.25));
  const pulse = reducedMotion
    ? 1
    : 0.88 + 0.12 * Math.sin(effectiveElapsed * 2.1 + seed.swayPhase);

  return {
    x: Math.cos(theta) * clampedR,
    y,
    z: Math.sin(theta) * clampedR,
    scale: seed.baseScale * edgeFade * pulse * fillScale,
  };
}
