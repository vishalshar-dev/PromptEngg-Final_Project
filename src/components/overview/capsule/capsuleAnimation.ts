import * as THREE from 'three';
import {
  ALL_VISUAL_PALETTES,
  clampFillRatio,
  computeCriticalBreathFactor,
  computeParticleFillVisibility,
  resolveVisualMode,
  type CapsuleHealthPalette,
  type CapsuleVisualMode,
  type CapsuleVisualState,
} from './capsuleConstants';

export interface AetherRuntimeState {
  targetFill: number;
  currentFill: number;
  visualState: CapsuleVisualState;
  reducedMotion: boolean;
  motionTime: number;
  breathFactor: number;
  currentHealth: CapsuleVisualMode;

  mainColor: THREE.Color;
  deepColor: THREE.Color;
  midColor: THREE.Color;
  glowColor: THREE.Color;
  emissiveColor: THREE.Color;
  meniscusSurfaceColor: THREE.Color;
  meniscusRimColor: THREE.Color;
  particleColor: THREE.Color;
  particleEmissiveColor: THREE.Color;
  lightColor: THREE.Color;
  statusRingColor: THREE.Color;
  statusRingEmissiveColor: THREE.Color;
  emitterColor: THREE.Color;

  fluidEmissiveBoost: number;
  fluidOpacity: number;
  meniscusEmissiveIntensity: number;
  lightIntensity: number;
  coreLightIntensity: number;
  statusRingIntensity: number;
  emitterIntensity: number;
  particleOpacity: number;
}

interface PaletteColorCache {
  main: THREE.Color;
  deep: THREE.Color;
  mid: THREE.Color;
  glow: THREE.Color;
  emissive: THREE.Color;
  meniscusSurface: THREE.Color;
  meniscusRim: THREE.Color;
  particle: THREE.Color;
  particleEmissive: THREE.Color;
  light: THREE.Color;
  statusRing: THREE.Color;
  statusRingEmissive: THREE.Color;
  emitter: THREE.Color;
}

function buildColorCache(palette: CapsuleHealthPalette): PaletteColorCache {
  return {
    main: new THREE.Color(palette.mainHex),
    deep: new THREE.Color(palette.deepHex),
    mid: new THREE.Color(palette.midHex),
    glow: new THREE.Color(palette.glowHex),
    emissive: new THREE.Color(palette.emissiveHex),
    meniscusSurface: new THREE.Color(palette.meniscusSurfaceHex),
    meniscusRim: new THREE.Color(palette.meniscusRimHex),
    particle: new THREE.Color(palette.particleHex),
    particleEmissive: new THREE.Color(palette.particleEmissiveHex),
    light: new THREE.Color(palette.lightHex),
    statusRing: new THREE.Color(palette.statusRingHex),
    statusRingEmissive: new THREE.Color(palette.statusRingEmissiveHex),
    emitter: new THREE.Color(palette.emitterHex),
  };
}

// Preallocated palette lookup (zero per-frame THREE.Color allocations)
const PALETTE_COLOR_CACHE: Record<CapsuleVisualMode, PaletteColorCache> = {
  healthy: buildColorCache(ALL_VISUAL_PALETTES.healthy),
  caution: buildColorCache(ALL_VISUAL_PALETTES.caution),
  critical: buildColorCache(ALL_VISUAL_PALETTES.critical),
  depleted: buildColorCache(ALL_VISUAL_PALETTES.depleted),
  unconfigured: buildColorCache(ALL_VISUAL_PALETTES.unconfigured),
  invalid: buildColorCache(ALL_VISUAL_PALETTES.invalid),
};

export function createAetherRuntimeState(
  initialFill: number,
  reducedMotion: boolean,
  visualState: CapsuleVisualState = 'normal'
): AetherRuntimeState {
  const fill = visualState === 'normal' ? clampFillRatio(initialFill) : 0;
  const mode = resolveVisualMode(fill, visualState);
  const palette = ALL_VISUAL_PALETTES[mode];
  const colors = PALETTE_COLOR_CACHE[mode];

  return {
    targetFill: fill,
    currentFill: fill,
    visualState,
    reducedMotion,
    motionTime: 0,
    breathFactor: 1,
    currentHealth: mode,

    mainColor: colors.main.clone(),
    deepColor: colors.deep.clone(),
    midColor: colors.mid.clone(),
    glowColor: colors.glow.clone(),
    emissiveColor: colors.emissive.clone(),
    meniscusSurfaceColor: colors.meniscusSurface.clone(),
    meniscusRimColor: colors.meniscusRim.clone(),
    particleColor: colors.particle.clone(),
    particleEmissiveColor: colors.particleEmissive.clone(),
    lightColor: colors.light.clone(),
    statusRingColor: colors.statusRing.clone(),
    statusRingEmissiveColor: colors.statusRingEmissive.clone(),
    emitterColor: colors.emitter.clone(),

    fluidEmissiveBoost: palette.fluidEmissiveBoost,
    fluidOpacity: palette.fluidOpacity,
    meniscusEmissiveIntensity: palette.meniscusEmissiveIntensity,
    lightIntensity: palette.lightIntensity,
    coreLightIntensity: palette.coreLightIntensity,
    statusRingIntensity: palette.statusRingIntensity,
    emitterIntensity: palette.emitterIntensity,
    particleOpacity: computeParticleFillVisibility(fill, visualState) * 0.82,
  };
}

