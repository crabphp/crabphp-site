import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frameworkRoot = process.env.CRABPHP_FRAMEWORK_PATH
  ? resolve(siteRoot, process.env.CRABPHP_FRAMEWORK_PATH)
  : resolve(siteRoot, '..', 'framework');
const sourceRoot = join(frameworkRoot, 'docs');
const publicRoot = join(siteRoot, 'public', 'content');
const destinationRoot = join(publicRoot, 'docs');
const remoteRepository = (process.env.CRABPHP_FRAMEWORK_REPO || 'https://github.com/crabphp/framework')
  .replace(/\.git$/, '')
  .replace(/\/$/, '');
const remoteRef = process.env.CRABPHP_FRAMEWORK_REF || 'main';

await mkdir(destinationRoot, { recursive: true });

async function localFileExists(file) {
  try {
    await access(join(sourceRoot, file));
    return true;
  } catch {
    return false;
  }
}

async function sourceFile(file) {
  if (await localFileExists(file)) return readFile(join(sourceRoot, file), 'utf8');

  const path = new URL(`${remoteRepository}/raw/${remoteRef}/docs/${file}`);
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not fetch ${path} (${response.status}).`);
  return response.text();
}

const localFiles = (await readdir(sourceRoot).catch(() => [])).filter((file) => file.endsWith('.md'));
const menu = await sourceFile('documentation.md');
const menuFiles = [...menu.matchAll(/^- \[([^\]]+)\]\(([^)#]+\.md)\)/gm)].map((match) => match[2]);
const sourceFiles = [...new Set(['documentation.md', ...localFiles, ...menuFiles])];
await Promise.all(sourceFiles.map(async (file) => writeFile(join(destinationRoot, file), await sourceFile(file))));
const pages = [];
for (const match of menu.matchAll(/^- \[([^\]]+)\]\(([^)#]+\.md)\)/gm)) {
  pages.push({ title: match[1], file: match[2].replace(/\.md$/, '') });
}

const grouped = [];
let group = null;
for (const line of menu.split('\n')) {
  const heading = line.match(/^## (.+)$/);
  if (heading) {
    group = { title: heading[1], pages: [] };
    grouped.push(group);
    continue;
  }
  const page = line.match(/^- \[([^\]]+)\]\(([^)#]+\.md)\)/);
  if (page && group) group.pages.push({ title: page[1], file: page[2].replace(/\.md$/, '') });
}

await writeFile(join(publicRoot, 'docs.json'), JSON.stringify({ pages, grouped }, null, 2) + '\n');
console.log(`Synced ${sourceFiles.length} documentation files from ${sourceRoot}`);

// Guides of the first-party packages, each beside the framework's pages under a group of its own.
// Read from a checkout beside the site when there is one, else from the package's repository.
const packages = [
  {
    title: 'ORM (Tide)',
    file: 'tide.md',
    checkout: process.env.CRABPHP_TIDE_PATH ? resolve(siteRoot, process.env.CRABPHP_TIDE_PATH) : resolve(siteRoot, '..', 'tide'),
    repository: 'https://github.com/crabphp/tide',
    path: 'docs/guide.md',
  },
  {
    title: 'Arc (experimental)',
    file: 'arc.md',
    checkout: process.env.CRABPHP_ARC_PATH ? resolve(siteRoot, process.env.CRABPHP_ARC_PATH) : resolve(siteRoot, '..', 'arc'),
    repository: 'https://github.com/crabphp/arc',
    path: 'README.md',
  },
];
const packagePages = [];
for (const item of packages) {
  let markdown;
  try {
    markdown = await readFile(join(item.checkout, item.path), 'utf8');
  } catch {
    const url = new URL(`${item.repository}/raw/main/${item.path}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not fetch ${url} (${response.status}).`);
    markdown = await response.text();
  }
  // A link to the package's own files leads to its repository: from a guide in docs/ as ../FILE,
  // from a README at the root as FILE.
  if (!item.path.includes('/')) {
    markdown = markdown.replace(/\]\((?!https?:|#|\/)([^)#]+\.md)(#[^)]*)?\)/g, (_, file, anchor = '') => `](${item.repository}/blob/main/${file}${anchor})`);
  }
  markdown = markdown.replace(/\]\(\.\.\/([^)#]+)(#[^)]*)?\)/g, (_, file, anchor = '') => (
    file === 'README.md'
      ? `](${item.repository}${anchor || '#readme'})`
      : `](${item.repository}/blob/main/${file}${anchor})`
  ));
  await writeFile(join(destinationRoot, item.file), markdown);
  packagePages.push({ title: item.title, file: item.file, repository: item.repository, source: `${item.repository}/blob/main/${item.path}` });
}
await writeFile(join(publicRoot, 'packages.json'), JSON.stringify(packagePages, null, 2) + '\n');
console.log(`Synced ${packagePages.length} package guide(s)`);
