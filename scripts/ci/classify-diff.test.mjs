#!/usr/bin/env node
// Regresiones del clasificador DOCS_ONLY (T-003 AC-08): node --test scripts/ci/
// Construye repos git descartables con plumbing (sin working tree: modos symlink/gitlink/ejecutable portables a
// Windows) y ejecuta el clasificador real. CLASSIFY_DIFF_SCRIPT permite correr la misma matriz contra otra versión.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = resolve(process.env.CLASSIFY_DIFF_SCRIPT ?? join(dirname(fileURLToPath(import.meta.url)), 'classify-diff.mjs'));
const workspace = mkdtempSync(join(tmpdir(), 'stockpilot-classify-'));
after(() => rmSync(workspace, { recursive: true, force: true }));

// Configuración git aislada y determinista: sin config de sistema/usuario (autocrlf, firmas, renames).
const emptyConfig = join(workspace, 'gitconfig');
writeFileSync(emptyConfig, '');
const ENV = { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: emptyConfig, GIT_CEILING_DIRECTORIES: dirname(workspace),
  GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
  GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' };
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY']) delete ENV[key];

const git = (cwd, args, input) => execFileSync('git', args, { cwd, env: ENV, input, encoding: 'utf8' }).trim();
const repo = join(workspace, 'repo');
git(workspace, ['init', '-q', repo]);

function commit(changes, parent) {
  if (parent) git(repo, ['read-tree', parent]);
  for (const [path, value] of Object.entries(changes)) {
    if (value === null) {
      git(repo, ['update-index', '--force-remove', path]);
      continue;
    }
    const { mode = '100644', content } = typeof value === 'string' ? { content: value } : value;
    const sha = mode === '160000' ? content : git(repo, ['hash-object', '-w', '--stdin'], content);
    git(repo, ['update-index', '--add', '--cacheinfo', `${mode},${sha},${path}`]);
  }
  return git(repo, ['commit-tree', git(repo, ['write-tree']), ...(parent ? ['-p', parent] : []), '-m', 'fixture']);
}

const BASE = commit({
  'README.md': '# Fixture\n', 'AGENTS.md': 'reglas\n', 'CLAUDE.md': '@AGENTS.md\n', LICENSE: 'MIT\n',
  'server/AGENTS.md': 'reglas server\n', 'server/CLAUDE.md': '@AGENTS.md\n', 'server/pom.xml': '<project/>\n',
  'client/AGENTS.md': 'reglas client\n', 'client/CLAUDE.md': '@AGENTS.md\n', 'client/package.json': '{}\n',
  'docs/guide.md': '# Guía\n', 'docs/old.md': '# Histórico estable\n', 'docs/sub/deep.md': '# Profundo\n',
  'scripts/verify.sh': '#!/usr/bin/env bash\n', '.github/workflows/ci.yml': 'name: ci\n', '.env.example': 'A=1\n',
});

function classify(args, cwd = repo) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: ENV, encoding: 'utf8' });
  const out = Object.fromEntries(result.stdout.split('\n').filter(Boolean).map((line) => line.split(/=(.*)/s).slice(0, 2)));
  return { status: result.status, ...out };
}
const classifyRange = (base, head, phase = 'FULL') => classify(['--base', base, '--head', head, '--phase', phase]);

