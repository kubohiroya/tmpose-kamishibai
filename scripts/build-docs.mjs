import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {copyFile, cp, mkdir, readFile, readdir, rename, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  documentConfig,
  resolveLearnedThroughGrade,
} from '../docs/config.mjs';

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
    child.stdout.on('error', reject);
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

async function processHtmlFiles(directory, grade) {
  const htmlFiles = await findHtmlFiles(directory);
  if (htmlFiles.length === 0) {
    throw new Error('Vivliostyle did not generate an HTML document.');
  }

  for (const htmlFile of htmlFiles) {
    await prepareHtml(htmlFile, grade);
    const rubyOutput = `${htmlFile}.rubygana`;
    await runRubygana(htmlFile, rubyOutput, grade);
    await rename(rubyOutput, htmlFile);
  }

  return htmlFiles;
}

function createBuildInfo(grade, details = {}) {
  return {
    learnedThroughGrade: grade,
    rubyGenerator: `${rubyganaPackage.name} ${rubyganaPackage.version}`,
    kanjiDataset: {
      id: rubyganaGradeData.id,
      sourceUrl: rubyganaGradeData.sourceUrl,
      gradeCounts: rubyganaGradeData.expectedGradeCounts,
    },
    htmlAndPdfGenerator: 'Vivliostyle CLI 11.1.0',
    ...details,
  };
}

async function writeBuildInfo(directory, grade, details) {
  await writeFile(
    path.join(directory, 'build-info.json'),
    `${JSON.stringify(createBuildInfo(grade, details), null, 2)}\n`,
  );
}

async function prepareHtml(htmlPath, grade) {
  const source = await readFile(htmlPath, 'utf8');
  const note = `<p class="furigana-build-note">このHTMLとPDFは、小学${grade}年生までに学ぶ漢字を既習として、以後に学ぶ漢字へふりがなを付けています。</p>`;
  const withTocLabels = source.replace(
    /<nav\b[^>]*\bid="toc"[^>]*>[\s\S]*?<\/nav>/iu,
    (tableOfContents) => tableOfContents.replace(
      /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/giu,
      '$1<span class="toc-label">$2</span>$3',
    ),
  );
  const withGrade = withTocLabels.replace(
    /<html(\s|>)/i,
    `<html data-rubygana-grade="${grade}"$1`,
  );
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
  const configPath = path.join(projectRoot, 'docs/vivliostyle.config.mjs');
  const workspaceDirectory = path.join(projectRoot, 'tmp/docs-vivliostyle');
  const tempDirectory = path.join(projectRoot, 'tmp/docs-webpub');
  const docsDirectory = path.join(distDirectory, 'docs');
  const pdfDirectory = path.join(projectRoot, 'output/pdf');
  const pdfPath = path.join(pdfDirectory, documentConfig.pdfFilename);

  await rm(workspaceDirectory, {recursive: true, force: true});
  await rm(tempDirectory, {recursive: true, force: true});
  await rm(docsDirectory, {recursive: true, force: true});
  await mkdir(pdfDirectory, {recursive: true});

  await runNode(vivliostyleBin, [
    'build',
    '--config',
    configPath,
    '--output',
    tempDirectory,
    '--format',
    'webpub',
  ], {cwd: path.dirname(configPath)});

  await cp(tempDirectory, docsDirectory, {recursive: true});
  await processHtmlFiles(docsDirectory, grade);

  const publicationManifest = path.join(docsDirectory, 'publication.json');
  if (!existsSync(publicationManifest)) {
    throw new Error('Documentation Web Publication does not contain publication.json.');
  }

  await runNode(vivliostyleBin, [
    'build',
    'publication.json',
    '--size',
    'A4',
    '--output',
    pdfPath,
    ...browserArguments(),
  ], {cwd: docsDirectory});
  await copyFile(pdfPath, path.join(docsDirectory, documentConfig.pdfFilename));
  await writeBuildInfo(docsDirectory, grade, {
    publicationKind: 'documentation',
    sourceFilename: documentConfig.sourceFilename,
    generatedTableOfContents: {
      title: '目次',
      sectionDepth: documentConfig.tocSectionDepth,
    },
  });

  console.log(`Built grade ${grade} documentation in ${path.relative(projectRoot, docsDirectory)}/`);
  console.log(`Built documentation PDF in ${path.relative(projectRoot, pdfPath)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildDocs();
}
