#!/usr/bin/env node
/* 개발 — src/legacy/ 를 고치면 번들을 다시 만들고, game/ 을 정적 서버로 띄운다. "고치고 새로고침" 흐름 그대로. */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
spawn(process.execPath, [path.join(ROOT, 'tools', 'bundle.mjs'), '--watch'], { stdio: 'inherit' });
spawn(process.execPath, [path.join(ROOT, 'tests', 'serve.mjs')], { stdio: 'inherit' });
