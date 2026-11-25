import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPennyChatSystemInstruction,
  buildQuickLogSystemInstruction,
} from './pennyPrompts';

test('buildPennyChatSystemInstruction includes INR grounding, categories, and multi-item log_expenses action', () => {
  const prompt = buildPennyChatSystemInstruction({
    activeScreen: 'overview',
    resolvedSummary: 'Auto · Crisp',
    topFocus: 'groceries',
    styleDirectives: ['Length style: Ultra crisp.'],
    availableCategories: ['Groceries', 'Snacks & Beverages', 'Utilities & Bills'],
    asOfDate: '2026-11-25',
  });

  assert.match(prompt, /Active workspace: "overview"/);
  assert.match(prompt, /Today's local date is 2026-11-25/);
  assert.match(prompt, /log_expenses/);
  assert.match(prompt, /Groceries, Snacks & Beverages, Utilities & Bills/);
  assert.match(prompt, /trueSafeToSpend/);
});

test('buildQuickLogSystemInstruction instructs multi-item extraction, combined totals, quantity math, and JSON schema', () => {
  const prompt = buildQuickLogSystemInstruction({
    safeToday: '2026-11-25',
    allowedCategories: ['Groceries', 'Snacks & Beverages', 'Fuel & Transportation'],
    outputFormat: 'groq_json',
  });

  assert.match(prompt, /Today's local date is 2026-11-25/);
  assert.match(prompt, /MULTIPLE ITEMS/);
  assert.match(prompt, /COMBINED SINGLE TOTAL/);
  assert.match(prompt, /QUANTITY MATH/);
  assert.match(prompt, /"expenses": \[/);
  assert.match(prompt, /Fuel & Transportation/);
});
