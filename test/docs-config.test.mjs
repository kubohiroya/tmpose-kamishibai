import assert from 'node:assert/strict';
import test from 'node:test';

import {documentConfig, resolveLearnedThroughGrade} from '../docs/config.mjs';

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
