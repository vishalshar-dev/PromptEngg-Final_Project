import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AETHER_DIMS,
  computeLiquidHeight,
  computeLiquidSurfaceY,
  evalChamberInnerRadius,
  evalChamberOuterRadius,
  evalFluidOuterRadius,
  evalMeniscusRadius,
  evalStrutCenterRadius,
  evaluateParticlePosition,
  generateParticleSeeds,
  resolveQualityTier,
} from './capsuleConstants';

test('contoured glass, fluid, meniscus, and swept strut clearances prevent wall intersections across all heights', () => {
  for (let y = AETHER_DIMS.glassBottomY; y <= AETHER_DIMS.glassTopY; y += 0.15) {
    const rOut = evalChamberOuterRadius(y);
    const rIn = evalChamberInnerRadius(y);
    const rFluid = evalFluidOuterRadius(y);
    const rMeniscus = evalMeniscusRadius(y);
    const rStrut = evalStrutCenterRadius(y);

    assert.ok(rFluid < rIn, `Fluid radius exceeded inner glass at y=${y}`);
    assert.ok(rMeniscus > rFluid && rMeniscus < rIn, `Meniscus out of gap at y=${y}`);
    assert.ok(rIn < rOut, `Inner glass exceeded outer glass at y=${y}`);
    assert.ok(rOut < rStrut - 0.12, `Swept strut encroached outer glass at y=${y}`);
  }
  assert.ok(AETHER_DIMS.glassNeckOuterRadius < AETHER_DIMS.glassBellyMaxOuterRadius - 0.25);
});

test('liquid surface Y stays strictly inside glass chamber across fill range', () => {
  for (const fill of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
    const surfaceY = computeLiquidSurfaceY(fill);
    assert.ok(surfaceY > AETHER_DIMS.glassBottomY);
    assert.ok(surfaceY < AETHER_DIMS.glassTopY);
    assert.ok(computeLiquidHeight(fill) > 0);
  }
});

test('bioluminescent particles stay strictly inside contoured fluid volume and clear central optical spine', () => {
  for (const fill of [0.25, AETHER_DIMS.staticHealthyFill, 1]) {
    const surfaceY = computeLiquidSurfaceY(fill);
    const seeds = generateParticleSeeds(48);

    assert.equal(seeds.length, 48);

    for (const t of [0, 1.5, 8.2, 23.7]) {
      for (const seed of seeds) {
        const p = evaluateParticlePosition(seed, t, fill);
        const radialDist = Math.hypot(p.x, p.z);
        const maxLocal = evalFluidOuterRadius(p.y) - 0.04;
        assert.ok(
          radialDist <= maxLocal + 1e-6,
          `Particle radial distance ${radialDist} exceeded local curved fluid bound ${maxLocal} at y=${p.y}`
        );
        assert.ok(
          p.y >= AETHER_DIMS.liquidBottomY && p.y <= surfaceY,
          `Particle Y ${p.y} escaped liquid range [${AETHER_DIMS.liquidBottomY}, ${surfaceY}]`
        );
      }
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

test('coordinated financial transition shifts color toward target tier immediately without lag', () => {
  const runtime = createAetherRuntimeState(0.9, false);
  const initialRed = runtime.mainColor.r;
  runtime.targetFill = 0.12; // critical target while currentFill is still high (~0.82 after one frame)
  stepAetherRuntimeState(runtime, 0.05, 0.05);
  assert.ok(runtime.currentFill > 0.7, 'Fill level should still be high on first step');
  assert.ok(
    runtime.mainColor.r > initialRed + 0.15,
    `Expected mainColor.r (${runtime.mainColor.r}) to shift toward critical red immediately from ${initialRed}`
  );
});
