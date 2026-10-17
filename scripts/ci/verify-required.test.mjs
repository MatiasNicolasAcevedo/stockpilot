#!/usr/bin/env node
// Matriz del agregado verify-required (T-003 AC-09): node --test scripts/ci/
// Ejecuta el script real con el entorno que le pasa ci.yml. VERIFY_REQUIRED_SCRIPT permite correrla contra otra versión.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = resolve(process.env.VERIFY_REQUIRED_SCRIPT ?? join(dirname(fileURLToPath(import.meta.url)), 'verify-required.mjs'));
const workspace = mkdtempSync(join(tmpdir(), 'stockpilot-verify-required-'));
after(() => rmSync(workspace, { recursive: true, force: true }));

const CONTROLLED = ['GATE_PHASE', 'POLICY', 'DRAFT', 'BASE', 'HEAD', 'CLASSIFY', 'DOCS', 'SERVER', 'CLIENT', 'E2E', 'GITHUB_STEP_SUMMARY'];
const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => !CONTROLLED.includes(key)));
const JOBS = ['CLASSIFY', 'DOCS', 'SERVER', 'CLIENT', 'E2E'];
const TECHNICAL = ['SERVER', 'CLIENT', 'E2E'];
// null = variable ausente (needs.<job>.result vacío o job inexistente); el resto son valores no exitosos posibles.
const NOT_SUCCESS = [null, '', 'pending', 'skipped', 'cancelled', 'failure', 'neutral'];

const GREEN_FULL = { GATE_PHASE: 'FULL', POLICY: 'FULL', DRAFT: 'false', BASE: 'b'.repeat(40), HEAD: 'c'.repeat(40),
  CLASSIFY: 'success', DOCS: 'success', SERVER: 'success', CLIENT: 'success', E2E: 'success' };
const GREEN_DOCS_ONLY = { ...GREEN_FULL, POLICY: 'DOCS_ONLY', SERVER: 'skipped', CLIENT: 'skipped', E2E: 'skipped' };

function run(overrides, extra = {}) {
  const env = { ...inherited, ...extra };
  for (const [key, value] of Object.entries(overrides)) if (value !== null) env[key] = value;
  const result = spawnSync(process.execPath, [SCRIPT], { env, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout };
}
const show = (value) => (value === null ? 'ausente' : JSON.stringify(value));
const rejected = (overrides, why) => {
  const result = run(overrides);
  assert.equal(result.status, 1, `${why} debía rechazar:\n${result.stdout}`);
  assert.match(result.stdout, /::error::/);
  return result;
};

test('FULL verde: docs/server/client/e2e success, no draft', () => {
  const result = run(GREEN_FULL);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /verde para la política FULL/);
});

test('DOCS_ONLY verde: docs success y suites técnicas skipped', () => {
  const result = run(GREEN_DOCS_ONLY);
  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /verde para la política DOCS_ONLY/);
});

test('FULL rechaza cualquier job exigido ausente/pending/skipped/cancelled/failure', () => {
  for (const job of JOBS) for (const value of NOT_SUCCESS) rejected({ ...GREEN_FULL, [job]: value }, `FULL ${job}=${show(value)}`);
});

test('DOCS_ONLY rechaza clasificador o docs no exitosos', () => {
  for (const job of ['CLASSIFY', 'DOCS']) {
    for (const value of NOT_SUCCESS) rejected({ ...GREEN_DOCS_ONLY, [job]: value }, `DOCS_ONLY ${job}=${show(value)}`);
  }
});

test('DOCS_ONLY rechaza suites técnicas que no estén skipped (ejecutadas, ausentes o pendientes)', () => {
  for (const job of TECHNICAL) {
    for (const value of [null, '', 'pending', 'success', 'failure', 'cancelled']) {
      rejected({ ...GREEN_DOCS_ONLY, [job]: value }, `DOCS_ONLY ${job}=${show(value)}`);
    }
  }
});

test('draft rechaza aunque todas las suites estén verdes', () => {
  for (const green of [GREEN_FULL, GREEN_DOCS_ONLY]) {
    assert.match(rejected({ ...green, DRAFT: 'true' }, `draft ${green.POLICY}`).stdout, /DRAFT: rechazo intencional/);
  }
});

test('estado draft desconocido o ausente rechaza', () => {
  for (const value of [null, '', 'TRUE', 'yes']) rejected({ ...GREEN_FULL, DRAFT: value }, `DRAFT=${show(value)}`);
});

test('política ausente, de fase vieja o desconocida rechaza', () => {
  for (const value of [null, '', 'BOOTSTRAP', 'DRAFT', 'docs_only', 'UNKNOWN']) {
    rejected({ ...GREEN_FULL, POLICY: value }, `POLICY=${show(value)}`);
  }
});

test('fase distinta de FULL rechaza', () => {
  for (const value of [null, '', 'BOOTSTRAP', 'full']) {
    rejected({ ...GREEN_FULL, GATE_PHASE: value, POLICY: value ?? 'FULL' }, `GATE_PHASE=${show(value)}`);
  }
});

test('resumen del job informa política, base/HEAD, jobs y resultado (verde y rechazo)', () => {
  for (const [overrides, expected] of [[GREEN_FULL, 'verde para la política FULL'], [{ ...GREEN_FULL, E2E: 'cancelled' }, 'rechazado: FULL exige e2e verde (cancelled)']]) {
    const summary = join(workspace, `summary-${expected.length}.md`);
    run(overrides, { GITHUB_STEP_SUMMARY: summary });
    const text = readFileSync(summary, 'utf8');
    assert.match(text, /### verify-required/);
    assert.ok(text.includes(`\`${'b'.repeat(40)}\` / \`${'c'.repeat(40)}\``));
    assert.ok(text.includes(`e2e=${overrides.E2E}`));
    assert.ok(text.includes(expected), text);
  }
});
