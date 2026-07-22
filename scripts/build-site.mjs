import {copyFile, cp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {buildDocs} from './build-docs.mjs';
import {buildSamples} from './build-samples.mjs';
import {buildSb3} from './sb3/build.mjs';
import {verifyBuild} from './verify-build.mjs';

const source = new URL('../site/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
const outputPath = fileURLToPath(output);
const faviconPath = path.join(outputPath, 'favicon.png');
const heroImageSource = new URL('../docs/images/image49.png', import.meta.url);
const heroImageDirectory = new URL('../dist/images/', import.meta.url);
const downloadSb3 = new URL('../dist/downloads/kamishibai.sb3', import.meta.url);

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const nestedFiles = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findHtmlFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
  }));
  return nestedFiles.flat();
}

async function addFaviconLinks() {
  const htmlFiles = await findHtmlFiles(outputPath);

  for (const htmlFile of htmlFiles) {
    const sourceHtml = await readFile(htmlFile, 'utf8');
    const relativePath = path.relative(path.dirname(htmlFile), faviconPath).split(path.sep).join('/');
    const faviconLink = `<link rel="icon" type="image/png" sizes="256x256" href="${relativePath}">`;
    const updatedHtml = sourceHtml.replace(/<head(?:\s[^>]*)?>/iu, `$&\n  ${faviconLink}`);

    if (updatedHtml === sourceHtml) {
      throw new Error(`Cannot add a favicon link because ${htmlFile} does not contain <head>.`);
    }
    await writeFile(htmlFile, updatedHtml);
  }

  console.log(`Added favicon links to ${htmlFiles.length} HTML file(s).`);
}

await rm(output, {recursive: true, force: true});
await cp(source, output, {recursive: true});
const sb3Build = await buildSb3({outputPath: fileURLToPath(downloadSb3)});
console.log(`Built downloadable SB3: ${sb3Build.outputPath}`);
await mkdir(heroImageDirectory, {recursive: true});
await copyFile(heroImageSource, new URL('image49.png', heroImageDirectory));
await buildSamples();
await buildDocs();
await addFaviconLinks();
await verifyBuild();
console.log('Built GitHub Pages content in dist/');
