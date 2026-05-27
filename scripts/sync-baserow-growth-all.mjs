#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const scripts = [
  'scripts/sync-baserow-content-tasks.mjs',
  'scripts/sync-baserow-category-opportunities.mjs',
  'scripts/sync-baserow-operator-category-opportunities.mjs',
  'scripts/sync-baserow-operator-content-tasks.mjs',
  'scripts/sync-baserow-scout-prospects.mjs',
  'scripts/sync-baserow-market-signals.mjs',
];

for (const script of scripts) {
  console.log(`\n=== Running ${script} ===`);

  const result = spawnSync('node', [script], {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    console.error(`\nFailed: ${script}`);
    process.exit(result.status || 1);
  }
}

console.log('\nAll Baserow Growth sync scripts completed successfully.');
