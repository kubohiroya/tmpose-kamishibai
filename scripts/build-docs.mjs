import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {copyFile, cp, mkdir, readFile, readdir, rename, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {documentConfig, resolveLearnedThroughGrade} from '../docs/config.mjs';

const require = createRequire(import.meta.url);
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const vivliostyleBin = path.join(
  path.dirname(require.resolve('@vivliostyle/cli/package.json')),
  'dist/cli.js',
);
const rubyganaBin = path.join(
  path.dirname(require.resolve('rubygana/package.json')),
  'bin/rubygana.js',
);
const rubyganaPackage = require('rubygana/package.json');
const rubyganaGradeData = require('rubygana/lib/学年別漢字.js').metadata;

function runNode(script, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: projectRoot,
      stdio: 'inherit',
      ...options,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${path.basename(script)} exited with ${signal ?? code}.`));
    });
  });
}

function runRubygana(input, output, grade) {
  return new Promise((resolve, reject) => {
    const rubyArguments = documentConfig.rubyOverrides.flatMap((override) => [
      '--ruby',
      override,
    ]);
    const child = spawn(process.execPath, [
      rubyganaBin,
      '--html',
      '--grade',
      String(grade),
      '--use-rp',
      ...rubyArguments,
      input,
    ], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const chunks = [];

    child.stdout.on('data', (chunk) => chunks.push(chunk));
    child.on('error', reject);
    child.on('exit', async (code, signal) => {
      if (code !== 0) {
        reject(new Error(`rubygana exited with ${signal ?? code}.`));
        return;
      }

      try {
        await writeFile(output, Buffer.concat(chunks));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return findHtmlFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
  }));
  return nested.flat();
}

async function addBuildNote(htmlPath, grade) {
  const source = await readFile(htmlPath, 'utf8');
  const note = `<p class="furigana-build-note">このHTMLとPDFは、小学${grade}年生までに学ぶ漢字を既習として、以後に学ぶ漢字へふりがなを付けています。</p>`;
  const withGrade = source.replace(/<html(\s|>)/i, `<html data-rubygana-grade="${grade}"$1`);
  const withNote = withGrade.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/i, `$1\n${note}`);
  await writeFile(htmlPath, withNote);
}

function browserArguments() {
  if (process.env.VIVLIOSTYLE_CHROME_PATH) {
    return ['--executable-browser', process.env.VIVLIOSTYLE_CHROME_PATH];
  }

  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.platform === 'darwin' && existsSync(macChrome)) {
    return ['--executable-browser', macChrome];
  }

  return [];
}

export async function buildDocs({distDirectory = path.join(projectRoot, 'dist')} = {}) {
  const grade = resolveLearnedThroughGrade();
  const source = path.join(projectRoot, 'docs/index.md');
  const theme = path.join(projectRoot, 'docs/theme.css');
  const tempDirectory = path.join(projectRoot, 'tmp/docs-webpub');
  const docsDirectory = path.join(distDirectory, 'docs');
  const pdfDirectory = path.join(projectRoot, 'output/pdf');
  const pdfPath = path.join(pdfDirectory, documentConfig.pdfFilename);

  await rm(tempDirectory, {recursive: true, force: true});
  await rm(docsDirectory, {recursive: true, force: true});
  await mkdir(path.dirname(tempDirectory), {recursive: true});
  await mkdir(pdfDirectory, {recursive: true});

  await runNode(vivliostyleBin, [
    'build',
    source,
    '--theme',
    theme,
    '--title',
    documentConfig.title,
    '--author',
    documentConfig.author,
    '--language',
    'ja',
    '--output',
    tempDirectory,
    '--format',
    'webpub',
  ]);

  await cp(tempDirectory, docsDirectory, {recursive: true});
  const htmlFiles = await findHtmlFiles(docsDirectory);
  if (htmlFiles.length === 0) {
    throw new Error('Vivliostyle did not generate an HTML document.');
  }

  for (const htmlFile of htmlFiles) {
    await addBuildNote(htmlFile, grade);
    const rubyOutput = `${htmlFile}.rubygana`;
    await runRubygana(htmlFile, rubyOutput, grade);
    await rename(rubyOutput, htmlFile);
  }

  const indexHtml = htmlFiles.find((htmlFile) => path.basename(htmlFile) === 'index.html')
    ?? htmlFiles[0];
  await runNode(vivliostyleBin, [
    'build',
    indexHtml,
    '--single-doc',
    '--size',
    'A4',
    '--output',
    pdfPath,
    ...browserArguments(),
  ]);
  await copyFile(pdfPath, path.join(docsDirectory, documentConfig.pdfFilename));
  await writeFile(path.join(docsDirectory, 'build-info.json'), `${JSON.stringify({
    learnedThroughGrade: grade,
    rubyGenerator: `${rubyganaPackage.name} ${rubyganaPackage.version}`,
    kanjiDataset: {
      id: rubyganaGradeData.id,
      sourceUrl: rubyganaGradeData.sourceUrl,
      gradeCounts: rubyganaGradeData.expectedGradeCounts,
    },
    htmlAndPdfGenerator: 'Vivliostyle CLI 11.1.0',
  }, null, 2)}\n`);

  console.log(`Built grade ${grade} furigana docs in ${path.relative(projectRoot, docsDirectory)}/`);
  console.log(`Built PDF in ${path.relative(projectRoot, pdfPath)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildDocs();
}
