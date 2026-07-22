import {copyFile, cp, mkdir, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

import {buildDocs} from './build-docs.mjs';
import {buildSamples} from './build-samples.mjs';
import {buildSb3} from './sb3/build.mjs';
import {verifyBuild} from './verify-build.mjs';

const source = new URL('../site/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
const heroImageSource = new URL('../docs/images/image49.png', import.meta.url);
const heroImageDirectory = new URL('../dist/images/', import.meta.url);
const downloadSb3 = new URL('../dist/downloads/kamishibai.sb3', import.meta.url);

await rm(output, {recursive: true, force: true});
await cp(source, output, {recursive: true});
const sb3Build = await buildSb3({outputPath: fileURLToPath(downloadSb3)});
console.log(`Built downloadable SB3: ${sb3Build.outputPath}`);
await mkdir(heroImageDirectory, {recursive: true});
await copyFile(heroImageSource, new URL('image49.png', heroImageDirectory));
await buildSamples();
await buildDocs();
await verifyBuild();
console.log('Built GitHub Pages content in dist/');
