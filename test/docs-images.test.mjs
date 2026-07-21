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

test('preserves every image placement size from the source document', () => {
  assert.equal(placements.length, 73);
  assert.doesNotMatch(body, /!\[\]\[image\d+\](?!\{style="width: [0-9.]+px;"\})/u);

  for (const [, reference, width] of placements) {
    assert(definitions.has(reference), `Missing definition for ${reference}`);
    assert(Number(width) > 0, `Invalid width for ${reference}`);
  }
});

test('keeps occurrence-specific sizes for reused images', () => {
  const image13Widths = placements
    .filter(([, reference]) => definitions.get(reference) === 'image13.png')
    .map(([, , width]) => width);

  assert.deepEqual(image13Widths, ['264.60', '135.59', '29.60', '36.80']);
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
