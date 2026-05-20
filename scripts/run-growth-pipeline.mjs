#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const scripts = [
  'scripts/sync-baserow-market-signal-statuses.mjs',
  'scripts/process-market-signals.mjs',
  'scripts/sync-baserow-growth-all.mjs',
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

console.log('\nGrowth pipeline completed successfully.');
