import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {validateSb3Source} from './source.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const defaultSourceDirectory = path.join(projectRoot, 'app');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function usage() {
  return `Usage: pnpm sb3:check -- [--source directory]\n\nDefault source: ${defaultSourceDirectory}`;
}

export function parseCheckArguments(arguments_) {
  let sourceDirectory = defaultSourceDirectory;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--') {
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      return {help: true};
    }
    if (argument === '--source') {
      const value = arguments_[index + 1];
      assert(value && !value.startsWith('-'), '--source requires a directory.');
      sourceDirectory = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  return {help: false, sourceDirectory};
}

async function main() {
  const options = parseCheckArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const result = await validateSb3Source(options.sourceDirectory);
  console.log(
    `Valid SB3 source: ${result.resolvedSourceDirectory} `
    + `(${result.sourceManifest.archiveEntries.length} entries, ${result.assetContents.size} assets, `
    + `${result.assetReferenceCount} references, ${result.extensions.length} embedded extensions).`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
