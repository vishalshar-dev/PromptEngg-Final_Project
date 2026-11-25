import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrajectorySubtitle,
  cleanAttentionSignalCopy,
  formatCycleDayCounter,
  formatRecurringSubtitle,
  formatSafeDailySubtext,
  formatTrajectoryProjectionTitle,
} from './overviewTextFormatters';

test('formatCycleDayCounter produces compact single-line day and remaining counter', () => {
  assert.equal(formatCycleDayCounter(25, 30, 6), 'Day 25/30 · 6d left');
  assert.equal(formatCycleDayCounter(35, 30, 0), 'Day 30/30 · 0d left');
});

test('formatSafeDailySubtext clarifies remaining future days vs final day', () => {
  assert.equal(formatSafeDailySubtext(5, 25, 30), 'For next 5 days');
  assert.equal(formatSafeDailySubtext(1, 29, 30), 'For next 1 day');
  assert.equal(formatSafeDailySubtext(0, 30, 30), 'Final day of cycle');
});

test('buildTrajectorySubtitle reflects only active panels', () => {
  assert.equal(
    buildTrajectorySubtitle({ hasPace: true, hasProjection: false, hasCategory: false }),
    'Daily burn vs. target'
  );
  assert.equal(
    buildTrajectorySubtitle({ hasPace: true, hasProjection: true, hasCategory: false }),
    'Daily burn vs. target and cycle-end projection'
  );
  assert.equal(
    buildTrajectorySubtitle({ hasPace: true, hasProjection: true, hasCategory: true }),
    'Daily burn vs. target, cycle-end projection, and category watch'
  );
});

test('formatTrajectoryProjectionTitle avoids redundant estimate wording', () => {
  assert.equal(formatTrajectoryProjectionTitle('remaining'), 'Cycle-end projection');
  assert.equal(formatTrajectoryProjectionTitle('even'), 'Cycle-end projection');
  assert.equal(formatTrajectoryProjectionTitle('overspend'), 'Projected cycle-end overspend');
});

test('formatRecurringSubtitle capitalizes frequency and deduplicates unit in title', () => {
  assert.equal(
    formatRecurringSubtitle('weekly · 1 L · Due in 6d', 'Taaza Toned Fresh Milk (1 L)'),
    'Weekly · Due in 6d'
  );
  assert.equal(
    formatRecurringSubtitle('monthly · 500 g · Due tomorrow', 'Whole Wheat Atta'),
    'Monthly · 500 g · Due tomorrow'
  );
});

test('cleanAttentionSignalCopy removes elapsed-match jargon, duplicate numbers, and unrelated daily average', () => {
  const spendJump = cleanAttentionSignalCopy({
    title: 'Expenditure rose 1.68% vs 1 Oct–25 Oct (elapsed match)',
    description: 'Spending increased by ₹115.5 (₹7,005.5 vs ₹6,890).',
    metric: '+1.68%',
  });
  assert.equal(spendJump.title, 'Expenditure rose vs 1 Oct–25 Oct (same-day pace)');
  assert.equal(spendJump.metric, '+1.68%');

  const categoryConc = cleanAttentionSignalCopy({
    title: 'Groceries is your largest spending category',
    description:
      'Groceries accounts for 30.22% of total expenditure (₹2,117 across Nov 2026). Average daily expenditure is ₹280.22/day.',
    metric: '30.22%',
  });
  assert.equal(
    categoryConc.description,
    'Groceries accounts for 30.22% of total expenditure (₹2,117 across Nov 2026).'
  );
});
