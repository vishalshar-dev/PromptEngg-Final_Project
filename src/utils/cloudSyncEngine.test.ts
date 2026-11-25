import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PENNY_PROFILE } from './pennyEngine';
import { DEFAULT_FEATURE_SETTINGS, DEFAULT_VISUAL_THEME } from './settingsEngine';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_CAPS,
  DEFAULT_ITEMS,
} from './storeHelpers';
import { DEFAULT_BROKE_MODE_CONFIG } from './warRoomEngine';
import {
  applyCloudSectionsToBackup,
  backupToSyncableState,
  buildSectionPayloads,
  computeSectionHashes,
  formatReadableSyncError,
  hasMeaningfulWorkspaceData,
  sanitizeForFirestore,
  smartMergeLocalAndCloud,
  type SyncableWorkspaceState,
} from './cloudSyncEngine';

function createEmptyState(): SyncableWorkspaceState {
  return {
    items: DEFAULT_ITEMS.map((it) => ({ ...it, quantity: 0 })),
    transactions: [],
    totalBudget: 5000,
    sessionBudget: null,
    isBrokeMode: false,
    brokeModeConfig: { ...DEFAULT_BROKE_MODE_CONFIG },
    categoryLimits: [],
    warRoomChallenges: [],
    warRoomTargets: [],
    dismissedWarRoomAlerts: [],
    disciplineCheckIns: [],
    categories: DEFAULT_CATEGORIES,
    categoryConfigs: [],
    categoryCaps: DEFAULT_CATEGORY_CAPS,
    priceHistory: {},
    purchaseHistory: [],
    basketTemplates: [],
    basketTemplatesSeeded: true,
    priceObservations: [],
    priceAlerts: [],
    savedAudits: [],
    people: [],
    sharedExpenses: [],
    settlements: [],
    theme: 'light',
    visualTheme: { ...DEFAULT_VISUAL_THEME },
    featureSettings: { ...DEFAULT_FEATURE_SETTINGS },
    pennyMessages: [],
    pennyProfile: { ...DEFAULT_PENNY_PROFILE },
    myUpiId: '',
    myUpiName: '',
  };
}

test('sanitizeForFirestore recursively strips undefined fields and invalid numbers', () => {
  const cleaned = sanitizeForFirestore({
    a: 10,
    b: undefined,
    nested: { ok: 'yes', drop: undefined, badNum: Number.NaN },
    arr: [1, undefined, { x: undefined, y: 'ok' }],
  });

  assert.deepEqual(cleaned, {
    a: 10,
    nested: { ok: 'yes', badNum: 0 },
    arr: [1, { y: 'ok' }],
  });
});

test('buildSectionPayloads compresses default catalog items to changed overrides and preserves custom items', () => {
  const base = createEmptyState();
  assert.equal(hasMeaningfulWorkspaceData(base), false);

  base.items[0] = { ...base.items[0], quantity: 2, isFavourite: true };
  base.items.unshift({
    id: 'custom-protein',
    name: 'Whey Protein',
    price: 1850,
    category: 'Groceries',
    icon: '🥛',
    quantity: 1,
    isCustom: true,
  });

  assert.equal(hasMeaningfulWorkspaceData(base), true);

  const sections = buildSectionPayloads(base, DEFAULT_ITEMS);
  assert.equal(sections.catalog.customItems.length, 1);
  assert.equal(sections.catalog.customItems[0].id, 'custom-protein');
  assert.equal(sections.catalog.defaultOverrides.length >= 1, true);
  assert.equal(
    sections.catalog.defaultOverrides.some((ov) => ov.id === DEFAULT_ITEMS[0].id && ov.quantity === 2),
    true
  );

  const restored = applyCloudSectionsToBackup(sections, createEmptyState(), DEFAULT_ITEMS);
  const restoredMilk = restored.customItems.find((i) => i.id === DEFAULT_ITEMS[0].id);
  const restoredCustom = restored.customItems.find((i) => i.id === 'custom-protein');
  assert.equal(restoredMilk?.quantity, 2);
  assert.equal(restoredCustom?.name, 'Whey Protein');
});

test('computeSectionHashes detects section-level changes cleanly', () => {
  const stateA = createEmptyState();
  const stateB = createEmptyState();
  stateB.transactions = [
    {
      id: 'tx-1',
      name: 'Coffee',
      amount: 120,
      category: 'Snacks & Beverages',
      timestamp: '2026-11-21T08:00:00.000Z',
    },
  ];

  const hashA = computeSectionHashes(buildSectionPayloads(stateA, DEFAULT_ITEMS));
  const hashB = computeSectionHashes(buildSectionPayloads(stateB, DEFAULT_ITEMS));

  assert.notEqual(hashA.ledger, hashB.ledger);
  assert.equal(hashA.splits, hashB.splits);
  assert.equal(hashA.settings, hashB.settings);
});

