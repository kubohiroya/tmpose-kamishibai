import {cp, rm} from 'node:fs/promises';

import {buildDocs, buildTextbook} from './build-docs.mjs';
import {verifyBuild} from './verify-build.mjs';

const source = new URL('../site/', import.meta.url);
const output = new URL('../dist/', import.meta.url);

await rm(output, {recursive: true, force: true});
await cp(source, output, {recursive: true});
await buildDocs();
await buildTextbook();
await verifyBuild();
console.log('Built GitHub Pages content in dist/');
