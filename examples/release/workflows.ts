// A world with no pipeline line of its own, asked of this forge through the one contract: its region loaded by its role with the lock's reads, and the release workflow the wire's world default makes, a repository and a blob with no publish.
import { readFileSync } from 'node:fs';
import { declarationOf, shell } from '@lapxo/topos/capsule';
import { answer } from '@lapxo/topos/contract';
import { PROTOCOL, canonical } from '@lapxo/topos/wire';
import { render as forge } from '../../src/regions/github-actions.ts';

const lock = readFileSync(new URL('../../capsule.bound', import.meta.url), 'utf8').split('\n').filter((line) => line.startsWith('bound-lock/1'));
const reads = declarationOf(lock).regions['github-actions'] ?? [];
const world = canonical({ at: 'policy:acme/forge', by: 'target', form: 'alphabet', measure: 'id', role: 'reads', scope: 'audit/wire/pipeline/world', value: 'branch=main|check=npm ci && npm run build|node=22\\|24|version=node -p "require(\'./package.json\').version"' });
const got = answer({ render: shell({ 'github-actions': { reads, region: forge } }) }, { protocol: PROTOCOL, verb: 'render', rootScope: '', files: [], lines: [world], region: 'github-actions', at: 3, shape: '.github/workflows/release.yml', name: 'acme', reads }, '') as { kind: string; lines: string[]; why: string };

console.log(got.kind === 'fact' ? got.lines.join('\n') : got.why);
