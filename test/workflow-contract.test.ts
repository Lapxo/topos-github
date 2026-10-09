import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../src/helpers/place.ts';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import type { Asked } from '@lapxo/topos/capsule';

const asked = (pipeline: Record<string, string>): Asked => ({
  name: 'independent-place', shape: '.github/workflows/test.yml',
  lines: [...Object.entries({test:'branch|node|check',tag:'branch|version',release:'branch|node|version|check|pack|release/digest-command'}).map(([name,value])=>({scope:`wire/pipeline/required/${name}`,value,role:'writes',form:'alphabet',measure:'id'})),...Object.entries(pipeline).map(([key, value]) => ({
    scope: `pipeline/${key}`, value, role: 'writes', form: 'alphabet', measure: 'id',
  }))],
} as Asked);
const base = { branch: 'main', node: '22|24', version: 'read-version', check: 'judge-place', pack: 'pack-place', 'release/digest-command': 'hash-asset' };

test('an absent install declaration contributes no command to test or release', () => {
  for (const workflow of ['test', 'release']) {
    const lines = render(asked(base), workflow);
    assert.ok(lines.some(line => line.includes('judge-place')));
    assert.equal(lines.some(line => line.includes('npm ci')), false);
  }
});

test('the place chooses its install commands, in declared order', () => {
  for (const workflow of ['test', 'release']) {
    const lines = render(asked({ ...base, install: 'fetch-inputs && prepare-place' }), workflow);
    const fetch = lines.indexOf('      - run: fetch-inputs');
    const prepare = lines.indexOf('      - run: prepare-place');
    const check = lines.indexOf('      - run: judge-place');
    assert.ok(fetch >= 0 && prepare > fetch && check > prepare);
    assert.equal(lines.some(line => line.includes('npm ci')), false);
  }
});

test('an absent required check refuses by coordinate', () => {
  const { check, ...missing } = base;
  assert.throws(() => render(asked(missing), 'test'), /REFUSE·github-actions.*pipeline\/check/);
});

test('required fields come from the handed contract, not a hidden checklist', () => {
 const input=asked({...base,approval:'confirmed'});
 const profile=input.lines.find(line=>line.scope==='wire/pipeline/required/test')!;
 const lines=input.lines.filter(line=>line!==profile);
 assert.throws(()=>render({...input,lines},'test'),/missing wire\/pipeline\/required\/test/);
 const custom={...profile,value:'branch|node|check|approval'};
 assert.ok(render({...input,lines:[...lines,custom]},'test').length);
 assert.throws(()=>render({...input,lines:[...lines.filter(line=>line.scope!=='pipeline/approval'),custom]},'test'),/missing pipeline\/approval/);
});

test('incompatible required-field profiles refuse in either order; duplicates are idempotent', () => {
 const input=asked(base),profile=input.lines.find(line=>line.scope==='wire/pipeline/required/test')!;
 assert.deepEqual(render({...input,lines:[...input.lines,{...profile}]},'test'),render(input,'test'));
 for(const lines of [[...input.lines,{...profile,value:'branch|approval'}],[{...profile,value:'branch|approval'},...input.lines]]) {
  assert.throws(()=>render({...input,lines},'test'),/conflicting wire\/pipeline\/required\/test/);
 }
});

for (const place of ['library', 'service']) test(`staging uses the verified release archive without rebuilding: ${place}`, () => {
  const lines = render(asked({ ...base, branch: place, install: 'fetch-inputs', 'publish/auth': 'trusted', 'publish/command': 'stage-artifact "$asset"', environment: 'release' }), 'release');
  const text = lines.join('\n'), publishing = text.slice(text.indexOf('  publish:'));
  assert.equal(lines.filter(line => line.includes('asset="$(pack-place)"')).length, 1);
  assert.ok(publishing.includes('needs.release.outputs.artifact'));
  assert.ok(publishing.includes('needs.release.outputs.digest'));
  assert.ok(publishing.includes('gh release download'));
  assert.ok(publishing.indexOf('test "${actual%% *}" = "$RELEASE_DIGEST"') < publishing.indexOf('stage-artifact "$asset"'));
  assert.ok(!publishing.includes('fetch-inputs'));
  assert.ok(!publishing.includes('judge-place'));
  assert.ok(!publishing.includes('pack-place'));
  assert.ok(!text.includes('gh release view "$version" >/dev/null 2>&1 && exit 0'));
});

test('workflow metadata uses shell newlines rather than literal backslash-n', () => {
  const text = render(asked({ ...base, 'publish/auth': 'trusted', 'publish/command': 'stage-artifact "$asset"', environment: 'release' }), 'release').join('\n');
  assert.ok(text.includes("printf 'artifact=%s\\n'"));
  assert.ok(text.includes("printf 'digest=%s\\n'"));
  assert.ok(!text.includes("printf 'artifact=%s\\\\n'"));
});

for (const place of ['library', 'service']) test(`every declared release asset is downloaded and verified: ${place}`, () => {
  const root = mkdtempSync(join(tmpdir(), 'forge-assets-'));
  try {
    writeFileSync(join(root, 'primary.tgz'), 'archive');
    writeFileSync(join(root, 'standing'), 'canonical standing');
    const lines = render(asked({ ...base, branch: place, version: "printf 1", pack: 'printf primary.tgz', 'release/digest-command': 'shasum -a 256', 'release/assets': 'standing' }), 'release');
    const start = lines.findIndex(line => line.startsWith('          version='));
    const end = lines.findIndex((line, index) => index > start && !line.startsWith('          '));
    const script = lines.slice(start, end < 0 ? undefined : end).map(line => line.slice(10)).join('\n');
    const fake = `gh() {
      if [ "$1 $2" = "release view" ]; then return 0; fi
      if [ "$1 $2" = "release download" ]; then
        mkdir -p "$7"
        case "$5" in
          standing) [ "$MODE" != missing ] || return 1;
            if [ "$MODE" = corrupt ]; then printf corrupt > "$7/$5"; else cp "$5" "$7/$5"; fi ;;
          *) cp "$5" "$7/$5" ;;
        esac
        return 0
      fi
      return 1
    }
    `;
    for (const mode of ['same', 'corrupt', 'missing']) {
      const result = spawnSync('bash', ['-e', '-c', fake + script], { cwd: root, encoding: 'utf8', env: { ...process.env, MODE: mode, RUNNER_TEMP: join(root, mode) }, timeout: 5000 });
      assert.equal(result.status === 0, mode === 'same', result.stderr);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('release assets with identical filenames refuse before rendering', () => {
  assert.throws(() => render(asked({ ...base, 'release/assets': 'first/standing|second/standing' }), 'release'), /REFUSE.*share a filename/);
});

for (const place of ['library', 'service']) test(`release preparation precedes packing and stays out of test/tag: ${place}`, () => {
 const seed=asked({...base,branch:place});
 const input={...seed,lines:[...seed.lines,{scope:'pipeline/release/prepare',role:'writes',form:'alphabet',measure:'text',value:'lock',about:'verify-inputs\nrebuild-assets'}]};
 const release=render(input,'release').join('\n');
 assert.ok(release.indexOf('verify-inputs') < release.indexOf('rebuild-assets'));
 assert.ok(release.indexOf('rebuild-assets') < release.indexOf('asset="$(pack-place)"'));
 assert.ok(!render(input,'test').join('\n').includes('verify-inputs'));
 assert.ok(!render(input,'tag').join('\n').includes('rebuild-assets'));
});
