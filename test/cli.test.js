import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/slopfix.js', import.meta.url));
const D = '\u2014';

function run(args, input, cwd) {
  return spawnSync(process.execPath, [BIN, ...args], { input, cwd, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
}

test('stdin: exits 1 on tells and 0 on clean text', () => {
  assert.equal(run([], `We delve ${D} deeply.`).status, 1);
  assert.equal(run([], 'We shipped it on Tuesday.').status, 0);
});

test('stdin --fix prints the fixed text', () => {
  const r = run(['--fix'], `Certainly! We delve ${D} deeply.`);
  assert.equal(r.stdout, 'We dig, deeply.');
});

test('--format json and github', () => {
  const json = JSON.parse(run(['--format', 'json'], `A ${D} b`).stdout);
  assert.equal(json[0].issues[0].ruleId, 'em-dash');
  const gh = run(['--format', 'github'], `A ${D} b`).stdout;
  assert.match(gh, /^::warning file=<stdin>,line=1,col=2/);
});

test('--max-score only fails above the threshold', () => {
  const text = `A long enough sentence about shipping software ${D} with one dash in it.`;
  assert.equal(run(['--max-score', '90'], text).status, 0);
  assert.equal(run(['--max-score', '0'], text).status, 1);
});

test('folders, config file and --fix on disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'slopfix-'));
  writeFileSync(join(dir, 'post.md'), `We utilize synergy ${D} daily.\n`);
  writeFileSync(join(dir, 'skip.js'), `// delve ${D}\n`);
  writeFileSync(join(dir, '.slopfixrc.json'), JSON.stringify({ rules: { 'en/ai-vocabulary': 'off' }, dashReplacement: ' - ' }));
  const lintRun = run(['.', '--format', 'json'], undefined, dir);
  const files = JSON.parse(lintRun.stdout);
  assert.equal(files.length, 1);
  assert.deepEqual(files[0].issues.map((i) => i.ruleId), ['em-dash']);
  run(['.', '--fix'], undefined, dir);
  assert.equal(readFileSync(join(dir, 'post.md'), 'utf8'), 'We utilize synergy - daily.\n');
});

test('unknown options exit 2', () => {
  assert.equal(run(['--nope'], 'x').status, 2);
});
