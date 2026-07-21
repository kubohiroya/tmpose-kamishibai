import {access, readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  documentConfig,
  resolveLearnedThroughGrade,
  textbookConfig,
} from '../docs/config.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const htmlPath = path.join(projectRoot, 'dist/docs/index.html');
const publishedPdfPath = path.join(projectRoot, 'dist/docs', documentConfig.pdfFilename);
const outputPdfPath = path.join(projectRoot, 'output/pdf', documentConfig.pdfFilename);
const buildInfoPath = path.join(projectRoot, 'dist/docs/build-info.json');
const docsDirectory = path.join(projectRoot, 'dist/docs');
const textbookDirectory = path.join(docsDirectory, textbookConfig.outputDirectory);
const textbookTocPath = path.join(textbookDirectory, 'index.html');
const textbookHtmlPath = path.join(
  textbookDirectory,
  textbookConfig.sourceFilename.replace(/\.md$/u, '.html'),
);
const textbookSourcePath = path.join(projectRoot, 'docs', textbookConfig.sourceFilename);
const publishedTextbookPdfPath = path.join(textbookDirectory, textbookConfig.pdfFilename);
const outputTextbookPdfPath = path.join(
  projectRoot,
  'output/pdf',
  textbookConfig.pdfFilename,
);
const textbookBuildInfoPath = path.join(textbookDirectory, 'build-info.json');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function attributeValues(html, tagName, attributeName) {
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*\\b${attributeName}="([^"]+)"`, 'gu');
  return [...html.matchAll(tagPattern)].map((match) => match[1]);
}

async function verifyLocalReferences(htmlPath, tagName, attributeName) {
  const html = await readFile(htmlPath, 'utf8');
  const references = attributeValues(html, tagName, attributeName)
    .filter((reference) => !/^(?:data:|https?:|mailto:)/u.test(reference));

  for (const reference of references) {
    const [relativePath, encodedFragment] = reference.split('#');
    const targetPath = path.resolve(path.dirname(htmlPath), decodeURIComponent(relativePath));
    await access(targetPath);

    if (encodedFragment) {
      const targetHtml = await readFile(targetPath, 'utf8');
      const targetIds = new Set(attributeValues(targetHtml, '[a-z][a-z0-9]*', 'id'));
      const fragment = decodeURIComponent(encodedFragment);
      assert(targetIds.has(fragment), `${reference} does not resolve from ${htmlPath}.`);
    }
  }

  return references;
}

export async function verifyBuild() {
  const grade = resolveLearnedThroughGrade();
  const html = await readFile(htmlPath, 'utf8');
  const buildInfo = JSON.parse(await readFile(buildInfoPath, 'utf8'));
  const textbookBuildInfo = JSON.parse(await readFile(textbookBuildInfoPath, 'utf8'));
  const textbookSource = await readFile(textbookSourcePath, 'utf8');
  const textbookToc = await readFile(textbookTocPath, 'utf8');
  const textbookHtml = await readFile(textbookHtmlPath, 'utf8');
  const rubyCount = (html.match(/<ruby\b/g) ?? []).length;
  const codeBlocks = html.match(/<pre\b[\s\S]*?<\/pre>/g) ?? [];
  const docsEntries = await readdir(docsDirectory, {withFileTypes: true});
  const textbookTocLinks = await verifyLocalReferences(textbookTocPath, 'a', 'href');
  const textbookImages = await verifyLocalReferences(textbookHtmlPath, 'img', 'src');
  const textbookRubyCount = (textbookHtml.match(/<ruby\b/gu) ?? []).length;

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
  assert(!/^## 目次\s*$/mu.test(textbookSource),
    'Textbook source contains a manually maintained table of contents.');
  assert(!/^#{1,6}\s+!\[/mu.test(textbookSource),
    'Textbook source contains an image-only heading.');
  assert(textbookToc.includes('<nav id="toc" role="doc-toc">'),
    'Textbook does not contain a generated doc-toc navigation.');
  assert(textbookTocLinks.length >= 80,
    `Expected at least 80 generated textbook TOC links, found ${textbookTocLinks.length}.`);
  assert(textbookToc.includes('data-section-level="4"'),
    'Textbook table of contents does not include fourth-level headings.');
  assert(!textbookToc.includes('data-section-level="5"'),
    'Textbook table of contents includes headings deeper than configured.');
  assert(textbookHtml.includes('<h2 id="c-付録3-ライブラリなど">'),
    'Textbook appendix C does not use the same heading level as appendices A and B.');
  assert(textbookRubyCount >= 500,
    `Expected at least 500 textbook ruby elements, found ${textbookRubyCount}.`);
  assert(textbookImages.length === 66,
    `Expected 66 textbook image elements, found ${textbookImages.length}.`);
  assert(!textbookHtml.includes('data:image/'), 'Textbook HTML contains an embedded image data URL.');
  assert(textbookBuildInfo.publicationKind === 'textbook',
    'Textbook build metadata does not identify the textbook publication.');
  assert(textbookBuildInfo.generatedTableOfContents.sectionDepth === 4,
    'Textbook build metadata does not record the configured TOC depth.');
  assert(textbookToc.includes(`data-rubygana-grade="${grade}"`),
    'Textbook TOC does not record the configured grade.');
  assert(textbookHtml.includes(`data-rubygana-grade="${grade}"`),
    'Textbook HTML does not record the configured grade.');

  for (const pdfPath of [
    publishedPdfPath,
    outputPdfPath,
    publishedTextbookPdfPath,
    outputTextbookPdfPath,
  ]) {
    const pdf = await readFile(pdfPath);
    const pdfStat = await stat(pdfPath);
    assert(pdf.subarray(0, 5).toString() === '%PDF-', `${pdfPath} is not a PDF.`);
    assert(pdfStat.size > 50_000, `${pdfPath} is unexpectedly small.`);
  }

  console.log(
    `Verified guide HTML, ${textbookTocLinks.length} textbook TOC links, `
      + `${textbookImages.length} textbook images, and all PDF copies.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyBuild();
}