test('smartMergeLocalAndCloud combines transactions, splits, and Penny messages without duplicates', () => {
  const local = createEmptyState();
  local.transactions = [
    {
      id: 'tx-local',
      name: 'Metro Card',
      amount: 200,
      category: 'Fuel & Transportation',
      timestamp: '2026-11-21T10:00:00.000Z',
    },
    {
      id: 'tx-shared',
      name: 'Tea',
      amount: 40,
      category: 'Snacks & Beverages',
      timestamp: '2026-11-21T07:00:00.000Z',
    },
  ];
  local.people = [{ id: 'p-1', name: 'Rahul', createdAt: '2026-11-20T00:00:00.000Z' }];
  local.pennyMessages = [
    {
      id: 'm-local',
      role: 'user',
      text: 'local question',
      timestamp: '2026-11-21T09:00:00.000Z',
    },
  ];

  const cloudState = createEmptyState();
  cloudState.transactions = [
    {
      id: 'tx-cloud',
      name: 'Rice',
      amount: 180,
      category: 'Groceries',
      timestamp: '2026-11-21T08:00:00.000Z',
    },
    {
      id: 'tx-shared',
      name: 'Tea',
      amount: 40,
      category: 'Snacks & Beverages',
      timestamp: '2026-11-21T07:00:00.000Z',
    },
  ];
  cloudState.people = [{ id: 'p-2', name: 'Priya', createdAt: '2026-11-20T00:00:00.000Z' }];
  cloudState.pennyMessages = [
    {
      id: 'm-cloud',
      role: 'assistant',
      text: 'cloud reply',
      timestamp: '2026-11-21T08:00:00.000Z',
    },
  ];

  const cloudSections = buildSectionPayloads(cloudState, DEFAULT_ITEMS);
  const merged = smartMergeLocalAndCloud(local, cloudSections, DEFAULT_ITEMS);

  assert.equal(merged.transactions.length, 3);
  assert.deepEqual(
    merged.transactions.map((t) => t.id),
    ['tx-local', 'tx-cloud', 'tx-shared']
  );
  assert.equal(merged.people?.length, 2);
  assert.equal(merged.pennyMessages?.length, 2);
});

test('backupToSyncableState preserves settings, wellness, and Penny profile for accurate conflict hashing', () => {
  const local = createEmptyState();
  const cloud = createEmptyState();
  cloud.theme = 'dark';
  cloud.visualTheme = {
    mood: 'titanium_amber',
    surface: 'tactile_wells',
    font: 'bricolage_dm',
    motion: 'rich_tactile',
  };
  cloud.isBrokeMode = true;
  cloud.pennyProfile = {
    ...DEFAULT_PENNY_PROFILE,
    tonePreference: 'crisp',
    messageCount: 5,
  };

  const cloudSections = buildSectionPayloads(cloud, DEFAULT_ITEMS);
  const backup = applyCloudSectionsToBackup(cloudSections, local, DEFAULT_ITEMS);
  assert.deepEqual(backup.visualTheme, cloud.visualTheme);
  const hydratedCloud = backupToSyncableState(backup, local);
  assert.deepEqual(hydratedCloud.visualTheme, cloud.visualTheme);

  const localHashes = computeSectionHashes(buildSectionPayloads(local, DEFAULT_ITEMS));
  const cloudHashes = computeSectionHashes(buildSectionPayloads(hydratedCloud, DEFAULT_ITEMS));

  assert.notEqual(localHashes.settings, cloudHashes.settings);
  assert.notEqual(localHashes.wellness, cloudHashes.wellness);
  assert.notEqual(localHashes.penny, cloudHashes.penny);
  assert.equal(localHashes.ledger, cloudHashes.ledger);
});

test('formatReadableSyncError explains popup-blocked clearly and enables open_new_tab recovery', () => {
  const err = Object.assign(new Error('Firebase: Error (auth/popup-blocked).'), {
    code: 'auth/popup-blocked',
  });
  const iframeResult = formatReadableSyncError(err, { inIframe: true });
  assert.equal(iframeResult.code, 'auth/popup-blocked');
  assert.equal(iframeResult.action, 'open_new_tab');
  assert.match(iframeResult.message, /embedded preview frame/i);

  const standaloneResult = formatReadableSyncError(err, { inIframe: false });
  assert.equal(standaloneResult.code, 'auth/popup-blocked');
  assert.equal(standaloneResult.action, 'open_new_tab');
  assert.match(standaloneResult.message, /browser blocked the Google sign-in popup/i);
});

test('formatReadableSyncError formats unauthorized-domain, quota, offline, and JSON Firestore errors', () => {
  const domainErr = Object.assign(new Error('Firebase: Error (auth/unauthorized-domain).'), {
    code: 'auth/unauthorized-domain',
  });
  const domainRes = formatReadableSyncError(domainErr, { hostname: 'localhost' });
  assert.equal(domainRes.code, 'auth/unauthorized-domain');
  assert.match(domainRes.message, /localhost/);
  assert.match(domainRes.message, /Authorized domains/);

  const quotaRes = formatReadableSyncError(
    new Error('Free daily read units per project Quota exceeded'),
    { projectId: 'proj-1', firestoreDatabaseId: 'db-1' }
  );
  assert.match(quotaRes.message, /quota exceeded/i);
  assert.match(quotaRes.quotaUrl ?? '', /proj-1\/firestore\/databases\/db-1/);

  const offlineRes = formatReadableSyncError(
    Object.assign(new Error('network error'), { code: 'auth/network-request-failed' })
  );
  assert.match(offlineRes.message, /offline/i);

  const jsonRes = formatReadableSyncError(new Error('{"error":"Missing or insufficient permissions."}'));
  assert.equal(jsonRes.message, 'Missing or insufficient permissions.');
});

