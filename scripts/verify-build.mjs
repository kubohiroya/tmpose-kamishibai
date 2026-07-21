import {access, readFile, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {
  documentConfig,
  resolveLearnedThroughGrade,
} from '../docs/config.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const docsDirectory = path.join(projectRoot, 'dist/docs');
const tocPath = path.join(docsDirectory, 'index.html');
const htmlPath = path.join(
  docsDirectory,
  documentConfig.sourceFilename.replace(/\.md$/u, '.html'),
);
const sourcePath = path.join(projectRoot, 'docs', documentConfig.sourceFilename);
const publishedPdfPath = path.join(docsDirectory, documentConfig.pdfFilename);
const outputPdfPath = path.join(projectRoot, 'output/pdf', documentConfig.pdfFilename);
const buildInfoPath = path.join(docsDirectory, 'build-info.json');
const samplesSourceDirectory = path.join(projectRoot, 'samples');
const samplesDirectory = path.join(projectRoot, 'dist/samples');
const samplesIndexPath = path.join(samplesDirectory, 'index.html');

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

async function verifySamples() {
  const sourceEntries = await readdir(samplesSourceDirectory, {withFileTypes: true});
  const publishedEntries = await readdir(samplesDirectory, {withFileTypes: true});
  const sourceFilenames = sourceEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.txt'))
    .map((entry) => entry.name)
    .sort();
  const publishedFilenames = publishedEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.txt'))
    .map((entry) => entry.name)
    .sort();
  const sampleLinks = (await verifyLocalReferences(samplesIndexPath, 'a', 'href'))
    .map((reference) => decodeURIComponent(reference.replace(/^\.\//u, '')));

  assert(sourceFilenames.length > 0, 'No samples/*.txt source files were found.');
  assert(JSON.stringify(publishedFilenames) === JSON.stringify(sourceFilenames),
    'Published sample files do not match samples/*.txt.');

  for (const filename of sourceFilenames) {
    assert(sampleLinks.includes(filename),
      `${filename} is missing from the published sample index.`);
    const [source, published] = await Promise.all([
      readFile(path.join(samplesSourceDirectory, filename)),
      readFile(path.join(samplesDirectory, filename)),
    ]);
    assert(source.equals(published), `${filename} changed while being published.`);
  }

  return sourceFilenames.length;
}

export async function verifyBuild() {
  const grade = resolveLearnedThroughGrade();
  const buildInfo = JSON.parse(await readFile(buildInfoPath, 'utf8'));
  const source = await readFile(sourcePath, 'utf8');
  const toc = await readFile(tocPath, 'utf8');
  const html = await readFile(htmlPath, 'utf8');
  const rubyCount = (html.match(/<ruby\b/gu) ?? []).length;
  const sourceNameCount = (source.match(/久保裕也/gu) ?? []).length;
  const correctNameRubyCount = (
    html.match(/<ruby><rb>裕也<\/rb>[\s\S]*?<rt>ひろや<\/rt>[\s\S]*?<\/ruby>/gu) ?? []
  ).length;
  const incorrectNameRubyCount = (
    html.match(/<ruby><rb>裕也<\/rb>[\s\S]*?<rt>ゆうや<\/rt>[\s\S]*?<\/ruby>/gu) ?? []
  ).length;
  const tocLabelCount = (toc.match(/class="toc-label"/gu) ?? []).length;
  const codeBlocks = html.match(/<pre\b[\s\S]*?<\/pre>/gu) ?? [];
  const sourceImageCount = (
    source.match(/!\[\]\[image\d+\]\{style="width: [0-9.]+px;"\}/gu) ?? []
  ).length;
  const docsEntries = await readdir(docsDirectory, {withFileTypes: true});
  const tocLinks = await verifyLocalReferences(tocPath, 'a', 'href');
  const images = await verifyLocalReferences(htmlPath, 'img', 'src');
  const imageStyles = attributeValues(html, 'img', 'style');
  const sampleCount = await verifySamples();

  assert(buildInfo.kanjiDataset.id === 'mext-h29',
    'Build does not use the current MEXT kanji dataset.');
  assert(buildInfo.kanjiDataset.gradeCounts.reduce((total, count) => total + count, 0) === 1026,
    'Build does not record all 1,026 elementary school kanji.');
  assert(buildInfo.publicationKind === 'documentation',
    'Build metadata does not identify the documentation publication.');
  assert(buildInfo.sourceFilename === documentConfig.sourceFilename,
    'Build metadata does not identify the configured Markdown source.');
  assert(buildInfo.generatedTableOfContents.sectionDepth === documentConfig.tocSectionDepth,
    'Build metadata does not record the configured TOC depth.');
  assert(!/^## 目次\s*$/mu.test(source),
    'Documentation source contains a manually maintained table of contents.');
  assert(!/^#{1,6}\s+!\[/mu.test(source),
    'Documentation source contains an image-only heading.');
  assert(toc.includes('<nav id="toc" role="doc-toc">'),
    'Documentation does not contain a generated doc-toc navigation.');
  assert(tocLinks.length >= 80,
    `Expected at least 80 generated TOC links, found ${tocLinks.length}.`);
  assert(tocLabelCount === tocLinks.length,
    `Expected every TOC link to contain one label, found ${tocLabelCount} labels.`);
  assert(toc.includes('data-section-level="4"'),
    'Documentation table of contents does not include fourth-level headings.');
  assert(!toc.includes('data-section-level="5"'),
    'Documentation table of contents includes headings deeper than configured.');
  assert(html.includes('<h2 id="c-付録3-ライブラリなど">'),
    'Documentation appendix C does not use the same heading level as appendices A and B.');
  assert(!html.includes('{#1.3-この作品は、どんな技術でできているの？}'),
    'Documentation HTML contains an unresolved Markdown ID attribute.');
  assert(rubyCount >= 500,
    `Expected at least 500 ruby elements, found ${rubyCount}.`);
  assert(codeBlocks.every((block) => !block.includes('<ruby')),
    'rubygana changed a code block.');
  assert(html.includes('<rt>りゅうぐうじょう</rt>'),
    'The 竜宮城 reading override was not applied.');
  assert(sourceNameCount > 0 && correctNameRubyCount === sourceNameCount,
    'The scoped 久保裕也 name reading override was not applied to every occurrence.');
  assert(incorrectNameRubyCount === 0,
    'Documentation HTML still contains the incorrect ゆうや reading.');
  assert(sourceImageCount === 73,
    `Expected 73 sized image placements in Markdown, found ${sourceImageCount}.`);
  assert(images.length === sourceImageCount,
    `Expected ${sourceImageCount} documentation image elements, found ${images.length}.`);
  assert(
    imageStyles.length === images.length
      && imageStyles.every((style) => /(?:^|;)\s*width:\s*[0-9.]+px;/u.test(style)),
    'A generated documentation image is missing its source placement width.',
  );
  assert(!html.includes('data:image/'), 'Documentation HTML contains an embedded image data URL.');
  assert(toc.includes(`data-rubygana-grade="${grade}"`),
    'Documentation TOC does not record the configured grade.');
  assert(html.includes(`data-rubygana-grade="${grade}"`),
    'Documentation HTML does not record the configured grade.');
  assert(docsEntries.every((entry) => !['dist', 'docs', 'tmp', 'textbook'].includes(entry.name)),
    'Web Publication contains a copied build, temporary directory, or obsolete textbook output.');
  assert(docsEntries.every((entry) => entry.name !== 'tmpose-kamishibai-guide.pdf'),
    'Web Publication still contains the replaced guide PDF.');

  for (const pdfPath of [publishedPdfPath, outputPdfPath]) {
    const pdf = await readFile(pdfPath);
    const pdfStat = await stat(pdfPath);
    assert(pdf.subarray(0, 5).toString() === '%PDF-', `${pdfPath} is not a PDF.`);
    assert(pdfStat.size > 50_000, `${pdfPath} is unexpectedly small.`);
  }

  console.log(
    `Verified ${tocLinks.length} documentation TOC links, ${images.length} images, `
      + `${rubyCount} ruby elements, ${sampleCount} sample file(s), and both PDF copies.`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verifyBuild();
}
