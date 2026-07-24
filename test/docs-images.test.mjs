import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import test from 'node:test';

import {documentConfig} from '../docs/config.mjs';

const sources = [documentConfig.coverFilename, documentConfig.sourceFilename].map((filename) =>
  readFileSync(
    new URL(`../docs/${documentConfig.sourceDirectory}/${filename}`, import.meta.url),
    'utf8',
  ),
);
const body = sources.join('\n');
const placements = [
  ...body.matchAll(
    /!\[\]\(\.\.\/\.\.\/images\/(image\d{2}\.(?:jpg|png))\)\{style="(width|height): ([0-9.]+)px;"\}/gu,
  ),
];
const imageReferences = [
  ...body.matchAll(/!\[\]\(\.\.\/\.\.\/images\/(image\d{2}\.(?:jpg|png))\)/gu),
];
const imageDirectory = new URL('../docs/images/', import.meta.url);
const extractedFiles = readdirSync(imageDirectory).sort();

test('preserves every image placement size from the source document', () => {
  assert(placements.length > 0);
  assert.equal(
    placements.length,
    imageReferences.length,
    'Every image placement must have a pixel width or height.',
  );

  for (const [, filename, dimension, size] of placements) {
    assert.match(dimension, /^(?:height|width)$/u);
    assert(Number(size) > 0, `Invalid ${dimension} for ${filename}`);
  }
});

test('keeps occurrence-specific sizes for reused source images', () => {
  const placementsByFilename = Map.groupBy(placements, ([, filename]) => filename);
  const reusedFilesWithDifferentSizes = [...placementsByFilename.values()].filter(
    (filePlacements) =>
      filePlacements.length > 1 &&
      new Set(filePlacements.map(([, , dimension, size]) => `${dimension}:${size}`)).size > 1,
  );

  assert(reusedFilesWithDifferentSizes.length > 0);
});

test('numbers source images by first appearance and keeps unused images at the tail', () => {
  const referencedFiles = [...new Set(imageReferences.map(([, filename]) => filename))];

  assert.equal(extractedFiles.length, 66);
  for (const [index, filename] of extractedFiles.entries()) {
    assert.match(
      filename,
      new RegExp(`^image${String(index + 1).padStart(2, '0')}\\.(?:jpg|png)$`, 'u'),
    );
  }

  assert.deepEqual(referencedFiles, extractedFiles.slice(0, referencedFiles.length));
  assert.deepEqual(extractedFiles.slice(referencedFiles.length), [
    'image62.png',
    'image63.png',
    'image64.png',
    'image65.png',
    'image66.png',
  ]);

  for (const filename of referencedFiles) {
    assert(existsSync(new URL(filename, imageDirectory)));
  }
});
