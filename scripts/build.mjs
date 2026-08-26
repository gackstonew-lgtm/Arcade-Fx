import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const htmlPages = ['index', 'landing', 'markets', 'trading', 'smc', 'signals', 'alerts', 'news', 'classes', 'tools', 'login', 'register'];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const name of ['css', 'icons', 'src', 'admin', 'public']) await cp(join(root, name), join(dist, name), { recursive: true, force: true });

async function copyFileResilient(filename, targetDir, isRequired = true) {
  const exactPath = join(root, filename);
  try {
    await cp(exactPath, join(targetDir, filename));
  } catch (err) {
    try {
      const entries = await readdir(root);
      const matched = entries.find((e) => e.toLowerCase() === filename.toLowerCase());
      if (matched) {
        await cp(join(root, matched), join(targetDir, filename));
        return;
      }
    } catch {}

    if (isRequired) {
      throw new Error(`Required static asset "${filename}" was not found in project root: ${exactPath}`);
    } else {
      console.warn(`[build.mjs] Optional asset "${filename}" not found in root; skipping.`);
    }
  }
}

for (const name of ['Arcade Fx logo.jpeg', 'manifest.json', 'styles.css', 'sw.js', '_redirects']) {
  await copyFileResilient(name, dist, true);
}

for (const name of ['.htaccess']) {
  await copyFileResilient(name, dist, false);
}

for (const name of htmlPages) {
  const htmlPath = join(root, `${name}.html`);
  let page = await readFile(htmlPath, 'utf8');

  for (const p of htmlPages) {
    page = page.replace(new RegExp(`href=["']${p}\\.php["']`, 'g'), `href="${p}.html"`);
    page = page.replace(new RegExp(`location\\.href\\s*=\\s*['"]${p}\\.php['"]`, 'g'), `location.href = '${p}.html'`);
  }

  await writeFile(join(dist, `${name}.html`), page);
}

console.log(`Built static Netlify publish directory at ${dist}`);
