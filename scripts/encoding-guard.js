const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const extensions = new Set([".ts", ".js", ".json", ".md"]);
const replacementChar = "\uFFFD";
const defaultFilesToScan = [
  "scripts/encoding-guard.js",
  "src/auth.ts",
  "src/extension.ts",
  "src/gistService.ts",
  "src/settingsManager.ts",
];

const failures = [];
const filesToScan = process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : defaultFilesToScan;

for (const relativeFile of filesToScan) {
  const fullPath = path.join(rootDir, relativeFile);
  if (!fs.existsSync(fullPath)) {
    continue;
  }

  if (!extensions.has(path.extname(relativeFile).toLowerCase())) {
    continue;
  }

  const bytes = fs.readFileSync(fullPath);
  if (hasUtf8Bom(bytes)) {
    failures.push(`Unexpected UTF-8 BOM (must be UTF-8 without BOM): ${relativeFile}`);
  }

  const text = bytes.toString("utf8");
  if (text.includes(replacementChar)) {
    failures.push(`Found replacement character: ${relativeFile}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exit(1);
}

console.log("encoding-guard: OK");

function hasUtf8Bom(bytes) {
  return bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
}
