import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BudgetCapsule3D,
  type CapsuleQualityInfo,
} from '../components/overview/BudgetCapsule3D';
import {
  HEALTH_PALETTES,
  resolveHealthState,
  type CapsuleQualityTier,
} from '../components/overview/capsule/capsuleConstants';

type PreviewTheme = 'dark' | 'light';
type MotionPreference = 'auto' | 'reduced' | 'full';

const TEST_PRESETS = [100, 75, 50, 30, 20, 10, 5, 0] as const;
const SEQUENCE_STEPS = [100, 30, 10, 75, 0, 100] as const;

export function CapsulePreviewApp() {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const initialTheme: PreviewTheme =
    params.get('theme') === 'light' ? 'light' : 'dark';
  const initialFallback = params.get('fallback') === '1';
  const qParam = params.get('quality');
  const initialQuality: CapsuleQualityTier | 'auto' =
    qParam === 'high' || qParam === 'medium' || qParam === 'low'
      ? qParam
      : 'auto';

  const fillParam = params.get('fill');
  const parsedFill =
    fillParam !== null && Number.isFinite(Number(fillParam))
      ? Math.max(0, Math.min(100, Math.round(Number(fillParam))))
      : 75;

  const rmParam = params.get('reducedMotion');
  const initialMotion: MotionPreference =
    rmParam === '1' ? 'reduced' : rmParam === '0' ? 'full' : 'auto';

  const [themeMode, setThemeMode] = useState<PreviewTheme>(initialTheme);
  const [quality, setQuality] = useState<CapsuleQualityTier | 'auto'>(
    initialQuality
  );
  const [forceFallback, setForceFallback] = useState(initialFallback);
  const [fillPct, setFillPct] = useState<number>(parsedFill);
  const [motionPref, setMotionPref] = useState<MotionPreference>(initialMotion);
  const [sequenceRunning, setSequenceRunning] = useState(false);
  const [sequenceIndex, setSequenceIndex] = useState<number | null>(null);
  const [qualityInfo, setQualityInfo] = useState<CapsuleQualityInfo | null>(
    null
  );

  const sequenceTimersRef = useRef<number[]>([]);

  const stopSequence = useCallback(() => {
    sequenceTimersRef.current.forEach((id) => window.clearTimeout(id));
    sequenceTimersRef.current = [];
    setSequenceRunning(false);
    setSequenceIndex(null);
  }, []);

  useEffect(() => stopSequence, [stopSequence]);

  const startSequence = useCallback(() => {
    stopSequence();
    setSequenceRunning(true);
    setSequenceIndex(0);
    setFillPct(SEQUENCE_STEPS[0]);

    const stepDelayMs = 2400;
    for (let i = 1; i < SEQUENCE_STEPS.length; i++) {
      const id = window.setTimeout(() => {
        setSequenceIndex(i);
        setFillPct(SEQUENCE_STEPS[i]);
        if (i === SEQUENCE_STEPS.length - 1) {
          const finishId = window.setTimeout(() => {
            setSequenceRunning(false);
            setSequenceIndex(null);
          }, 1800);
          sequenceTimersRef.current.push(finishId);
        }
      }, i * stepDelayMs);
      sequenceTimersRef.current.push(id);
    }
  }, [stopSequence]);

  const handleSelectPreset = (pct: number) => {
    stopSequence();
    setFillPct(pct);
  };

  const handleQualityResolved = useCallback((info: CapsuleQualityInfo) => {
    setQualityInfo(info);
  }, []);

  const isDark = themeMode === 'dark';
  const fillRatio = fillPct / 100;
  const healthState = resolveHealthState(fillRatio);
  const healthPalette = HEALTH_PALETTES[healthState];
  const reducedMotionOverride =
    motionPref === 'reduced' ? true : motionPref === 'full' ? false : undefined;

  return (
    <div
      className={`min-h-screen transition-colors px-4 py-4 sm:px-8 sm:py-6 flex flex-col gap-4 ${
        isDark
          ? 'bg-[#090c13] text-[#eef2f8]'
          : 'bg-[#f1f5fb] text-[#0f172a]'
      }`}
    >
      {/* Isolated Verification Header */}
      <header className="w-full max-w-[1120px] mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-semibold tracking-tight">
              CartAudit · Project Aether Verification
            </h1>
            <span
              data-testid="preview-health-badge"
              className="px-2 py-0.5 rounded-md text-[11px] font-semibold border"
              style={{
                color:
                  healthState === 'depleted'
                    ? isDark
                      ? '#fca5a5'
                      : '#991b1b'
                    : healthPalette.mainHex,
                borderColor:
                  healthState === 'depleted'
                    ? '#7f1d1d'
                    : `${healthPalette.mainHex}55`,
                backgroundColor:
                  healthState === 'depleted'
                    ? 'rgba(127, 29, 29, 0.2)'
                    : `${healthPalette.mainHex}18`,
              }}
            >
              {fillPct}% · {healthPalette.label}
            </span>
          </div>
          <p
            className={`text-xs ${
              isDark ? 'text-[#8b96aa]' : 'text-[#64748b]'
            }`}
          >
            {qualityInfo
              ? `Quality: ${qualityInfo.label} · WebGL: ${
                  qualityInfo.webglSupported ? 'Active' : 'Fallback'
                }${qualityInfo.isSoftwareGl ? ' (Software GL)' : ''}`
              : 'Probing graphics capabilities…'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
            }
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              isDark
                ? 'bg-[#141a26] border-[#273147] text-[#e2e8f0] hover:bg-[#1b2232]'
                : 'bg-white border-[#cbd5e1] text-[#1e293b] hover:bg-[#f8fafc]'
            }`}
          >
            Studio: {themeMode === 'dark' ? 'Dark' : 'Light'}
          </button>

          <label className="sr-only" htmlFor="aether-quality-select">
            Rendering Quality
          </label>
          <select
            id="aether-quality-select"
            value={quality}
            onChange={(e) =>
              setQuality(e.target.value as CapsuleQualityTier | 'auto')
            }
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
              isDark
                ? 'bg-[#141a26] border-[#273147] text-[#e2e8f0]'
                : 'bg-white border-[#cbd5e1] text-[#1e293b]'
            }`}
          >
            <option value="auto">Quality: Auto</option>
            <option value="high">Quality: High</option>
            <option value="medium">Quality: Medium</option>
            <option value="low">Quality: Low</option>
          </select>

          <label className="sr-only" htmlFor="aether-motion-select">
            Motion Preference
          </label>
          <select
            id="aether-motion-select"
            value={motionPref}
            onChange={(e) =>
              setMotionPref(e.target.value as MotionPreference)
            }
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium ${
              isDark
                ? 'bg-[#141a26] border-[#273147] text-[#e2e8f0]'
                : 'bg-white border-[#cbd5e1] text-[#1e293b]'
            }`}
          >
            <option value="auto">Motion: System</option>
            <option value="full">Motion: Full</option>
            <option value="reduced">Motion: Reduced</option>
          </select>

          <button
            type="button"
            onClick={() => setForceFallback((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              forceFallback
                ? 'bg-[#00b89c]/20 border-[#00e2c3] text-[#00f5d4]'
                : isDark
                  ? 'bg-[#141a26] border-[#273147] text-[#e2e8f0] hover:bg-[#1b2232]'
                  : 'bg-white border-[#cbd5e1] text-[#1e293b] hover:bg-[#f8fafc]'
            }`}
          >
            Fallback: {forceFallback ? 'On' : 'Off'}
          </button>
        </div>
      </header>

      {/* Isolated Fluid Simulation Controls (Never exposed on Production Overview) */}
      <section
        aria-label="Fluid Simulation Controls"
        className={`w-full max-w-[1120px] mx-auto rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
          isDark
            ? 'bg-[#101521] border-[#222a3d]'
            : 'bg-white border-[#d6deeb]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {TEST_PRESETS.map((pct) => {
            const active = fillPct === pct;
            return (
              <button
                key={pct}
                type="button"
                onClick={() => handleSelectPreset(pct)}
                className={`px-2.5 py-1 rounded-md border text-xs font-semibold tabular-nums transition-colors ${
                  active
                    ? isDark
                      ? 'bg-[#1e293b] border-[#38bdf8] text-white'
                      : 'bg-[#0f172a] border-[#0f172a] text-white'
                    : isDark
                      ? 'bg-[#151c2c] border-[#273147] text-[#cbd5e1] hover:bg-[#1d263b]'
                      : 'bg-[#f8fafc] border-[#cbd5e1] text-[#334155] hover:bg-[#eef2f6]'
                }`}
              >
                {pct}%
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[220px] max-w-[360px]">
          <label
            htmlFor="aether-fill-slider"
            className={`text-xs font-medium whitespace-nowrap ${
              isDark ? 'text-[#94a3b8]' : 'text-[#475569]'
            }`}
          >
            Fill Level
          </label>
          <input
            id="aether-fill-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={fillPct}
            onChange={(e) => {
              stopSequence();
              setFillPct(Number(e.target.value));
            }}
            className="flex-1 accent-[#00d4b8] cursor-pointer"
          />
          <span
            data-testid="preview-fill-readout"
            className="w-10 text-right text-xs font-semibold tabular-nums"
          >
            {fillPct}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sequenceRunning ? stopSequence : startSequence}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              sequenceRunning
                ? 'bg-[#ff2a5f]/15 border-[#ff2a5f] text-[#ff5c85]'
                : isDark
                  ? 'bg-[#00b89c]/15 border-[#00d4b8]/60 text-[#2affdf] hover:bg-[#00b89c]/25'
                  : 'bg-[#0f766e] border-[#0f766e] text-white hover:bg-[#0d655e]'
            }`}
          >
            {sequenceRunning
              ? `Stop Sequence (${SEQUENCE_STEPS[sequenceIndex ?? 0]}%)`
              : 'Run Sequence (100→30→10→75→0→100)'}
          </button>
        </div>
      </section>

      {/* Unobstructed Studio Stage */}
      <main className="w-full max-w-[1120px] mx-auto flex-1 flex items-center justify-center">
        <div className="w-full h-[540px] sm:h-[600px]">
          <BudgetCapsule3D
            themeMode={themeMode}
            quality={quality}
            fillRatio={fillRatio}
            reducedMotion={reducedMotionOverride}
            forceFallback={forceFallback}
            minHeight={500}
            onQualityResolved={handleQualityResolved}
          />
        </div>
      </main>
    </div>
  );
}
