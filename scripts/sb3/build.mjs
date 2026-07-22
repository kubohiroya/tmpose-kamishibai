import {randomUUID} from 'node:crypto';
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {createInterface} from 'node:readline/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {pathExists} from './output-safety.mjs';
import {createDeterministicSb3} from './source.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const defaultSourceDirectory = path.join(projectRoot, 'app');
const defaultOutputPath = path.join(projectRoot, 'tmp', 'kamishibai.sb3');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertNoInterruptedRollback(outputPath) {
  const parentDirectory = path.dirname(outputPath);
  if (!await pathExists(parentDirectory)) {
    return;
  }
  const rollbackPrefix = `.${path.basename(outputPath)}.rollback-`;
  const leftovers = (await readdir(parentDirectory))
    .filter((entryName) => entryName.startsWith(rollbackPrefix))
    .map((entryName) => path.join(parentDirectory, entryName));
  assert(leftovers.length === 0,
    `Found an interrupted SB3 build rollback file. Inspect or restore it before retrying: `
    + leftovers.join(', '));
}

async function inspectOutput(outputPath) {
  if (!await pathExists(outputPath)) {
    return {contents: null, exists: false};
  }
  const stats = await lstat(outputPath);
  assert(stats.isFile() && !stats.isSymbolicLink(),
    `Refusing to replace a non-file or symbolic link: ${outputPath}`);
  return {contents: await readFile(outputPath), exists: true};
}

async function assertOutputUnchanged(outputPath, expectedOutput) {
  const currentOutput = await inspectOutput(outputPath);
  assert(currentOutput.exists === expectedOutput.exists
    && (!currentOutput.exists
      || Buffer.compare(currentOutput.contents, expectedOutput.contents) === 0),
    `SB3 output changed while the build was running; refusing to replace it: ${outputPath}`);
}

async function installArchiveTransactionally(archive, outputPath, expectedOutput) {
  const parentDirectory = path.dirname(outputPath);
  await assertNoInterruptedRollback(outputPath);
  const temporaryDirectory = await mkdtemp(path.join(
    parentDirectory,
    `.${path.basename(outputPath)}.build-`,
  ));
  const temporaryPath = path.join(temporaryDirectory, path.basename(outputPath));
  const rollbackPath = path.join(
    parentDirectory,
    `.${path.basename(outputPath)}.rollback-${randomUUID()}`,
  );
  await writeFile(temporaryPath, archive);

  try {
    await assertOutputUnchanged(outputPath, expectedOutput);
    if (expectedOutput.exists) {
      await rename(outputPath, rollbackPath);
    }
    try {
      await rename(temporaryPath, outputPath);
    } catch (installError) {
      if (expectedOutput.exists) {
        try {
          await rename(rollbackPath, outputPath);
        } catch (restoreError) {
          throw new AggregateError(
            [installError, restoreError],
            `SB3 build failed and automatic restoration also failed. `
            + `Original output remains at: ${rollbackPath}`,
          );
        }
      }
      throw installError;
    }
  } finally {
    await rm(temporaryDirectory, {recursive: true, force: true});
  }

  if (!expectedOutput.exists) {
    return null;
  }
  try {
    await rm(rollbackPath);
    return null;
  } catch (error) {
    return `Built SB3 was installed, but its temporary rollback file could not be removed: `
      + `${rollbackPath} (${error.message})`;
  }
}

export async function buildSb3({
  confirmReplace,
  outputPath = defaultOutputPath,
  sourceDirectory = defaultSourceDirectory,
  yes = false,
} = {}) {
  const resolvedOutputPath = path.resolve(outputPath);
  assert(path.extname(resolvedOutputPath).toLowerCase() === '.sb3',
    `SB3 output path must use the .sb3 extension: ${resolvedOutputPath}`);
  await assertNoInterruptedRollback(resolvedOutputPath);
  const built = await createDeterministicSb3(sourceDirectory);
  const existingOutput = await inspectOutput(resolvedOutputPath);
  if (existingOutput.exists) {
    if (Buffer.compare(existingOutput.contents, Buffer.from(built.archive)) === 0) {
      return {
        ...built,
        changed: false,
        outputPath: resolvedOutputPath,
        rollbackCleanupWarning: null,
      };
    }
    if (!yes) {
      assert(typeof confirmReplace === 'function',
        `Existing SB3 output differs: ${resolvedOutputPath}. `
        + 'Non-interactive replacement requires --yes.');
      assert(await confirmReplace(resolvedOutputPath),
        'SB3 build cancelled; the existing output was not changed.');
    }
  }

  await mkdir(path.dirname(resolvedOutputPath), {recursive: true});
  const rollbackCleanupWarning = await installArchiveTransactionally(
    built.archive,
    resolvedOutputPath,
    existingOutput,
  );
  return {
    ...built,
    changed: true,
    outputPath: resolvedOutputPath,
    rollbackCleanupWarning,
  };
}

function usage() {
  return `Usage: pnpm sb3:build -- [--source directory] [--yes]\n\nDefaults:\n  source: ${defaultSourceDirectory}\n  output: ${defaultOutputPath}\n\nThe output is deterministic. Identical output is left unchanged; replacing a differing\nexisting output requires confirmation or --yes.`;
}

export function parseBuildArguments(arguments_) {
  let sourceDirectory = defaultSourceDirectory;
  let yes = false;
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
    if (argument === '--yes') {
      yes = true;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  return {help: false, sourceDirectory, yes};
}

async function confirmOutputReplacement(outputPath) {
  assert(process.stdin.isTTY && process.stdout.isTTY,
    `Existing SB3 output differs: ${outputPath}. Non-interactive replacement requires --yes.`);
  const readline = createInterface({input: process.stdin, output: process.stdout});
  try {
    const answer = await readline.question(
      `Existing generated SB3 will be replaced:\n  ${outputPath}\nContinue? [y/N] `,
    );
    return /^(?:y|yes)$/iu.test(answer.trim());
  } finally {
    readline.close();
  }
}

async function main() {
  const options = parseBuildArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const result = await buildSb3({...options, confirmReplace: confirmOutputReplacement});
  const action = result.changed ? 'Built' : 'Already up to date';
  console.log(
    `${action}: ${result.outputPath} (${result.entryCount} entries, ${result.assetCount} assets, `
    + `${result.embeddedExtensionCount} embedded extensions).`,
  );
  if (result.rollbackCleanupWarning) {
    console.warn(result.rollbackCleanupWarning);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
