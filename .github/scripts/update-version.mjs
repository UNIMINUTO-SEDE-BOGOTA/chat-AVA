import { readFileSync, writeFileSync } from 'node:fs';

const indexPath = 'index.html';
const versionPath = 'version.json';

const sha = (process.env.GITHUB_SHA || '').slice(0, 7) || 'local';
const now = new Date();
const yyyy = now.getUTCFullYear();
const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
const dd = String(now.getUTCDate()).padStart(2, '0');
const hh = String(now.getUTCHours()).padStart(2, '0');
const mi = String(now.getUTCMinutes()).padStart(2, '0');

const buildId = `${yyyy}${mm}${dd}-${hh}${mi}-${sha}`;
const deployedAt = `${yyyy}-${mm}-${dd}`;

const versionPayload = {
  buildId,
  deployedAt
};

writeFileSync(versionPath, `${JSON.stringify(versionPayload, null, 2)}\n`, 'utf8');

const indexContent = readFileSync(indexPath, 'utf8');
const updatedIndex = indexContent.replace(
  /<meta\s+name="app-build-id"\s+content="[^"]*"\s*>/,
  `<meta name="app-build-id" content="${buildId}">`
);

if (updatedIndex !== indexContent) {
  writeFileSync(indexPath, updatedIndex, 'utf8');
}

console.log(`Updated buildId: ${buildId}`);
