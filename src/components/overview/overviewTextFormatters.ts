import type { AetherProjectedBalance } from './capsule/aetherIntelligence';

export function formatCycleDayCounter(
  daysElapsed: number,
  daysTotal: number,
  daysRemaining: number
): string {
  const safeTotal = Math.max(1, Math.round(daysTotal));
  const safeElapsed = Math.min(safeTotal, Math.max(1, Math.round(daysElapsed)));
  const safeRemaining = Math.max(0, Math.round(daysRemaining));
  return `Day ${safeElapsed}/${safeTotal} · ${safeRemaining}d left`;
}

export function formatSafeDailySubtext(
  remainingFutureDays: number,
  _daysElapsed?: number,
  _daysTotal?: number
): string {
  const futureDays = Math.max(0, Math.round(remainingFutureDays));

  if (futureDays <= 0) {
    return 'Final day of cycle';
  }
  return `For next ${futureDays} ${futureDays === 1 ? 'day' : 'days'}`;
}

export function buildTrajectorySubtitle(flags: {
  hasPace: boolean;
  hasProjection: boolean;
  hasCategory: boolean;
}): string {
  const parts: string[] = [];
  if (flags.hasPace) parts.push('daily burn vs. target');
  if (flags.hasProjection) parts.push('cycle-end projection');
  if (flags.hasCategory) parts.push('category watch');

  if (parts.length === 0) {
    return 'Cycle pacing and spend trajectory';
  }
  const joined =
    parts.length === 1
      ? parts[0]
      : parts.length === 2
        ? `${parts[0]} and ${parts[1]}`
        : `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

export function formatTrajectoryProjectionTitle(
  outcome: AetherProjectedBalance['outcome']
): string {
  if (outcome === 'overspend') {
    return 'Projected cycle-end overspend';
  }
  return 'Cycle-end projection';
}

export function formatRecurringSubtitle(subtitle: string, itemTitle: string): string {
  const rawSegments = subtitle
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean);

  if (rawSegments.length === 0) return '';

  const normalizedTitle = itemTitle.trim().toLowerCase();
  const formattedSegments: string[] = [];

  for (let i = 0; i < rawSegments.length; i++) {
    let seg = rawSegments[i];
    if (i === 0) {
      seg = seg.charAt(0).toUpperCase() + seg.slice(1);
    }

    // Skip unit segment if the item title already displays it (e.g. "Milk (1 L)" + "1 L")
    const isDuplicateUnit =
      i > 0 &&
      seg.length <= 16 &&
      !/^due/i.test(seg) &&
      !/^overdue/i.test(seg) &&
      normalizedTitle.includes(seg.toLowerCase());

    if (!isDuplicateUnit) {
      formattedSegments.push(seg);
    }
  }

  return formattedSegments.join(' · ');
}

export function cleanAttentionSignalCopy(input: {
  title: string;
  description: string;
  metric?: string;
}): { title: string; description: string; metric?: string } {
  let title = input.title
    .replace(/\s*\(elapsed match\)/gi, ' (same-day pace)')
    .replace(/\s+/g, ' ')
    .trim();

  let description = input.description
    .replace(/\s*\(elapsed match\)/gi, ' (same-day pace)')
    .replace(/\s*Average daily expenditure is ₹[\d,.]+\/day\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Avoid repeating the exact percentage/amount in both title and metric column if redundant
  const metric = input.metric?.trim() || undefined;
  if (metric) {
    const bareMetric = metric.replace(/^[+-]/, '');
    // Trim redundant trailing "Down X%" / "rose X%" duplication ONLY if metric carries the exact figure
    if (title.toLowerCase().includes(bareMetric.toLowerCase())) {
      title = title
        .replace(new RegExp(`\\s*by\\s+${escapeRegExp(bareMetric)}(?=\\s|$|[.,;:])`, 'i'), '')
        .replace(new RegExp(`\\s+${escapeRegExp(bareMetric)}(?=\\s|$|[.,;:])`, 'i'), '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
  }

  return { title, description, metric };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
