import assert from 'node:assert/strict';
import test from 'node:test';

import {documentConfig, resolveLearnedThroughGrade} from '../docs/config.mjs';

test('uses the configured grade when no environment override is present', () => {
  assert.equal(resolveLearnedThroughGrade(undefined), documentConfig.learnedThroughGrade);
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
