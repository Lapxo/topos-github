/** The release a world renders: tag folded into the one job, the blob checked, contents write only. */
export const release = (branch: string, runtime: string, version: string): readonly string[] => {
  const run = [
    `version="v$(${version})"`,
    'git diff HEAD^ HEAD -- package.json | grep -q \'"version"\' || exit 0',
    'git tag --list "$version" | grep -q . && exit 0',
    'git tag "$version" && git push origin "$version"',
    'git checkout "$version"',
    'npm ci',
    'one="$(bound fold --as release)"',
    'two="$(bound fold --as release)"',
    'test "$one" = "$two"',
    'printf \'%s\' "$one" > release.blob',
    'digest="sha256:$(sha256sum release.blob | awk \'{print $1}\')"',
    'export digest',
    'asset="${digest#sha256:}.tar.gz"',
    'mv release.blob "$asset"',
    'printf \'%s\\n\' "$(bound fold --as release --check)" | grep -q \'^SAME\'',
    'secrets="$(grep -RIlE \'BEGIN (RSA|EC|OPENSSH|PRIVATE)|sk_live_|ghp_|AKIA\' --exclude-dir=node_modules --exclude-dir=.git . | wc -l | tr -d \' \')"',
    'stray=0',
    'nonjs="$(find dist -type f ! -name \'*.js\' ! -name \'*.d.ts\' 2>/dev/null | wc -l | tr -d \' \')"',
    'words="$(grep -RIlE \'registry\\.npmjs\\.org\' --exclude-dir=node_modules --exclude-dir=.git . | wc -l | tr -d \' \')"',
    'test "$secrets" = 0 && test "$stray" = 0 && test "$nonjs" = 0 && test "$words" = 0',
    'node --input-type=module -e \'import { readFileSync, writeFileSync } from "node:fs"; const lines = readFileSync("TARGET.bound","utf8").split("\\n").filter((line) => line.startsWith("bound-lock/1 ") && !line.includes(" value=withdraw")); const take = (head) => lines.filter((line) => line.includes(` scope=${head}`)); writeFileSync("release.json", JSON.stringify({ digest: process.env.digest, sources: take("sources/"), uses: take("uses/"), needs: take("needs/") }, null, 2) + "\\n");\'',
    'gh release create "$version" "$asset" release.json --title "$version" --notes "$version"',
    'gh release download "$version" --pattern "$asset" --dir "$RUNNER_TEMP/back" --clobber',
    'got="$(sha256sum "$RUNNER_TEMP/back/$asset" | awk \'{print $1}\')"',
    'case "$digest" in *"$got"*) ;; *) gh release delete "$version" --yes --cleanup-tag; exit 1 ;; esac',
    '{ echo \'```\'; node -e \'const j=JSON.parse(require("fs").readFileSync("release.json","utf8")); for (const k of ["sources","uses","needs"]) for (const line of j[k]) console.log(line)\'; echo \'```\'; } >> "$GITHUB_STEP_SUMMARY"',
  ];
  return ['name: release', 'on:', '  push:', `    branches: [${branch}]`, 'jobs:', '  release:', '    runs-on: ubuntu-latest', '    permissions:', '      contents: write', '    steps:',
    '      - uses: actions/checkout@v4', '        with:', '          fetch-depth: 0', '      - uses: actions/setup-node@v4', '        with:', `          node-version: ${runtime}`,
    '      - env:', '          GH_TOKEN: ${{ github.token }}', '        run: |', ...run.map((line) => `          ${line}`)];
};
