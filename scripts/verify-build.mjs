import {readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {documentConfig, resolveLearnedThroughGrade} from '../docs/config.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const htmlPath = path.join(projectRoot, 'dist/docs/index.html');
const publishedPdfPath = path.join(projectRoot, 'dist/docs', documentConfig.pdfFilename);
const outputPdfPath = path.join(projectRoot, 'output/pdf', documentConfig.pdfFilename);
const buildInfoPath = path.join(projectRoot, 'dist/docs/build-info.json');
const docsDirectory = path.join(projectRoot, 'dist/docs');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function verifyBuild() {
  const grade = resolveLearnedThroughGrade();
  const html = await readFile(htmlPath, 'utf8');
  const buildInfo = JSON.parse(await readFile(buildInfoPath, 'utf8'));
  const rubyCount = (html.match(/<ruby\b/g) ?? []).length;
  const codeBlocks = html.match(/<pre\b[\s\S]*?<\/pre>/g) ?? [];
  const docsEntries = await readdir(docsDirectory, {withFileTypes: true});

  assert(html.includes(`data-rubygana-grade="${grade}"`), 'HTML does not record the configured grade.');
  assert(buildInfo.kanjiDataset.id === 'mext-h29', 'Build does not use the current MEXT kanji dataset.');
  assert(buildInfo.kanjiDataset.gradeCounts.reduce((total, count) => total + count, 0) === 1026,
    'Build does not record all 1,026 elementary school kanji.');
  assert(rubyCount >= 20, `Expected at least 20 ruby elements, found ${rubyCount}.`);
  assert(codeBlocks.length >= 5, 'Expected documentation code examples.');
  assert(codeBlocks.every((block) => !block.includes('<ruby')), 'rubygana changed a code block.');
  assert(html.includes('<rt>りゅうぐうじょう</rt>'), 'The 竜宮城 reading override was not applied.');
  assert(docsEntries.every((entry) => !['dist', 'docs', 'tmp'].includes(entry.name)),
    'Web Publication contains a copied build or temporary directory.');

  for (const pdfPath of [publishedPdfPath, outputPdfPath]) {
    const pdf = await readFile(pdfPath);
    const pdfStat = await stat(pdfPath);
    assert(pdf.subarray(0, 5).toString() === '%PDF-', `${pdfPath} is not a PDF.`);
    assert(pdfStat.size > 50_000, `${pdfPath} is unexpectedly small.`);
  }

  console.log(`Verified HTML, ${rubyCount} ruby elements, excluded code blocks, and both PDF copies.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyBuild();
}
