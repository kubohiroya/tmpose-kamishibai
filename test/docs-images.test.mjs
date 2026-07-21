import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import test from 'node:test';

import {documentConfig} from '../docs/config.mjs';

const sources = [documentConfig.coverFilename, documentConfig.sourceFilename]
  .map((filename) => readFileSync(new URL(`../docs/${filename}`, import.meta.url), 'utf8'));
const body = sources
  .map((source) => source.slice(0, source.search(/^\[image\d+\]:/mu)))
  .join('\n');
const definitions = new Map(
  [...sources.join('\n').matchAll(/^\[(image\d+)\]:\s*<images\/([^>]+)>/gmu)]
    .map(([, reference, filename]) => [reference, filename]),
);
const placements = [...body.matchAll(
  /!\[\]\[(image\d+)\]\{style="width: ([0-9.]+)px;"\}/gu,
)];
const imageReferences = [...body.matchAll(/!\[\]\[(image\d+)\]/gu)];

test('preserves every image placement size from the source document', () => {
  assert(placements.length > 0);
  assert.equal(placements.length, imageReferences.length,
    'Every image placement must have a pixel width.');

  for (const [, reference, width] of placements) {
    assert(definitions.has(reference), `Missing definition for ${reference}`);
    assert(Number(width) > 0, `Invalid width for ${reference}`);
  }
});

test('keeps occurrence-specific sizes for reused source images', () => {
  const widthsByFilename = Map.groupBy(
    placements,
    ([, reference]) => definitions.get(reference),
  );
  const reusedFilesWithDifferentWidths = [...widthsByFilename.values()]
    .filter((filePlacements) => (
      filePlacements.length > 1
        && new Set(filePlacements.map(([, , width]) => width)).size > 1
    ));

  assert(reusedFilesWithDifferentWidths.length > 0);
});

test('uses every extracted source image in the document', () => {
  const referencedFiles = new Set(
    placements.map(([, reference]) => definitions.get(reference)),
  );
  const imageDirectory = new URL('../docs/images/', import.meta.url);
  const extractedFiles = readdirSync(imageDirectory).sort();

  assert.deepEqual([...referencedFiles].sort(), extractedFiles);
  for (const filename of referencedFiles) {
    assert(existsSync(new URL(filename, imageDirectory)));
  }
});
