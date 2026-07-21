import {copyFile, mkdir, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const sourceDirectory = fileURLToPath(new URL('../samples/', import.meta.url));
const outputDirectory = fileURLToPath(new URL('../dist/samples/', import.meta.url));

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function listSampleFilenames(directory = sourceDirectory) {
  const entries = await readdir(directory, {withFileTypes: true});

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.txt'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'ja', {numeric: true}));
}

export function renderSamplesIndex(sampleFilenames) {
  const sampleItems = sampleFilenames.map((filename) => {
    const href = encodeURIComponent(filename);
    return `        <li><a href="${href}"><code>${escapeHtml(filename)}</code></a></li>`;
  }).join('\n');

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="TMPose紙芝居のサンプル台本一覧">
  <title>サンプル | TMPose紙芝居</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, sans-serif; }
    body { margin: 0; background: #fff8ee; color: #3f302b; }
    main { max-width: 760px; margin: auto; padding: 48px 24px 72px; }
    h1 { margin-bottom: .5rem; }
    ul { padding-left: 1.5rem; }
    li { margin: .75rem 0; }
    a { color: #7b2f24; }
    code { font-size: 1rem; }
  </style>
</head>
<body>
  <main>
    <h1>サンプル台本</h1>
    <p>TMPose紙芝居で利用できるテキスト形式の台本です。リンクから内容を表示または保存できます。</p>
    <ul>
${sampleItems}
    </ul>
    <p><a href="../">トップへ戻る</a></p>
  </main>
</body>
</html>
`;
}

export async function buildSamples() {
  const sampleFilenames = await listSampleFilenames();

  await rm(outputDirectory, {recursive: true, force: true});
  await mkdir(outputDirectory, {recursive: true});
  await Promise.all(sampleFilenames.map((filename) => copyFile(
    path.join(sourceDirectory, filename),
    path.join(outputDirectory, filename),
  )));
  await writeFile(
    path.join(outputDirectory, 'index.html'),
    renderSamplesIndex(sampleFilenames),
    'utf8',
  );

  console.log(`Built ${sampleFilenames.length} sample file(s) in dist/samples/.`);
}
