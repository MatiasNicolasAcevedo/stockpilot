// Host-only, fixed operations on this script's fresh Compose project. No Docker socket in browser.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { setTimeout as pollDelay } from 'node:timers/promises';

const args = process.argv.slice(2);
const project = args[args.indexOf('-p') + 1];
assert.match(project, /^stockpilot-e2e-[a-z0-9][a-z0-9-]{0,47}$/);
const root = resolve('e2e/artifacts', project);
const control = join(root, 'control');
assert.deepEqual(args, ['compose', '--env-file', 'scripts/fixtures/e2e.env.example', '-p', project,
  '-f', 'docker-compose.yml', '-f', 'compose.auth-test.yml', '-f', 'docker-compose.e2e.yml',
  '--profile', 'oidc', '--profile', 'e2e']);
const original = JSON.parse(readFileSync('scripts/fixtures/oidc.json', 'utf8'));
function compose(command) {
  const result = spawnSync('docker', [...args, ...command], { encoding: 'utf8', timeout: 120_000 });
  // Never echo exec output, errors or auth logs. Return only a narrow DB fingerprint to the test.
  assert.equal(result.status, 0, 'Own-project control operation failed (details withheld)');
  return result.stdout.trim();
}
function identity(value) {
  assert.match(value, /^[a-f0-9-]{36}$/);
  const fixture = structuredClone(original);
  const claims = fixture.tokenCallbacks[0].requestMappings[0].claims;
  claims.sub = `e2e-${value}`;
  claims.name = `Persona ${value.slice(0, 8)}`;
  claims.email = `${value}@example.invalid`;
  // Write in place: the provider's file bind mount keeps the same inode.
  writeFileSync(join(control, 'oidc.json'), JSON.stringify(fixture));
  return claims.sub;
}
function execute(request) {
  switch (request.operation) {
    case 'reset':
      identity(request.identity);
      compose(['restart', 'oidc']);
      compose(['restart', 'server']);
      return true;
    case 'identity':
      identity(request.identity);
      compose(['restart', 'oidc']);
      // Restart server too: discard cached JWKS after the provider changes signing keys.
      compose(['restart', 'server']);
      return true;
    case 'stop': case 'start': case 'restart':
      compose([request.operation, 'server']);
      return true;
    case 'fingerprint': {
      assert.match(request.identity, /^[a-f0-9-]{36}$/);
      const query = "SELECT json_build_object('id',id,'createdAt',created_at)::text FROM app_user " +
        `WHERE issuer = 'http://host.docker.internal:8090/default' AND subject = 'e2e-${request.identity}'`;
      const result = compose(['exec', '-T', 'db', 'psql', '-U', 'stockpilot_auth_test',
        '-d', 'stockpilot_auth_test', '-Atc', query]);
      const rows = result ? result.split('\n').map(line => JSON.parse(line)) : [];
      return rows;
    }
    default: throw new Error('Unknown test control operation');
  }
}
// Directed red assays: each value selects one spec, which changes only its relevant expected UI result.
const directedSpecs = { 1: 'system.spec.ts', swagger: 'swagger.spec.ts' };
const requested = process.env.STOCKPILOT_E2E_ASSERT_FAILURE ?? '';
const inducedFailure = Object.hasOwn(directedSpecs, requested) ? requested : '0';
const directedArguments = inducedFailure === '0' ? [] : ['--', directedSpecs[inducedFailure]];
const runner = spawn('docker', [...args, 'run', '--rm', '--no-deps',
  '-e', `E2E_ASSERT_FAILURE=${inducedFailure}`,
  'e2e', 'npm', 'test', ...directedArguments], { stdio: 'inherit' });
let finished = false;
const completion = new Promise(resolveExit => {
  runner.on('error', () => { finished = true; resolveExit(1); });
  runner.on('exit', code => { finished = true; resolveExit(code ?? 1); });
});
// On interruption e2e.sh's trap owns teardown, including the one-off runner.
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(signal, () => runner.kill(signal));
while (!finished) {
  const input = join(control, 'request.json');
  if (existsSync(input)) {
    const request = JSON.parse(readFileSync(input, 'utf8'));
    rmSync(input);
    let response;
    try { response = { id: request.id, ok: true, result: execute(request) }; }
    catch { response = { id: request.id, ok: false }; }
    writeFileSync(join(control, 'response.tmp'), JSON.stringify(response));
    renameSync(join(control, 'response.tmp'), join(control, 'response.json'));
  }
  await pollDelay(100); // IPC readiness polling, never a scenario wait.
}
const code = await completion;
const sanitize = spawnSync('docker', [...args, 'run', '--rm', '--no-deps', 'e2e',
  'python3', 'harness/sanitize.py'], { stdio: 'inherit', timeout: 30_000 });
process.exitCode = code || (sanitize.status === 0 ? 0 : 1);
