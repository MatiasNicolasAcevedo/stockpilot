#!/usr/bin/env node
// Clasificador determinista de la política de verificación (docs/TESTING.md).
// Uso: node scripts/ci/classify-diff.mjs --base <sha|ref> --head <sha|ref> --phase <BOOTSTRAP|FULL>
// Imprime en stdout líneas key=value aptas para $GITHUB_OUTPUT: policy, changed, reason.
// Ante cualquier duda (diff ilegible, renombres/borrados, rutas fuera de la allowlist) elige la fase técnica.
// Este archivo es código de CI: modificarlo nunca califica como DOCS_ONLY.
import { execFileSync } from 'node:child_process';

const DOCS_ONLY_ALLOWLIST = [/\.md$/, /^docs\//, /^LICENSE$/];
const PHASES = new Set(['BOOTSTRAP', 'FULL']);

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function emit(policy, changed, reason) {
  process.stdout.write(`policy=${policy}\nchanged=${changed}\nreason=${reason}\n`);
}

const base = arg('base');
const head = arg('head') ?? 'HEAD';
const phase = arg('phase');

if (!PHASES.has(phase)) {
  console.error(`classify-diff: fase inválida "${phase}"`);
  process.exit(2);
}
if (!base || /^0+$/.test(base)) {
  emit(phase, 0, 'sin base comparable');
  process.exit(0);
}

let lines;
try {
  const out = execFileSync('git', ['diff', '--name-status', '-M', `${base}...${head}`], { encoding: 'utf8' });
  lines = out.split('\n').filter(Boolean);
} catch (error) {
  console.error(`classify-diff: no se pudo calcular el diff (${error.message.split('\n')[0]})`);
  emit(phase, 0, 'error del clasificador');
  process.exit(0);
}

const offending = [];
for (const line of lines) {
  const [status, ...paths] = line.split('\t');
  const path = paths[paths.length - 1];
  const statusOk = status === 'A' || status === 'M';
  const pathOk = DOCS_ONLY_ALLOWLIST.some((re) => re.test(path));
  console.error(`  ${status}\t${paths.join(' -> ')}${statusOk && pathOk ? '' : '  [técnico]'}`);
  if (!statusOk || !pathOk) offending.push(path);
}

if (lines.length === 0) {
  emit(phase, 0, 'diff vacío');
} else if (offending.length === 0) {
  emit('DOCS_ONLY', lines.length, 'solo documentación permitida');
} else {
  emit(phase, lines.length, `${offending.length} ruta(s) técnicas`);
}