const DOCS_ONLY = {
  'Markdown de raíz agregado': { 'NOTES.md': 'notas\n' },
  'README de raíz modificado': { 'README.md': '# Fixture cambiado\n' },
  'docs/**/*.md agregado y modificado': { 'docs/new.md': 'nuevo\n', 'docs/sub/deep.md': '# Cambiado\n' },
  'Markdown en docs con espacios y no ASCII': { 'docs/guía rápida.md': 'texto\n' },
  'AGENTS/CLAUDE de raíz': { 'AGENTS.md': 'reglas cambiadas\n', 'CLAUDE.md': '@AGENTS.md\n\n' },
  'AGENTS/CLAUDE conocidos de server y client': { 'server/AGENTS.md': 'x\n', 'client/CLAUDE.md': '@AGENTS.md \n' },
  'LICENSE modificado': { LICENSE: 'MIT cambiado\n' },
  'combinación documental completa': { 'NOTES.md': 'a\n', 'docs/x/y/z.md': 'b\n', 'server/CLAUDE.md': 'c\n', LICENSE: 'd\n' },
};
const TECHNICAL = {
  'Markdown bajo server/src': { 'server/src/x.md': 'x\n' },
  'Markdown bajo client/src': { 'client/src/x.md': 'x\n' },
  'script bajo docs': { 'docs/x.mjs': 'export {};\n' },
  'configuración bajo docs': { 'docs/orchestration.example.yml': 'a: 1\n' },
  'binario bajo docs': { 'docs/diagram.png': 'png\n' },
  'extensión Markdown no exacta': { 'docs/UPPER.MD': 'x\n' },
  'Markdown fuera de la allowlist (e2e)': { 'e2e/README.md': 'x\n' },
  'README de server': { 'server/README.md': 'x\n' },
  'AGENTS de carpeta no conocida': { 'other/AGENTS.md': 'x\n' },
  'AGENTS anidado en código': { 'server/src/AGENTS.md': 'x\n' },
  'configuración Maven': { 'server/pom.xml': '<project><x/></project>\n' },
  'dependencias del client': { 'client/package.json': '{"a":1}\n' },
  'ejemplo de entorno': { '.env.example': 'A=2\n' },
  'script del gate': { 'scripts/verify.sh': '#!/usr/bin/env bash\nexit 0\n' },
  'workflow': { '.github/workflows/ci.yml': 'name: otro\n' },
  'el propio clasificador': { 'scripts/ci/classify-diff.mjs': '// x\n' },
  'archivo desconocido': { Makefile: 'all:\n' },
  'renombre de Markdown en docs': { 'docs/old.md': null, 'docs/renamed.md': '# Histórico estable\n' },
  'borrado de Markdown en docs': { 'docs/old.md': null },
  'symlink con nombre Markdown': { 'docs/link.md': { mode: '120000', content: '../scripts/verify.sh' } },
  'gitlink con nombre Markdown': { 'docs/sub.md': { mode: '160000', content: '1'.repeat(40) } },
  'Markdown vuelto ejecutable': { 'docs/guide.md': { mode: '100755', content: '# Guía\n' } },
  'documentación + una ruta técnica': { 'docs/guide.md': '# Guía 2\n', 'server/src/main/java/App.java': 'class App {}\n' },
};

for (const [name, changes] of Object.entries(DOCS_ONLY)) {
  test(`DOCS_ONLY: ${name}`, () => {
    const head = commit(changes, BASE);
    const result = classifyRange(BASE, head);
    assert.equal(result.status, 0);
    assert.equal(result.policy, 'DOCS_ONLY', `reason=${result.reason}`);
    assert.equal(Number(result.changed), Object.keys(changes).length);
  });
}
for (const [name, changes] of Object.entries(TECHNICAL)) {
  test(`técnico: ${name}`, () => {
    const head = commit(changes, BASE);
    const result = classifyRange(BASE, head);
    assert.equal(result.status, 0);
    assert.equal(result.policy, 'FULL', `reason=${result.reason}`);
  });
}

test('técnico: HEAD documental final después de un commit técnico del mismo PR (cierre de M0)', () => {
  const technical = commit({ 'server/pom.xml': '<project><y/></project>\n' }, BASE);
  const documental = commit({ 'docs/guide.md': '# Evidencia final\n' }, technical);
  assert.equal(classifyRange(technical, documental).policy, 'DOCS_ONLY'); // control: el último commit solo es documental
  assert.equal(classifyRange(BASE, documental).policy, 'FULL');
});

test('la política técnica es la fase declarada', () => {
  assert.equal(classifyRange(BASE, commit({ 'server/pom.xml': '<p/>\n' }, BASE), 'BOOTSTRAP').policy, 'BOOTSTRAP');
  assert.equal(classifyRange(BASE, commit({ 'docs/a.md': 'a\n' }, BASE), 'BOOTSTRAP').policy, 'DOCS_ONLY');
});

test('técnico: diff vacío', () => {
  assert.deepEqual(classifyRange(BASE, BASE), { status: 0, policy: 'FULL', changed: '0', reason: 'diff vacío' });
});

test('técnico: base ausente o de ceros', () => {
  const head = commit({ 'docs/a.md': 'a\n' }, BASE);
  for (const args of [['--head', head, '--phase', 'FULL'], ['--base', '0'.repeat(40), '--head', head, '--phase', 'FULL']]) {
    const result = classify(args);
    assert.equal(result.status, 0);
    assert.equal(result.policy, 'FULL');
    assert.equal(result.reason, 'sin base comparable');
  }
});

test('técnico: error del clasificador (base inexistente o fuera de un repo)', () => {
  const head = commit({ 'docs/a.md': 'a\n' }, BASE);
  for (const [args, cwd] of [[['--base', 'f'.repeat(40), '--head', head, '--phase', 'FULL'], repo],
    [['--base', BASE, '--head', head, '--phase', 'FULL'], workspace]]) {
    const result = classify(args, cwd);
    assert.equal(result.status, 0);
    assert.equal(result.policy, 'FULL');
    assert.equal(result.reason, 'error del clasificador');
  }
});

test('fase inválida: exit 2 sin política', () => {
  for (const phase of ['DOCS_ONLY', '', 'full']) {
    const result = classifyRange(BASE, BASE, phase);
    assert.equal(result.status, 2);
    assert.equal(result.policy, undefined);
  }
});
