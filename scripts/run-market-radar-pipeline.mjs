#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const steps = [
  {
    name: 'Process market signals',
    command: 'node',
    args: ['scripts/process-market-signals.mjs', '--write'],
  },
  {
    name: 'Recalculate category opportunities',
    command: 'node',
    args: ['scripts/recalculate-category-opportunities.mjs'],
  },
  {
    name: 'Sync Growth System to Baserow',
    command: 'node',
    args: ['scripts/sync-baserow-growth-all.mjs'],
  },
];

for (const step of steps) {
  console.log(`\n=== ${step.name} ===`);

  const result = spawnSync(step.command, step.args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    console.error(`\nPipeline failed on step: ${step.name}`);
    process.exit(result.status || 1);
  }
}

console.log('\nMarket Radar pipeline completed successfully.');
