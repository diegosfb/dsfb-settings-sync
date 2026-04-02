import fs from 'node:fs';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const versionArg = process.argv[2] ?? '';
const version = versionArg.replace(/^v/i, '').trim();
const dateArg = (process.argv[3] ?? '').trim();

if (!version) {
  console.error('Usage: node scripts/finalize-changelog.mjs <version> <yyyy-mm-dd>');
  process.exit(2);
}

const date = dateArg || new Date().toISOString().slice(0, 10);

const changelogPath = new URL('../CHANGELOG.md', import.meta.url);
const changelog = fs.readFileSync(changelogPath, 'utf8');

const unreleasedHeaderRe = /^## \[Unreleased\]\s*$/m;
const unreleasedHeaderMatch = unreleasedHeaderRe.exec(changelog);
if (!unreleasedHeaderMatch) {
  console.error('CHANGELOG.md: missing "## [Unreleased]" section');
  process.exit(3);
}

const unreleasedStartIndex = unreleasedHeaderMatch.index;
const afterUnreleasedHeaderIndex = unreleasedStartIndex + unreleasedHeaderMatch[0].length;

const nextHeaderIndex = changelog
  .slice(afterUnreleasedHeaderIndex)
  .search(/^## \[/m);

if (nextHeaderIndex === -1) {
  console.error('CHANGELOG.md: expected a version section after [Unreleased]');
  process.exit(4);
}

const unreleasedEndIndex = afterUnreleasedHeaderIndex + nextHeaderIndex;
const unreleasedSection = changelog.slice(unreleasedStartIndex, unreleasedEndIndex);

const unreleasedBody = unreleasedSection
  .replace(/^## \[Unreleased\]\s*$/m, '')
  .trim();

const placeholderPatterns = [
  /^_Add changes for the next release here\._$/m,
  /^_다음 릴리즈에 포함될 변경사항을 여기에 작성하세요\._$/m,
];

const bodyWithoutPlaceholders = placeholderPatterns
  .reduce((text, pattern) => text.replace(pattern, ''), unreleasedBody)
  .trim();

if (!bodyWithoutPlaceholders) {
  console.error('CHANGELOG.md: [Unreleased] is empty (add notes before releasing)');
  process.exit(5);
}

const versionHeaderRe = new RegExp(`^## \\[${escapeRegExp(version)}\\] - `, 'm');
if (versionHeaderRe.test(changelog)) {
  console.error(`CHANGELOG.md: version "${version}" already exists`);
  process.exit(6);
}

const newUnreleased = [
  '## [Unreleased]',
  '',
  '_Add changes for the next release here._',
  '',
  '<details>',
  '<summary>한국어 (요약)</summary>',
  '',
  '_다음 릴리즈에 포함될 변경사항을 여기에 작성하세요._',
  '',
  '</details>',
  '',
  '---',
  '',
].join('\n');

const newVersionSection = [
  `## [${version}] - ${date}`,
  '',
  bodyWithoutPlaceholders.trimEnd(),
  '',
  '---',
  '',
].join('\n');

const updated = [
  changelog.slice(0, unreleasedStartIndex),
  newUnreleased,
  newVersionSection,
  changelog.slice(unreleasedEndIndex).replace(/^\s+/, ''),
].join('');

fs.writeFileSync(changelogPath, updated, 'utf8');
console.log(`finalize-changelog: moved [Unreleased] -> [${version}] (${date})`);

