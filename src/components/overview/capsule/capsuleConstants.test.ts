import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AETHER_DIMS,
  computeLiquidHeight,
  computeLiquidSurfaceY,
  evaluateParticlePosition,
  generateParticleSeeds,
  resolveQualityTier,
} from './capsuleConstants';

test('glass and liquid concentric clearances prevent wall intersections', () => {
  assert.ok(AETHER_DIMS.liquidRadius < AETHER_DIMS.glassInnerRadius);
  assert.ok(AETHER_DIMS.glassInnerRadius < AETHER_DIMS.glassOuterRadius);
  assert.ok(AETHER_DIMS.glassOuterRadius < AETHER_DIMS.strutRadialPlacement - 0.056);
});

test('liquid surface Y stays strictly inside glass chamber across fill range', () => {
  const bottomLimit = -AETHER_DIMS.glassHalfHeight;
  const topLimit = AETHER_DIMS.glassHalfHeight;

  for (const fill of [0, 0.25, 0.5, 0.76, 1]) {
    const surfaceY = computeLiquidSurfaceY(fill);
    assert.ok(surfaceY > bottomLimit);
    assert.ok(surfaceY < topLimit);
    assert.ok(computeLiquidHeight(fill) > 0);
  }
});

test('bioluminescent particles stay strictly inside fluid volume and below meniscus', () => {
  const fill = AETHER_DIMS.staticHealthyFill;
  const surfaceY = computeLiquidSurfaceY(fill);
  const seeds = generateParticleSeeds(64);

  assert.equal(seeds.length, 64);

  for (const t of [0, 1.5, 8.2, 23.7]) {
    for (const seed of seeds) {
      const p = evaluateParticlePosition(seed, t, fill);
      const radialDist = Math.hypot(p.x, p.z);
      assert.ok(
        radialDist <= AETHER_DIMS.liquidRadius - 0.05,
        `Particle radial distance ${radialDist} exceeded inner fluid margin`
      );
      assert.ok(
        p.y >= AETHER_DIMS.liquidBottomY && p.y <= surfaceY,
        `Particle Y ${p.y} escaped liquid range [${AETHER_DIMS.liquidBottomY}, ${surfaceY}]`
      );
    }
  }
});

test('quality tier resolver guards software WebGL cleanly', () => {
  assert.equal(
    resolveQualityTier({
      requested: 'auto',
      isSoftwareGl: true,
      isNarrowViewport: false,
      devicePixelRatio: 2,
    }),
    'low'
  );
  assert.equal(
    resolveQualityTier({
      requested: 'auto',
      isSoftwareGl: false,
      isNarrowViewport: false,
      devicePixelRatio: 2,
    }),
    'high'
  );
  assert.equal(
    resolveQualityTier({
      requested: 'auto',
      isSoftwareGl: false,
      isNarrowViewport: true,
      devicePixelRatio: 2,
    }),
    'medium'
  );
});

import {
  computeCriticalBreathFactor,
  computeParticleFillVisibility,
  HEALTH_PALETTES,
  MIN_RESIDUAL_LIQUID_HEIGHT,
  resolveHealthState,
} from './capsuleConstants';
import {
  createAetherRuntimeState,
  stepAetherRuntimeState,
} from './capsuleAnimation';

test('health state thresholds match Healthy / Caution / Critical / Depleted rules', () => {
  assert.equal(resolveHealthState(1), 'healthy');
  assert.equal(resolveHealthState(0.5), 'healthy');
  assert.equal(resolveHealthState(0.499), 'caution');
  assert.equal(resolveHealthState(0.2), 'caution');
  assert.equal(resolveHealthState(0.199), 'critical');
  assert.equal(resolveHealthState(0.05), 'critical');
  assert.equal(resolveHealthState(0), 'depleted');

  assert.equal(HEALTH_PALETTES.healthy.mainHex, '#00f5d4');
  assert.equal(HEALTH_PALETTES.caution.mainHex, '#ffb703');
  assert.equal(HEALTH_PALETTES.critical.mainHex, '#ff2a5f');
  assert.equal(HEALTH_PALETTES.depleted.mainHex, '#2a1218');
});

test('particles disappear cleanly at 0% depleted and stay inside low-fill fluid', () => {
  const seeds = generateParticleSeeds(36);
  for (let i = 0; i < seeds.length; i++) {
    const pZero = evaluateParticlePosition(seeds[i], 3.2, 0, i, seeds.length, false);
    assert.equal(pZero.scale, 0);
  }
  assert.equal(computeParticleFillVisibility(0), 0);

  // At 5% fill, active bubbles remain strictly below meniscus
  const fillFive = 0.05;
  const surfaceFive = computeLiquidSurfaceY(fillFive);
  for (let i = 0; i < seeds.length; i++) {
    const pLow = evaluateParticlePosition(seeds[i], 2.4, fillFive, i, seeds.length, false);
    if (pLow.scale > 0) {
      assert.ok(pLow.y < surfaceFive);
      assert.ok(pLow.y > AETHER_DIMS.liquidBottomY);
    }
  }
  assert.equal(computeLiquidHeight(0), MIN_RESIDUAL_LIQUID_HEIGHT);
});

test('critical breathing and reduced-motion damping behave deterministically', () => {
  const breathActiveA = computeCriticalBreathFactor(0.1, 0, false);
  const breathActiveB = computeCriticalBreathFactor(0.1, 0.65, false);
  assert.notEqual(breathActiveA, breathActiveB);
  assert.equal(computeCriticalBreathFactor(0.75, 0.65, false), 1);
  assert.equal(computeCriticalBreathFactor(0.1, 0.65, true), 1);

  const runtime = createAetherRuntimeState(1, false);
  runtime.targetFill = 0.1;
  for (let step = 0; step < 30; step++) {
    stepAetherRuntimeState(runtime, 0.05, step * 0.05);
  }
  assert.ok(runtime.currentFill < 0.15, `Expected fill to drain near 0.1, got ${runtime.currentFill}`);
  assert.equal(runtime.currentHealth, 'critical');
});
