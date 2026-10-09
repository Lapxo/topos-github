import { of, type Asked } from '@lapxo/topos/capsule';
import { alphabet } from '@lapxo/topos/wire';
import { said } from './pipeline.ts';

/** The handed workflow profile names its inputs before anything is rendered. */
const requireInputs = (asked: Asked, named: string): void => {
  const contract = `wire/pipeline/required/${named}`;
  const declarations = [...new Set(asked.lines.filter(line => [contract, `audit/${contract}`].includes(of(line, 'scope'))).map(line => of(line, 'value')))];
  if (declarations.length > 1) throw Error(`REFUSE·github-actions ${asked.shape} conflicting ${contract}`);
  const declaration = declarations[0];
  if (declaration === undefined) throw Error(`REFUSE·github-actions ${asked.shape} missing ${contract}`);
  const required = alphabet(declaration).members;
  const missing = required.filter(key => !said(asked, key));
  if (missing.length) throw Error(`REFUSE·github-actions ${asked.shape} missing ${missing.map(key => 'pipeline/' + key).join(' · ')}`);
};

/** The workflows a place that runs renders: test, tag, and a release that may publish. */
export const render = (asked: Asked, named: string): readonly string[] => {
  requireInputs(asked, named);
  const nodes = alphabet(said(asked, 'node')).members;
  const [last, auth] = [nodes[nodes.length - 1] ?? '', said(asked, 'publish/auth')];
  const colon = auth.indexOf(':');
  const secret = colon < 0 ? '' : auth.slice(colon + 1);
  const checkout = (...withs: readonly string[]): readonly string[] => ['      - uses: actions/checkout@v4', ...(withs.length ? ['        with:', ...withs.map((one) => `          ${one}`)] : [])];
  const setup = (node: string): readonly string[] => ['      - uses: actions/setup-node@v4', '        with:', `          node-version: ${node}`];
  const secretly = (key: string, run: readonly string[]): readonly string[] => (key ? ['      - env:', `          ${key}: \${{ secrets.${key} }}`, '        run: |', '          umask 077',
    `          printf '%s\\n' "$${key}" > "$RUNNER_TEMP/${key}"`, `          export ${key}="$RUNNER_TEMP/${key}"`, ...run.map((one) => `          ${one}`)] : ['      - run: |', ...run.map((one) => `          ${one}`)]);
  const check = said(asked, 'check');
  const runs = check.split('&&').map((one) => one.trim()).filter(Boolean).map((run) => `      - run: ${run}`);
  const install = said(asked, 'install').split('&&').map(one => one.trim()).filter(Boolean).map(run => `      - run: ${run}`);
  const job = (name: string, allow: readonly string[], body: readonly string[], head: readonly string[] = []): readonly string[] =>
    [`  ${name}:`, ...head, '    runs-on: ubuntu-latest', '    permissions:', ...allow.map((one) => `      ${one}`), '    steps:', ...body];
  const at = 'ref: ${{ github.event.workflow_run.head_sha || github.sha }}';
  const tool = said(asked, 'publish/command').split(' ')[0] ?? '';
  const tools = tool && said(asked, `publish/${tool}`) ? [`      - run: ${tool} install --global ${tool}@'${said(asked, `publish/${tool}`)}'`] : [];
  const heads = said(asked, 'fold/command') && said(asked, 'verify/command')
    ? job('two-heads', ['contents: read'], [...checkout(), ...setup(last), `      - run: ${said(asked, 'fold/command')}`, ...secretly(said(asked, 'verify/key'), [said(asked, 'verify/command')])]) : [];
  const assets = alphabet(said(asked, 'release/assets')).members;
  const names = assets.map(asset => asset.split('/').at(-1));
  if (new Set(names).size !== names.length) throw Error(`REFUSE·github-actions ${asked.shape} release assets share a filename`);
  const quote = (value: string): string => "'" + value.replace(/'/g, "'\"'\"'") + "'";
  const extraChecks = assets.flatMap(asset => [
    `          extra=${quote(asset)}`,
    '          test -f "$extra"',
    '          test "$(basename "$extra")" != "$(basename "$asset")"',
    `          extra_expected="$(${said(asked, 'release/digest-command')} "$extra")"`,
    '          gh release download "$version" --pattern "$(basename "$extra")" --dir "$RUNNER_TEMP/release-back"',
    `          extra_actual="$(${said(asked, 'release/digest-command')} "$RUNNER_TEMP/release-back/$(basename "$extra")")"`,
    '          test "${extra_expected%% *}" = "${extra_actual%% *}"',
  ]);
  const workflows: Readonly<Record<string, readonly string[]>> = {
    test: ['name: test', 'on:', '  push:', `    branches: [${said(asked, 'branch')}]`, '  pull_request:', 'jobs:', ...job('test', ['contents: read'],
      [...checkout(), ...setup('${{ matrix.node }}'), ...install, ...runs, ...(said(asked, 'pack') ? [`      - run: ${said(asked, 'pack')}`] : [])], ['    strategy:', '      matrix:', `        node: [${nodes.join(', ')}]`]), ...heads],
    tag: ['name: tag', 'on:', '  push:', `    branches: [${said(asked, 'branch')}]`, 'jobs:', ...job('tag', ['contents: write'], [...checkout('fetch-depth: 0'), ...secretly('',
      [`version="v$(${said(asked, 'version')})"`, 'git tag --list "$version" | grep -q . && exit 0', 'git tag "$version" && git push origin "$version"'])])],
    release: ['name: release', 'on:', '  workflow_run:', '    workflows: [tag]', '    types: [completed]', '  push:', "    tags: ['v*']", 'jobs:',
      ...job('release', ['contents: write'], [...checkout(at, 'fetch-depth: 2'), ...setup(last), ...install, ...runs, '      - id: artifact', '        env:', '          GH_TOKEN: ${{ github.token }}', '        run: |',
        `          version="v$(${said(asked, 'version')})"`, `          asset="$(${said(asked, 'pack')})"`, '          test -f "$asset"', `          expected="$(${said(asked, 'release/digest-command')} "$asset")"`, '          if ! gh release view "$version" >/dev/null 2>&1; then', `            gh release create "$version" "$asset"${assets.map(one => ` ${quote(one)}`).join('')} --title "$version" --notes "${said(asked, 'release/notes') || '$version'}"`, '          fi', '          gh release download "$version" --pattern "$(basename "$asset")" --dir "$RUNNER_TEMP/release-back"', `          actual="$(${said(asked, 'release/digest-command')} "$RUNNER_TEMP/release-back/$(basename "$asset")")"`, '          test "${expected%% *}" = "${actual%% *}"', ...extraChecks, ...(auth ? ["          printf 'artifact=%s\\n' \"$(basename \"$asset\")\" >> \"$GITHUB_OUTPUT\"", "          printf 'digest=%s\\n' \"${expected%% *}\" >> \"$GITHUB_OUTPUT\""] : [])],
      ["    if: github.event_name == 'push' || github.event.workflow_run.conclusion == 'success'", ...(auth ? ['    outputs:', '      artifact: ${{ steps.artifact.outputs.artifact }}', '      digest: ${{ steps.artifact.outputs.digest }}'] : [])]),
      ...(auth ? job('publish', ['contents: read', ...(secret ? [] : ['id-token: write'])], [...checkout(at), ...setup(last), ...tools, '      - env:', '          GH_TOKEN: ${{ github.token }}', '          RELEASE_ARTIFACT: ${{ needs.release.outputs.artifact }}', '          RELEASE_DIGEST: ${{ needs.release.outputs.digest }}', '        run: |', `          version="v$(${said(asked, 'version')})"`, '          test -n "$RELEASE_ARTIFACT"', '          test -n "$RELEASE_DIGEST"', '          gh release download "$version" --pattern "$RELEASE_ARTIFACT" --dir "$RUNNER_TEMP/publish"', '          asset="$RUNNER_TEMP/publish/$RELEASE_ARTIFACT"', `          actual="$(${said(asked, 'release/digest-command')} "$asset")"`, '          test "${actual%% *}" = "$RELEASE_DIGEST"', "          printf 'RELEASE_ASSET=%s\\n' \"$asset\" >> \"$GITHUB_ENV\"", ...secretly(secret, [
        ...(said(asked, 'publish/once') === 'present' ? [`${said(asked, 'published')} "$(${said(asked, 'name')})@$(${said(asked, 'version')})" version >/dev/null 2>&1 && exit 0`] : []), `asset="$RELEASE_ASSET"`, said(asked, 'publish/command')])],
      ['    needs: release', `    environment: ${said(asked, 'environment')}`]) : [])],
  };
  const held = workflows[named];
  if (held === undefined) throw new Error(`REFUSE·github-actions: no workflow of the forge is named by ${asked.shape}`);
  return held;
};
