import {cp, mkdir, rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';

const source = new URL('../site/', import.meta.url);
const output = new URL('../dist/', import.meta.url);

await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});

if (!existsSync(source)) {
  throw new Error('site directory does not exist');
}

await cp(source, output, {recursive: true});
console.log('Built GitHub Pages content in dist/');
