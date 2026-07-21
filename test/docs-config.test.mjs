import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {
  documentConfig,
  resolveLearnedThroughGrade,
} from '../docs/config.mjs';

test('uses the configured grade when no environment override is present', () => {
  const originalGrade = process.env.RUBYGANA_GRADE;
  delete process.env.RUBYGANA_GRADE;
  try {
    assert.equal(resolveLearnedThroughGrade(), documentConfig.learnedThroughGrade);
  } finally {
    if (originalGrade === undefined) {
      delete process.env.RUBYGANA_GRADE;
    } else {
      process.env.RUBYGANA_GRADE = originalGrade;
    }
  }
});

test('accepts every elementary school grade', () => {
  for (let grade = 1; grade <= 6; grade += 1) {
    assert.equal(resolveLearnedThroughGrade(String(grade)), grade);
  }
});

test('rejects values outside elementary school grades', () => {
  for (const value of ['0', '7', '2.5', 'three']) {
    assert.throws(() => resolveLearnedThroughGrade(value), RangeError);
  }
});

test('scopes the Hiroya name reading to the full name', () => {
  assert(documentConfig.rubyOverrides.includes('久保裕也:裕也:ひろや'));
  assert(!documentConfig.rubyOverrides.includes('裕也:ひろや'));
});

test('delegates the documentation table of contents to Vivliostyle', () => {
  const source = readFileSync(
    new URL(`../docs/${documentConfig.sourceFilename}`, import.meta.url),
    'utf8',
  );

  assert.equal(documentConfig.tocSectionDepth, 4);
  assert.doesNotMatch(source, /^## 目次\s*$/mu);
  assert.doesNotMatch(source, /^#{1,6}\s+!\[/mu);
  assert.match(source, /^## A\. 付録1:/mu);
  assert.match(source, /^## B\. 付録2:/mu);
  assert.match(source, /^## C\. 付録3:/mu);
});
