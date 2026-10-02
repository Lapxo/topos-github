import type { Asked } from '@lapxo/topos/capsule';
import { alphabet } from '@lapxo/topos/wire';
import { said } from './pipeline.ts';

/** The workflows a place that runs renders: test, tag, and a release that may publish. */
export const render = (asked: Asked, named: string): readonly string[] => {
  const nodes = alphabet(said(asked, 'node')).members;
  const [last, auth] = [nodes[nodes.length - 1] ?? '', said(asked, 'publish/auth')];
  const secret = auth.includes(':') ? auth.replace(/^[^:]*:/, '') : '';
  const checkout = (...withs: readonly string[]): readonly string[] => ['      - uses: actions/checkout@v4', ...(withs.length ? ['        with:', ...withs.map((one) => `          ${one}`)] : [])];
  const setup = (node: string): readonly string[] => ['      - uses: actions/setup-node@v4', '        with:', `          node-version: ${node}`];
  const secretly = (key: string, run: readonly string[]): readonly string[] => (key ? ['      - env:', `          ${key}: \${{ secrets.${key} }}`, '        run: |', '          umask 077',
    `          printf '%s\\n' "$${key}" > "$RUNNER_TEMP/${key}"`, `          export ${key}="$RUNNER_TEMP/${key}"`, ...run.map((one) => `          ${one}`)] : ['      - run: |', ...run.map((one) => `          ${one}`)]);
  const runs = said(asked, 'check').split('&&').map((one) => one.trim()).filter(Boolean).map((run) => `      - run: ${run}`);
  const job = (name: string, allow: readonly string[], body: readonly string[], head: readonly string[] = []): readonly string[] =>
    [`  ${name}:`, ...head, '    runs-on: ubuntu-latest', '    permissions:', ...allow.map((one) => `      ${one}`), '    steps:', ...body];
  const at = 'ref: ${{ github.event.workflow_run.head_sha || github.sha }}';
  const tool = said(asked, 'publish/command').split(' ')[0] ?? '';
  const tools = tool && said(asked, `publish/${tool}`) ? [`      - run: ${tool} install --global ${tool}@'${said(asked, `publish/${tool}`)}'`] : [];
  const heads = said(asked, 'fold/command') && said(asked, 'verify/command')
    ? job('two-heads', ['contents: read'], [...checkout(), ...setup(last), `      - run: ${said(asked, 'fold/command')}`, ...secretly(said(asked, 'verify/key'), [said(asked, 'verify/command')])]) : [];
  const workflows: Readonly<Record<string, readonly string[]>> = {
    test: ['name: test', 'on:', '  push:', `    branches: [${said(asked, 'branch')}]`, '  pull_request:', 'jobs:', ...job('test', ['contents: read'],
      [...checkout(), ...setup('${{ matrix.node }}'), ...runs, ...(said(asked, 'pack') ? [`      - run: ${said(asked, 'pack')}`] : [])], ['    strategy:', '      matrix:', `        node: [${nodes.join(', ')}]`]), ...heads],
    tag: ['name: tag', 'on:', '  push:', `    branches: [${said(asked, 'branch')}]`, 'jobs:', ...job('tag', ['contents: write'], [...checkout('fetch-depth: 0'), ...secretly('',
      [`version="v$(${said(asked, 'version')})"`, 'git tag --list "$version" | grep -q . && exit 0', 'git tag "$version" && git push origin "$version"'])])],
    release: ['name: release', 'on:', '  workflow_run:', '    workflows: [tag]', '    types: [completed]', '  push:', "    tags: ['v*']", 'jobs:',
      ...job('release', ['contents: write'], [...checkout(at, 'fetch-depth: 2'), ...setup(last), ...runs, '      - env:', '          GH_TOKEN: ${{ github.token }}', '        run: |',
        `          version="v$(${said(asked, 'version')})"`, '          gh release view "$version" >/dev/null 2>&1 && exit 0', `          gh release create "$version"${said(asked, 'pack') ? ` "$(${said(asked, 'pack')})"` : ''}${alphabet(said(asked, 'release/assets')).members.map((one) => ` "${one}"`).join('')} --title "$version" --notes "${said(asked, 'release/notes') || '$version'}"`],
      ["    if: github.event_name == 'push' || github.event.workflow_run.conclusion == 'success'"]),
      ...(auth ? job('publish', ['contents: read', ...(secret ? [] : ['id-token: write'])], [...checkout(at), ...setup(last), ...runs, ...tools, ...secretly(secret, [
        ...(said(asked, 'publish/once') === 'present' ? [`${said(asked, 'published')} "$(${said(asked, 'name')})@$(${said(asked, 'version')})" version >/dev/null 2>&1 && exit 0`] : []), said(asked, 'publish/command')])],
      ['    needs: release', `    environment: ${said(asked, 'environment')}`]) : [])],
  };
  const held = workflows[named];
  if (held === undefined) throw new Error(`REFUSE·github-actions: no workflow of the forge is named by ${asked.shape}`);
  return held;
};
