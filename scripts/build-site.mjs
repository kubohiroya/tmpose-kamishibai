import {cp, rm} from 'node:fs/promises';

import {buildDocs} from './build-docs.mjs';
import {buildSamples} from './build-samples.mjs';
import {verifyBuild} from './verify-build.mjs';

const source = new URL('../site/', import.meta.url);
const output = new URL('../dist/', import.meta.url);

await rm(output, {recursive: true, force: true});
await cp(source, output, {recursive: true});
await buildSamples();
await buildDocs();
await verifyBuild();
console.log('Built GitHub Pages content in dist/');
