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

export function smoothstepJs(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const AETHER_DIMS = {
  // Contoured Borosilicate Chamber (y = -1.20 to +1.22, wide containment belly tapering into precision neck)
  glassBottomY: -1.2,
  glassTopY: 1.22,
  glassHeight: 2.42,
  glassWallThickness: 0.088,

  glassBaseOuterRadius: 0.89,
  glassBellyMaxOuterRadius: 1.05,
  glassNeckOuterRadius: 0.72,
  glassOuterRadius: 1.05,
  glassInnerRadius: 0.962,

  // Fluid Containment (always flush inside curved inner glass wall)
  liquidBottomY: -1.14,
  liquidMaxHeight: 2.22, // rises cleanly up to y = +1.08 inside precision neck
  fluidWallClearance: 0.012,
  fluidCoreFraction: 0.62,
  meniscusWallClearance: 0.007,
  meniscusThickness: 0.044,

  staticHealthyFill: 0.76,

  // Compact Stepped Upper Instrument Crown
  headBaseY: 1.2,
  headTopY: 1.82,
  headMaxRadius: 0.84,

  // Grounded Layered Aerospace Lower Plinth
  baseTopY: -1.18,
  baseBottomY: -1.84,
  baseMaxRadius: 1.24,

  // Swept Aerospace Buttress Rails (3 symmetric rails framing silhouette with generous negative space)
  strutAngles: [Math.PI / 3, Math.PI, -Math.PI / 3] as const,
  strutBottomY: -1.42,
  strutTopY: 1.34,

  // Recessed Lower Illuminated Lightguide Channel
  statusRingRadius: 1.015,
  statusRingTube: 0.02,
  statusRingY: -1.36,

  markWallOffset: 0.002,
  particleMaxFraction: 0.84,
} as const;

/**
 * Analytic C1-smooth outer glass contour:
 * - Seats at 0.89 on the lower containment collar (y = -1.20)
 * - Swells outward to 1.05 optical containment belly (y = -0.38)
 * - Tapers smoothly through an engineered S-curve into a 0.72 precision neck (y = +0.88..+1.22)
 */
export function evalChamberOuterRadius(y: number): number {
  const lowerBelly = smoothstepJs(-1.2, -0.38, y);
  const upperNeck = smoothstepJs(-0.32, 0.88, y);
  return 0.89 + lowerBelly * 0.16 - upperNeck * 0.33;
}

export function evalChamberInnerRadius(y: number): number {
  return evalChamberOuterRadius(y) - AETHER_DIMS.glassWallThickness;
}

export function evalFluidOuterRadius(y: number): number {
  return evalChamberInnerRadius(y) - AETHER_DIMS.fluidWallClearance;
}

export function evalMeniscusRadius(y: number): number {
  return evalChamberInnerRadius(y) - AETHER_DIMS.meniscusWallClearance;
}

/**
 * Radial path of each of the 3 swept structural buttress rails cleanly clearing the curved glass wall.
 */
export function evalStrutCenterRadius(y: number): number {
  const bellySweep = smoothstepJs(-1.42, -0.38, y);
  const neckSweep = smoothstepJs(-0.3, 1.34, y);
  return 1.15 + bellySweep * 0.06 - neckSweep * 0.27;
}

export const QUALITY_PROFILES: Record<CapsuleQualityTier, QualityProfile> = {
  high: {
    tier: 'high',
    label: 'High (Studio Optical)',
    dpr: [1, 2],
    antialias: true,
    envResolution: 256,
    latheSegments: 128,
    particleCount: 36,
    useTransmission: false,
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
    useTransmission: false,
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
    particleCount: 16,
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
    deepHex: '#022a30',
    midHex: '#009688',
    glowHex: '#28f0d4',
    emissiveHex: '#009682',
    meniscusSurfaceHex: '#00b89f',
    meniscusRimHex: '#7affec',
    particleHex: '#c9fff6',
    particleEmissiveHex: '#00e6c8',
    lightHex: '#00f5d4',
    statusRingHex: '#19ffe1',
    statusRingEmissiveHex: '#00c9ae',
    emitterHex: '#009e86',
    fluidEmissiveBoost: 0.62,
    fluidOpacity: 0.84,
    meniscusEmissiveIntensity: 0.72,
    lightIntensity: 0.96,
    coreLightIntensity: 0.42,
    statusRingIntensity: 1.08,
    emitterIntensity: 0.48,
  },
  caution: {
    state: 'caution',
    label: 'Caution',
    mainHex: '#ffb703',
    deepHex: '#4a1500',
    midHex: '#d96500',
    glowHex: '#ffb71a',
    emissiveHex: '#b85400',
    meniscusSurfaceHex: '#e67e00',
    meniscusRimHex: '#ffe082',
    particleHex: '#ffe8ad',
    particleEmissiveHex: '#ffa800',
    lightHex: '#ffb703',
    statusRingHex: '#ffc42e',
    statusRingEmissiveHex: '#c97800',
    emitterHex: '#ad5e00',
    fluidEmissiveBoost: 0.58,
    fluidOpacity: 0.87,
    meniscusEmissiveIntensity: 0.68,
    lightIntensity: 0.82,
    coreLightIntensity: 0.34,
    statusRingIntensity: 0.96,
    emitterIntensity: 0.42,
  },
  critical: {
    state: 'critical',
    label: 'Critical',
    mainHex: '#ff2a5f',
    deepHex: '#3b0210',
    midHex: '#b30d38',
    glowHex: '#ff4270',
    emissiveHex: '#940b2f',
    meniscusSurfaceHex: '#cc1444',
    meniscusRimHex: '#ff85a3',
    particleHex: '#ffbfd0',
    particleEmissiveHex: '#ff2a5f',
    lightHex: '#ff2a5f',
    statusRingHex: '#ff4775',
    statusRingEmissiveHex: '#bf113c',
    emitterHex: '#990f32',
    fluidEmissiveBoost: 0.56,
    fluidOpacity: 0.87,
    meniscusEmissiveIntensity: 0.68,
    lightIntensity: 0.78,
    coreLightIntensity: 0.32,
    statusRingIntensity: 1.0,
    emitterIntensity: 0.38,
  },
  depleted: {
    state: 'depleted',
    label: 'Depleted',
    mainHex: '#2a1218',
    deepHex: '#140508',
    midHex: '#260b12',
    glowHex: '#541e2a',
    emissiveHex: '#3b0914',
    meniscusSurfaceHex: '#2e1219',
    meniscusRimHex: '#631e2e',
    particleHex: '#591d2b',
    particleEmissiveHex: '#360912',
    lightHex: '#6b1628',
    statusRingHex: '#731629',
    statusRingEmissiveHex: '#570d1b',
    emitterHex: '#360912',
    fluidEmissiveBoost: 0.14,
    fluidOpacity: 0.9,
    meniscusEmissiveIntensity: 0.16,
    lightIntensity: 0.12,
    coreLightIntensity: 0.05,
    statusRingIntensity: 0.42,
    emitterIntensity: 0.1,
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
    statusRingHex: '#64748b',
    statusRingEmissiveHex: '#475569',
    emitterHex: '#334155',
    fluidEmissiveBoost: 0.14,
    fluidOpacity: 0.56,
    meniscusEmissiveIntensity: 0.14,
    lightIntensity: 0.14,
    coreLightIntensity: 0.06,
    statusRingIntensity: 0.34,
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
  if (clamped < 0.0001) return 'depleted';
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
    const rFrac = 0.18 + Math.sqrt(rand()) * (AETHER_DIMS.particleMaxFraction - 0.18);
    seeds.push({
      angle: rand() * Math.PI * 2,
      radialFraction: rFrac,
      heightPhase: rand(),
      speed: 0.045 + rand() * 0.065,
      swayFreq: 0.7 + rand() * 1.1,
      swayAmp: 0.015 + rand() * 0.025,
      swayPhase: rand() * Math.PI * 2,
      baseScale: 0.0085 + Math.pow(rand(), 1.6) * 0.014,
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

  const localFluidRadius = evalFluidOuterRadius(y);
  const drift = reducedMotion
    ? 0
    : Math.sin(effectiveElapsed * seed.swayFreq + seed.swayPhase) * seed.swayAmp;
  const maxSafeR = Math.max(0.12, localFluidRadius - 0.045);
  const clampedR = Math.min(
    maxSafeR,
    Math.max(0.085, seed.radialFraction * maxSafeR + drift)
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
