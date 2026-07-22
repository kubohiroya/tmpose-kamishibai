import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {strToU8, zipSync} from 'fflate';

import {
  decodeExtensionDataUrl,
  importSb3,
  parseCliArguments,
  validateArchiveEntryName,
} from '../scripts/sb3/import.mjs';

async function withTemporaryDirectory(callback) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'tmpose-sb3-import-test-'));
  try {
    return await callback(directory);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

async function writeSb3(filePath, entries) {
  await writeFile(filePath, zipSync(entries, {level: 0}));
}

test('imports assets and extracts embedded extensions without changing external URLs', async () => {
  await withTemporaryDirectory(async (directory) => {
    const inputPath = path.join(directory, 'input.sb3');
    const outputDirectory = path.join(directory, 'app');
    const extensionSource = 'Scratch.extensions.register(new Example());\n';
    const project = {
      targets: [],
      extensionURLs: {
        custom: `data:text/javascript;charset=utf-8;base64,${Buffer.from(extensionSource).toString('base64')}`,
        external: 'https://extensions.turbowarp.org/Lily/AllMenus.js',
      },
      meta: {semver: '3.0.0'},
    };
    const asset = new Uint8Array([0, 1, 2, 254, 255]);
    await writeSb3(inputPath, {
      'project.json': strToU8(JSON.stringify(project)),
      'asset.svg': asset,
    });

    const result = await importSb3({inputPath, outputDirectory});

    assert.deepEqual(result, {
      archiveEntryCount: 2,
      assetCount: 1,
      embeddedExtensionCount: 1,
      inputPath,
      outputDirectory,
    });
    const importedProjectText = await readFile(
      path.join(outputDirectory, 'project.source.json'),
      'utf8',
    );
    const importedProject = JSON.parse(importedProjectText);
    assert.equal(importedProjectText.endsWith('\n'), true);
    assert.equal(
      importedProject.extensionURLs.custom,
      'embedded-extension:extensions/custom.js',
    );
    assert.equal(importedProject.extensionURLs.external, project.extensionURLs.external);
    assert.equal(
      await readFile(path.join(outputDirectory, 'extensions/custom.js'), 'utf8'),
      extensionSource,
    );
    assert.deepEqual(
      await readFile(path.join(outputDirectory, 'assets/asset.svg')),
      Buffer.from(asset),
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDirectory, 'embedded-extensions.json'), 'utf8')),
      {
        formatVersion: 1,
        extensions: [{
          id: 'custom',
          path: 'extensions/custom.js',
          mediaType: 'text/javascript',
          parameters: ['charset=utf-8'],
          encoding: 'base64',
        }],
      },
    );
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDirectory, 'sb3-source.json'), 'utf8')),
      {
        formatVersion: 1,
        project: 'project.source.json',
        embeddedExtensions: 'embedded-extensions.json',
        assetsDirectory: 'assets',
        archiveEntries: ['project.json', 'asset.svg'],
      },
    );
  });
});

test('replaces an existing output only after a successful import', async () => {
  await withTemporaryDirectory(async (directory) => {
    const inputPath = path.join(directory, 'input.sb3');
    const outputDirectory = path.join(directory, 'app');
    await mkdir(outputDirectory);
    await writeFile(path.join(outputDirectory, 'stale.txt'), 'stale');
    await writeSb3(inputPath, {
      'project.json': strToU8(JSON.stringify({targets: [], extensionURLs: {}})),
    });

    await importSb3({inputPath, outputDirectory});

    await assert.rejects(readFile(path.join(outputDirectory, 'stale.txt')), {code: 'ENOENT'});
    assert.deepEqual(
      JSON.parse(await readFile(path.join(outputDirectory, 'project.source.json'), 'utf8')),
      {targets: [], extensionURLs: {}},
    );
  });
});

test('rejects unsafe archive paths and preserves the existing output', async () => {
  await withTemporaryDirectory(async (directory) => {
    const inputPath = path.join(directory, 'unsafe.sb3');
    const outputDirectory = path.join(directory, 'app');
    await mkdir(outputDirectory);
    await writeFile(path.join(outputDirectory, 'marker.txt'), 'preserved');
    await writeSb3(inputPath, {
      'project.json': strToU8('{}'),
      '../escape.txt': strToU8('unsafe'),
    });

    await assert.rejects(
      importSb3({inputPath, outputDirectory}),
      /unsafe path segment/u,
    );
    assert.equal(await readFile(path.join(outputDirectory, 'marker.txt'), 'utf8'), 'preserved');
    await assert.rejects(readFile(path.join(directory, 'escape.txt')), {code: 'ENOENT'});
  });
});

test('validates archive names, extension data URLs, and CLI arguments', () => {
  assert.equal(validateArchiveEntryName('nested/asset.svg'), 'nested/asset.svg');
  for (const unsafeName of ['', '/absolute', 'C:/absolute', './asset', 'a/../asset', 'a\\asset']) {
    assert.throws(() => validateArchiveEntryName(unsafeName));
  }

  assert.equal(
    decodeExtensionDataUrl('data:text/javascript;base64,YQ').source.toString(),
    'a',
  );
  assert.equal(
    decodeExtensionDataUrl('data:text/javascript,let%20answer%20%3D%2042%3B').source.toString(),
    'let answer = 42;',
  );
  assert.throws(
    () => decodeExtensionDataUrl('data:text/javascript;base64,a'),
    /invalid base64/u,
  );
  assert.throws(
    () => decodeExtensionDataUrl('data:text/javascript,%XY'),
    /invalid percent encoding/u,
  );

  assert.deepEqual(parseCliArguments(['--', '--help']), {help: true});
  assert.throws(() => parseCliArguments(['--output']), /requires a directory/u);
  assert.throws(() => parseCliArguments(['one.sb3', 'two.sb3']), /Only one input/u);
});

test('rejects an embedded extension ID that cannot become a safe filename', async () => {
  await withTemporaryDirectory(async (directory) => {
    const inputPath = path.join(directory, 'unsafe-extension.sb3');
    await writeSb3(inputPath, {
      'project.json': strToU8(JSON.stringify({
        targets: [],
        extensionURLs: {'../escape': 'data:text/javascript;base64,YQ=='},
      })),
    });

    await assert.rejects(
      importSb3({inputPath, outputDirectory: path.join(directory, 'app')}),
      /cannot be used as a filename/u,
    );
  });
});
