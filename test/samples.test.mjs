import assert from 'node:assert/strict';
import test from 'node:test';

import {
  listSampleFilenames,
  renderSamplesIndex,
} from '../scripts/build-samples.mjs';

test('publishes every samples/*.txt file through the sample index', async () => {
  const sampleFilenames = await listSampleFilenames();
  const index = renderSamplesIndex(sampleFilenames);

  assert(sampleFilenames.includes('urashima.txt'));
  for (const filename of sampleFilenames) {
    assert(index.includes(`href="${encodeURIComponent(filename)}"`));
  }
});
