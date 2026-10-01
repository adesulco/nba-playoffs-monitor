#!/usr/bin/env node
// Build gate: competitions.json must match competitions.js (doc 17 §2.1).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const r = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'build-registry.mjs'), '--check'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
