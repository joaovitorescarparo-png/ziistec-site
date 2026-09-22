import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { assertValidPng, verifyQuarantinedOg } from './png-integrity.mjs';

for (const script of ['check.mjs', 'secret-scan.mjs']) {
  test(`${script} works independently of the working directory`, () => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], {
      cwd: tmpdir(), encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.error?.message ?? `${result.stdout}\n${result.stderr}`);
  });
}

test('OG quarantine pins the legacy bytes without accepting them as a valid PNG', async () => {
  const og = await readFile(new URL('../site/og/ziistec-og.png', import.meta.url));
  assert.equal(verifyQuarantinedOg(og).valid, false);
  assert.throws(() => assertValidPng('ziistec-og.png', og), /Asset inválido/);
  const changed = Buffer.from(og);
  changed[changed.length - 1] ^= 1;
  assert.throws(() => verifyQuarantinedOg(changed), /Integridade inválida/);
});