export function stepAetherRuntimeState(
  state: AetherRuntimeState,
  delta: number,
  elapsed: number
): boolean {
  const dt = Math.min(Math.max(delta, 0), 0.16);
  if (dt <= 0) return false;

  const effectiveTarget = state.visualState === 'normal' ? state.targetFill : 0;
  const levelDamp = state.reducedMotion ? 9.5 : 4.0;
  const levelAlpha = 1 - Math.exp(-levelDamp * dt);
  const prevFill = state.currentFill;

  if (Math.abs(effectiveTarget - state.currentFill) < 0.0004) {
    state.currentFill = effectiveTarget;
  } else {
    state.currentFill += (effectiveTarget - state.currentFill) * levelAlpha;
  }

  if (!state.reducedMotion && state.visualState === 'normal') {
    state.motionTime += dt;
  }

  const mode = resolveVisualMode(state.currentFill, state.visualState);
  state.currentHealth = mode;

  const targetColorMode: CapsuleVisualMode =
    state.visualState === 'normal' &&
    effectiveTarget <= 0.0001 &&
    state.currentFill <= 0.012
      ? 'depleted'
      : mode;

  const targetPalette = ALL_VISUAL_PALETTES[targetColorMode];
  const targetColors = PALETTE_COLOR_CACHE[targetColorMode];
  const colorDamp = state.reducedMotion ? 11.0 : 5.8;
  const colorAlpha = 1 - Math.exp(-colorDamp * dt);

  state.mainColor.lerp(targetColors.main, colorAlpha);
  state.deepColor.lerp(targetColors.deep, colorAlpha);
  state.midColor.lerp(targetColors.mid, colorAlpha);
  state.glowColor.lerp(targetColors.glow, colorAlpha);
  state.emissiveColor.lerp(targetColors.emissive, colorAlpha);
  state.meniscusSurfaceColor.lerp(targetColors.meniscusSurface, colorAlpha);
  state.meniscusRimColor.lerp(targetColors.meniscusRim, colorAlpha);
  state.particleColor.lerp(targetColors.particle, colorAlpha);
  state.particleEmissiveColor.lerp(targetColors.particleEmissive, colorAlpha);
  state.lightColor.lerp(targetColors.light, colorAlpha);
  state.statusRingColor.lerp(targetColors.statusRing, colorAlpha);
  state.statusRingEmissiveColor.lerp(targetColors.statusRingEmissive, colorAlpha);
  state.emitterColor.lerp(targetColors.emitter, colorAlpha);

  state.fluidEmissiveBoost +=
    (targetPalette.fluidEmissiveBoost - state.fluidEmissiveBoost) * colorAlpha;
  state.fluidOpacity +=
    (targetPalette.fluidOpacity - state.fluidOpacity) * colorAlpha;
  state.meniscusEmissiveIntensity +=
    (targetPalette.meniscusEmissiveIntensity - state.meniscusEmissiveIntensity) *
    colorAlpha;
  state.lightIntensity +=
    (targetPalette.lightIntensity - state.lightIntensity) * colorAlpha;
  state.coreLightIntensity +=
    (targetPalette.coreLightIntensity - state.coreLightIntensity) * colorAlpha;
  state.statusRingIntensity +=
    (targetPalette.statusRingIntensity - state.statusRingIntensity) * colorAlpha;
  state.emitterIntensity +=
    (targetPalette.emitterIntensity - state.emitterIntensity) * colorAlpha;

  const targetParticleOpacity =
    computeParticleFillVisibility(state.currentFill, state.visualState) * 0.82;
  state.particleOpacity +=
    (targetParticleOpacity - state.particleOpacity) * colorAlpha;

  state.breathFactor = computeCriticalBreathFactor(
    state.currentFill,
    elapsed,
    state.reducedMotion,
    state.visualState
  );

  const isTransitioning =
    Math.abs(effectiveTarget - prevFill) >= 0.0004 ||
    Math.abs(targetPalette.lightIntensity - state.lightIntensity) >= 0.004;

  return isTransitioning;
}
