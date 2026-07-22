import {copyFile, cp, mkdir, rm} from 'node:fs/promises';

import {buildDocs} from './build-docs.mjs';
import {buildSamples} from './build-samples.mjs';
import {verifyBuild} from './verify-build.mjs';

const source = new URL('../site/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
const heroImageSource = new URL('../docs/images/image49.png', import.meta.url);
const heroImageDirectory = new URL('../dist/images/', import.meta.url);

await rm(output, {recursive: true, force: true});
await cp(source, output, {recursive: true});
await mkdir(heroImageDirectory, {recursive: true});
await copyFile(heroImageSource, new URL('image49.png', heroImageDirectory));
await buildSamples();
await buildDocs();
await verifyBuild();
console.log('Built GitHub Pages content in dist/');
