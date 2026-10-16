#!/usr/bin/env node
// Agregado verify-required (check requerido por el ruleset de main; docs/TESTING.md). Siempre se emite.
// Entradas por entorno, tal como las pasa ci.yml: GATE_PHASE, POLICY, DRAFT, BASE, HEAD y los resultados de jobs
// CLASSIFY, DOCS, SERVER, CLIENT, E2E (success/failure/cancelled/skipped de needs.<job>.result).
// Solo exit 0 si la política exigida se cumplió; ausente, pendiente, omitido, cancelado o fallido nunca cuenta como
// verde. DRAFT rechaza siempre aunque las suites estén verdes. Regresiones: verify-required.test.mjs.
import { appendFileSync } from 'node:fs';

const TECHNICAL = ['server', 'client', 'e2e'];

function evaluate(input) {
  if (input.phase !== 'FULL') return `fase del gate no soportada por este workflow: ${input.phase || 'vacía'}`;
  if (input.classify !== 'success') return 'el clasificador no terminó con éxito';
  if (input.draft === 'true') return 'DRAFT: rechazo intencional aunque las suites estén verdes; el gate de la política se exige al pasar a ready';
  if (input.draft !== 'false') return `estado draft desconocido: ${input.draft || 'vacío'}`;
  if (input.docs !== 'success') return `docs-check exigido no está verde (${input.docs || 'ausente'})`;
  switch (input.policy) {
    case 'DOCS_ONLY':
      for (const job of TECHNICAL) {
        if (input[job] !== 'skipped') return `DOCS_ONLY exige ${job} omitido como no aplicable (${input[job] || 'ausente'})`;
      }
      return null;
    case 'FULL':
      for (const job of TECHNICAL) {
        if (input[job] !== 'success') return `FULL exige ${job} verde (${input[job] || 'ausente'})`;
      }
      return null;
    default:
      return `política no soportada: ${input.policy || 'vacía'}`;
  }
}

const env = (name) => (process.env[name] ?? '').trim();
const input = { phase: env('GATE_PHASE'), policy: env('POLICY'), draft: env('DRAFT'), classify: env('CLASSIFY'),
  docs: env('DOCS'), server: env('SERVER'), client: env('CLIENT'), e2e: env('E2E') };
const failure = evaluate(input);
const result = failure ? `rechazado: ${failure}` : `verde para la política ${input.policy}`;
const jobs = ['classify', 'docs', ...TECHNICAL].map((job) => `${job}=${input[job] || 'ausente'}`).join(' ');

console.log(`Política: ${input.policy || 'desconocida'} · fase ${input.phase || 'vacía'} · draft ${input.draft || 'desconocido'} · base ${env('BASE') || '-'} · head ${env('HEAD') || '-'}`);
console.log(jobs);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, ['### verify-required', '| Campo | Valor |', '|---|---|',
    `| Política | ${input.policy || 'desconocida'} (fase ${input.phase || 'vacía'}, draft ${input.draft || 'desconocido'}) |`,
    `| Base / HEAD | \`${env('BASE') || '-'}\` / \`${env('HEAD') || '-'}\` |`,
    `| Jobs | ${jobs} |`, `| Resultado | ${result} |`, ''].join('\n'));
}
if (failure) {
  console.log(`::error::${failure}`);
  process.exit(1);
}
console.log(`Resultado: ${result}`);
