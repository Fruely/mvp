#!/usr/bin/env node

const major = Number.parseInt(process.versions.node.split(".")[0], 10);
const isSupported = Number.isFinite(major) && major >= 20 && major < 23;

if (!isSupported) {
  console.error("");
  console.error("ERROR: Unsupported Node.js version for this project.");
  console.error(`Current: v${process.versions.node}`);
  console.error("Required: >=20 <23 (Node 20 LTS recommended).");
  console.error("");
  console.error("Fix:");
  console.error("  nvm install 20 && nvm use 20");
  console.error("");
  process.exit(1);
}
