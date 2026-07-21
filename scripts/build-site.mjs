import {cp, rm} from 'node:fs/promises';

import {buildDocs} from './build-docs.mjs';

const source = new URL('../site/', import.meta.url);
const output = new URL('../dist/', import.meta.url);

await rm(output, {recursive: true, force: true});
await cp(source, output, {recursive: true});
await buildDocs();
await import('./verify-build.mjs');
console.log('Built GitHub Pages content in dist/');
