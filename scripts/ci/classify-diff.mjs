#!/usr/bin/env node
// Clasificador determinista de la política de verificación (docs/TESTING.md).
// Uso: node scripts/ci/classify-diff.mjs --base <sha|ref> --head <sha|ref> --phase <BOOTSTRAP|FULL>
// Imprime en stdout líneas key=value aptas para $GITHUB_OUTPUT: policy, changed, reason.
// DOCS_ONLY solo si cada entrada es un archivo regular agregado/modificado de la allowlist. Ante cualquier duda
// (diff ilegible, renombres/borrados, modos no regulares, rutas fuera de la allowlist) elige la fase técnica.
// Este archivo es código de CI: modificarlo nunca califica como DOCS_ONLY. Regresiones: classify-diff.test.mjs.
import { execFileSync } from 'node:child_process';

// Markdown de raíz, docs/**/*.md, AGENTS.md/CLAUDE.md conocidos de server/client (los de raíz son Markdown de
// raíz) y LICENSE. Markdown bajo código, archivos no Markdown bajo docs y cualquier otra ruta son técnicos.
const DOCS_ONLY_ALLOWLIST = [/^[^/]+\.md$/, /^docs\/.+\.md$/, /^(server|client)\/(AGENTS|CLAUDE)\.md$/, /^LICENSE$/];
const REGULAR_FILE = '100644';
const PHASES = new Set(['BOOTSTRAP', 'FULL']);

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function emit(policy, changed, reason) {
  process.stdout.write(`policy=${policy}\nchanged=${changed}\nreason=${reason}\n`);
}

// Formato --raw -z: ":<modo origen> <modo destino> <sha> <sha> <estado>\0<ruta>\0" (R/C agregan la ruta destino).
// -z evita rutas entrecomilladas; cualquier entrada que no respete el formato es un error (fase técnica).
function parseRaw(out) {
  const fields = out.split('\0');
  const entries = [];
  let i = 0;
  while (i < fields.length && fields[i] !== '') {
    const meta = fields[i++].match(/^:(\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ ([A-Z])\d*$/);
    if (!meta) throw new Error('entrada del diff ilegible');
    const [, srcMode, dstMode, status] = meta;
    const paths = fields.slice(i, i + (status === 'R' || status === 'C' ? 2 : 1));
    i += paths.length;
    if (paths.length === 0 || paths.some((path) => !path)) throw new Error('ruta ausente en el diff');
    entries.push({ srcMode, dstMode, status, paths });
  }
  return entries;
}

function documental({ srcMode, dstMode, status, paths }) {
  const path = paths[paths.length - 1];
  const regular = dstMode === REGULAR_FILE && (status === 'A' || srcMode === REGULAR_FILE);
  return (status === 'A' || status === 'M') && regular && !/[\x00-\x1f\x7f]/.test(path)
    && DOCS_ONLY_ALLOWLIST.some((re) => re.test(path));
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

let entries;
try {
  const out = execFileSync('git', ['diff', '--raw', '-z', '--no-abbrev', '-M', `${base}...${head}`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  entries = parseRaw(out);
} catch (error) {
  console.error(`classify-diff: no se pudo calcular el diff (${String(error.message).split('\n')[0]})`);
  emit(phase, 0, 'error del clasificador');
  process.exit(0);
}

const offending = [];
for (const entry of entries) {
  const ok = documental(entry);
  console.error(`  ${entry.status} ${entry.srcMode}->${entry.dstMode}\t${JSON.stringify(entry.paths.join(' -> '))}${ok ? '' : '  [técnico]'}`);
  if (!ok) offending.push(entry);
}

if (entries.length === 0) {
  emit(phase, 0, 'diff vacío');
} else if (offending.length === 0) {
  emit('DOCS_ONLY', entries.length, 'solo documentación permitida');
} else {
  emit(phase, entries.length, `${offending.length} ruta(s) técnicas`);
}
