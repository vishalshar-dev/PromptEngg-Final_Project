import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { inferCategoryFromName } from '../utils/priceTrackerEngine';
import { classifyTransaction } from '../utils/warRoomEngine';

const CATALOG_PATH = path.resolve(process.cwd(), 'src/data/martCatalog.ts');
const IMAGES_DIR = path.resolve(process.cwd(), 'src/assets/images');

test('martCatalog imports only existing image files and maintains unique product ids', () => {
  const src = fs.readFileSync(CATALOG_PATH, 'utf8');

  const importMatches = Array.from(
    src.matchAll(/import\s+(\w+)\s+from\s+'\.\.\/assets\/images\/([^']+\.jpg)'/g)
  );
  assert.ok(importMatches.length >= 60, `Expected >=60 image imports, found ${importMatches.length}`);

  const importedVars = new Set<string>();
  for (const [, varName, fileName] of importMatches) {
    importedVars.add(varName);
    const fullImgPath = path.join(IMAGES_DIR, fileName);
    assert.ok(fs.existsSync(fullImgPath), `Missing imported asset file: ${fileName}`);
  }

  // Extract items block from INITIAL_MART_ITEMS
  const itemsStart = src.indexOf('export const INITIAL_MART_ITEMS');
  const itemsEnd = src.indexOf('const INITIAL_BY_ID');
  assert.ok(itemsStart > 0 && itemsEnd > itemsStart);
  const itemsBlock = src.slice(itemsStart, itemsEnd);

  const itemEntries = Array.from(
    itemsBlock.matchAll(
      /id:\s*'([^']+)'[\s\S]*?name:\s*['"]([^'"]+)['"][\s\S]*?category:\s*'([^']+)'[\s\S]*?imageUrl:\s*(\w+)/g
    )
  );

  assert.ok(itemEntries.length >= 85, `Expected >=85 catalog items, found ${itemEntries.length}`);

  const ids = new Set<string>();
  const byCategory = new Map<string, Array<{ id: string; name: string; imgVar: string }>>();

  for (const [, id, name, category, imgVar] of itemEntries) {
    assert.equal(ids.has(id), false, `Duplicate catalog item id: ${id}`);
    ids.add(id);
    assert.ok(importedVars.has(imgVar), `Item ${id} references unknown image var ${imgVar}`);
    const list = byCategory.get(category) ?? [];
    list.push({ id, name, imgVar });
    byCategory.set(category, list);
  }

  // Fruits & Vegetables and Meat & Eggs must have 100% unique product images (zero duplicates)
  for (const strictCat of ['Fruits & Vegetables', 'Meat & Eggs']) {
    const list = byCategory.get(strictCat) ?? [];
    assert.ok(list.length > 0, `Expected items in ${strictCat}`);
    const seen = new Set<string>();
    for (const entry of list) {
      assert.equal(
        seen.has(entry.imgVar),
        false,
        `Duplicate photo ${entry.imgVar} inside ${strictCat} (item: ${entry.id})`
      );
      seen.add(entry.imgVar);
    }
  }

  // No two adjacent items in everyday food/care/cleaning/household categories share the same photo
  const spacedCats = [
    'Groceries',
    'Dairy & Bakery',
    'Breakfast & Instant Food',
    'Snacks & Beverages',
    'Personal Care',
    'Household Essentials',
    'Cleaning Supplies',
  ];
  for (const cat of spacedCats) {
    const list = byCategory.get(cat) ?? [];
    assert.ok(list.length >= 5, `Expected expanded items in ${cat}, got ${list.length}`);
    for (let i = 1; i < list.length; i++) {
      assert.notEqual(
        list[i].imgVar,
        list[i - 1].imgVar,
        `Adjacent items ${list[i - 1].id} and ${list[i].id} in ${cat} share ${list[i].imgVar}`
      );
    }
  }

  // Popular items (shown in Home "Popular Everyday Essentials" shelf) have zero duplicates
  const popularEntries = Array.from(
    itemsBlock.matchAll(
      /id:\s*'([^']+)'[\s\S]*?imageUrl:\s*(\w+)[\s\S]{0,160}?isPopular:\s*true/g
    )
  );
  assert.ok(popularEntries.length >= 8, `Expected >=8 popular items, found ${popularEntries.length}`);
  const popImages = new Set<string>();
  for (const [, id, imgVar] of popularEntries.slice(0, 8)) {
    assert.equal(popImages.has(imgVar), false, `Popular shelf duplicate photo ${imgVar} on ${id}`);
    popImages.add(imgVar);
  }
});

test('inferCategoryFromName and War Room classify new everyday Indian staples accurately', () => {
  assert.equal(inferCategoryFromName('iD Fresh Idli & Dosa Batter 1kg'), 'Breakfast & Instant Food');
  assert.equal(inferCategoryFromName('Tata Sampann Poha 500g'), 'Breakfast & Instant Food');
  assert.equal(inferCategoryFromName('Fresh Bhindi & Gobhi 750g'), 'Fruits & Vegetables');
  assert.equal(inferCategoryFromName('Mangaldeep Agarbatti Pack'), 'Household Essentials');
  assert.equal(inferCategoryFromName('Fortune Kachi Ghani Mustard Oil 1L'), 'Groceries');

  const pohaTx = classifyTransaction({
    id: 'tx-poha',
    name: 'Thick Indori Poha Flakes',
    amount: 52,
    category: 'Breakfast & Instant Food',
    timestamp: '2026-11-20T10:00:00.000Z',
    status: 'active',
  });
  assert.equal(pohaTx.classification, 'essential');

  const veggiesTx = classifyTransaction({
    id: 'tx-veg',
    name: 'Fresh Bhindi & Gobhi',
    amount: 58,
    category: 'Fruits & Vegetables',
    timestamp: '2026-11-20T10:00:00.000Z',
    status: 'active',
  });
  assert.equal(veggiesTx.classification, 'essential');
});
