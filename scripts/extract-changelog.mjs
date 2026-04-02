import fs from 'node:fs';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const rawArg = process.argv[2] ?? '';
const version = rawArg.replace(/^v/i, '').trim();

if (!version) {
  console.error('Usage: node scripts/extract-changelog.mjs <version>');
  process.exit(2);
}

const changelogPath = new URL('../CHANGELOG.md', import.meta.url);
const changelog = fs.readFileSync(changelogPath, 'utf8');

const headerRe = new RegExp(`^## \\[${escapeRegExp(version)}\\] - .*$`, 'm');
const headerMatch = headerRe.exec(changelog);
if (!headerMatch) {
  console.error(`CHANGELOG.md: could not find version "${version}"`);
  process.exit(3);
}

const startIndex = headerMatch.index;
const afterHeaderIndex = startIndex + headerMatch[0].length;

const nextHeaderIndex = changelog
  .slice(afterHeaderIndex)
  .search(/^## \[/m);

const endIndex = nextHeaderIndex === -1
  ? changelog.length
  : afterHeaderIndex + nextHeaderIndex;

let section = changelog.slice(startIndex, endIndex).trimEnd();
section = section.replace(/\n---\s*$/, '').trimEnd();
process.stdout.write(`${section}\n`);
