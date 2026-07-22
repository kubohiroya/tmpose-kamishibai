import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {createInterface} from 'node:readline/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {strFromU8, unzipSync} from 'fflate';

import {
  assertNoInterruptedRollback,
  assertRecognizedOutputDirectory,
  compareDirectories,
  inspectGitOutputState,
  pathExists,
  replaceDirectoryTransactionally,
  validateOutputDirectoryPath,
} from './output-safety.mjs';

export {validateOutputDirectoryPath} from './output-safety.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const defaultInputPath = path.join(projectRoot, 'kamishibai.sb3');
const defaultOutputDirectory = path.join(projectRoot, 'app');
const sourceFormatVersion = 1;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function summarizeGitChanges(gitState) {
  const entries = [
    ...gitState.statusEntries,
    ...gitState.untrackedContent.map((entry) => `not tracked: ${entry}`),
  ];
  const visibleEntries = entries.slice(0, 8).join(', ');
  const remainder = entries.length > 8 ? `, and ${entries.length - 8} more` : '';
  return `${visibleEntries}${remainder}`;
}

async function authorizeOutputReplacement({
  candidateDirectory,
  confirmReplace,
  discardLocalChanges,
  outputDirectory,
  yes,
}) {
  await assertNoInterruptedRollback(outputDirectory);
  if (!await pathExists(outputDirectory)) {
    return {action: 'create', comparison: null, gitState: null};
  }

  await assertRecognizedOutputDirectory(outputDirectory, sourceFormatVersion);
  const comparison = await compareDirectories(outputDirectory, candidateDirectory);
  if (comparison.identical) {
    return {action: 'unchanged', comparison, gitState: null};
  }

  const gitState = await inspectGitOutputState(
    outputDirectory,
    comparison.existingFilePaths,
  );
  assert(gitState.managed,
    `Existing output differs from the SB3 candidate but is not tracked by Git: ${outputDirectory}. `
    + 'Import to a new output directory instead of replacing unrecoverable content.');
  assert(gitState.clean || discardLocalChanges,
    `Existing output differs from the SB3 candidate and has uncommitted Git changes: `
    + `${summarizeGitChanges(gitState)}. Commit or stash them first, or explicitly use `
    + '--discard-local-changes.');

  const context = {
    comparison,
    discardLocalChanges,
    gitState,
    outputDirectory,
  };
  if (yes) {
    return {action: 'replace', ...context};
  }
  assert(typeof confirmReplace === 'function',
    `Output directory already exists: ${outputDirectory}. `
    + 'Refusing to replace differing content without interactive confirmation or --yes.');
  assert(await confirmReplace(context),
    'SB3 import cancelled; the existing output was not changed.');
  return {action: 'replace', ...context};
}

async function revalidateOutputReplacement({
  candidateDirectory,
  decision,
  discardLocalChanges,
  outputDirectory,
}) {
  const latestComparison = await compareDirectories(outputDirectory, candidateDirectory);
  assert(
    latestComparison.existingFingerprint === decision.comparison.existingFingerprint
      && latestComparison.candidateFingerprint === decision.comparison.candidateFingerprint,
    'Output or candidate content changed during SB3 import; refusing to replace it.',
  );
  const latestGitState = await inspectGitOutputState(
    outputDirectory,
    latestComparison.existingFilePaths,
  );
  assert(latestGitState.managed,
    'Output stopped being Git-managed during SB3 import; refusing to replace it.');
  assert(latestGitState.fingerprint === decision.gitState.fingerprint,
    'Git state changed during SB3 import; refusing to replace the output.');
  assert(latestGitState.clean || discardLocalChanges,
    'Output gained uncommitted Git changes during SB3 import; refusing to replace it.');
}

export function validateArchiveEntryName(entryName) {
  assert(typeof entryName === 'string' && entryName.length > 0,
    'SB3 archive contains an empty entry name.');
  assert(!entryName.includes('\0'),
    `SB3 archive entry contains a NUL byte: ${JSON.stringify(entryName)}`);
  assert(!entryName.includes('\\'),
    `SB3 archive entry uses a backslash: ${JSON.stringify(entryName)}`);
  assert(!path.posix.isAbsolute(entryName) && !/^[A-Za-z]:/u.test(entryName),
    `SB3 archive entry is absolute: ${JSON.stringify(entryName)}`);

  const segments = entryName.replace(/\/$/u, '').split('/');
  assert(segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..'),
    `SB3 archive entry contains an unsafe path segment: ${JSON.stringify(entryName)}`);
  return entryName;
}

function extensionSourcePath(extensionId) {
  assert(/^[A-Za-z0-9._-]+$/u.test(extensionId),
    `Embedded extension ID cannot be used as a filename: ${JSON.stringify(extensionId)}`);
  return `extensions/${extensionId}.js`;
}

export function decodeExtensionDataUrl(dataUrl) {
  assert(typeof dataUrl === 'string' && dataUrl.startsWith('data:'),
    'Embedded extension URL must be a data URL.');
  const commaIndex = dataUrl.indexOf(',');
  assert(commaIndex >= 0, 'Embedded extension data URL has no payload separator.');

  const metadata = dataUrl.slice('data:'.length, commaIndex).split(';');
  const mediaType = metadata.shift() || 'text/plain';
  const base64Index = metadata.indexOf('base64');
  const encoding = base64Index >= 0 ? 'base64' : 'percent';
  if (base64Index >= 0) {
    metadata.splice(base64Index, 1);
  }

  const payload = dataUrl.slice(commaIndex + 1);
  let source;
  if (encoding === 'base64') {
    assert(/^[A-Za-z0-9+/]*={0,2}$/u.test(payload),
      'Embedded extension data URL contains invalid base64.');
    const unpaddedPayload = payload.replace(/=+$/u, '');
    assert(unpaddedPayload.length % 4 !== 1,
      'Embedded extension data URL contains invalid base64.');
    source = Buffer.from(unpaddedPayload.padEnd(
      Math.ceil(unpaddedPayload.length / 4) * 4,
      '=',
    ), 'base64');
  } else {
    try {
      source = Buffer.from(decodeURIComponent(payload), 'utf8');
    } catch {
      throw new Error('Embedded extension data URL contains invalid percent encoding.');
    }
  }

  return {
    encoding,
    mediaType,
    parameters: metadata,
    source,
  };
}

export async function importSb3({
  inputPath = defaultInputPath,
  outputDirectory = defaultOutputDirectory,
  discardLocalChanges = false,
  yes = false,
  confirmReplace,
} = {}) {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputDirectory = validateOutputDirectoryPath(outputDirectory, projectRoot);

  const archive = unzipSync(new Uint8Array(await readFile(resolvedInputPath)));
  const archiveEntries = Object.entries(archive);
  assert(archiveEntries.length > 0, 'SB3 archive is empty.');
  for (const [entryName] of archiveEntries) {
    validateArchiveEntryName(entryName);
  }

  const projectEntry = archive['project.json'];
  assert(projectEntry, 'SB3 archive does not contain project.json.');

  let project;
  let decision;
  let rollbackCleanupWarning = null;
  try {
    project = JSON.parse(strFromU8(projectEntry));
  } catch (error) {
    throw new Error(`SB3 project.json is invalid JSON: ${error.message}`, {cause: error});
  }
  assert(project && typeof project === 'object' && !Array.isArray(project),
    'SB3 project.json must contain a JSON object.');

  const extensionUrls = project.extensionURLs ?? {};
  assert(extensionUrls && typeof extensionUrls === 'object' && !Array.isArray(extensionUrls),
    'SB3 project.json extensionURLs must be an object when present.');

  const embeddedExtensions = [];
  const decodedExtensionSources = [];
  for (const [extensionId, extensionUrl] of Object.entries(extensionUrls)) {
    if (typeof extensionUrl !== 'string' || !extensionUrl.startsWith('data:')) {
      continue;
    }
    const sourcePath = extensionSourcePath(extensionId);
    const decoded = decodeExtensionDataUrl(extensionUrl);
    extensionUrls[extensionId] = `embedded-extension:${sourcePath}`;
    embeddedExtensions.push({
      id: extensionId,
      path: sourcePath,
      mediaType: decoded.mediaType,
      parameters: decoded.parameters,
      encoding: decoded.encoding,
    });
    decodedExtensionSources.push({path: sourcePath, source: decoded.source});
  }

  const outputParent = path.dirname(resolvedOutputDirectory);
  await mkdir(outputParent, {recursive: true});
  const temporaryDirectory = await mkdtemp(path.join(
    outputParent,
    `.${path.basename(resolvedOutputDirectory)}.import-`,
  ));

  try {
    const assetsDirectory = path.join(temporaryDirectory, 'assets');
    await mkdir(assetsDirectory, {recursive: true});
    await mkdir(path.join(temporaryDirectory, 'extensions'), {recursive: true});

    for (const [entryName, contents] of archiveEntries) {
      if (entryName === 'project.json' || entryName.endsWith('/')) {
        continue;
      }
      const assetPath = path.resolve(assetsDirectory, entryName);
      assert(assetPath.startsWith(`${assetsDirectory}${path.sep}`),
        `SB3 archive entry escapes the assets directory: ${JSON.stringify(entryName)}`);
      await mkdir(path.dirname(assetPath), {recursive: true});
      await writeFile(assetPath, contents);
    }

    for (const extension of decodedExtensionSources) {
      await writeFile(path.join(temporaryDirectory, extension.path), extension.source);
    }

    const sourceManifest = {
      formatVersion: sourceFormatVersion,
      project: 'project.source.json',
      embeddedExtensions: 'embedded-extensions.json',
      assetsDirectory: 'assets',
      archiveEntries: archiveEntries.map(([entryName]) => entryName),
    };
    await Promise.all([
      writeFile(
        path.join(temporaryDirectory, 'project.source.json'),
        `${JSON.stringify(project, null, 2)}\n`,
      ),
      writeFile(
        path.join(temporaryDirectory, 'embedded-extensions.json'),
        `${JSON.stringify({formatVersion: sourceFormatVersion, extensions: embeddedExtensions}, null, 2)}\n`,
      ),
      writeFile(
        path.join(temporaryDirectory, 'sb3-source.json'),
        `${JSON.stringify(sourceManifest, null, 2)}\n`,
      ),
    ]);

    decision = await authorizeOutputReplacement({
      candidateDirectory: temporaryDirectory,
      confirmReplace,
      discardLocalChanges,
      outputDirectory: resolvedOutputDirectory,
      yes,
    });
    if (decision.action === 'unchanged') {
      await rm(temporaryDirectory, {recursive: true, force: true});
    } else {
      if (decision.action === 'replace') {
        await revalidateOutputReplacement({
          candidateDirectory: temporaryDirectory,
          decision,
          discardLocalChanges,
          outputDirectory: resolvedOutputDirectory,
        });
      }
      ({rollbackCleanupWarning} = await replaceDirectoryTransactionally(
        temporaryDirectory,
        resolvedOutputDirectory,
      ));
    }
  } catch (error) {
    await rm(temporaryDirectory, {recursive: true, force: true});
    throw error;
  }

  return {
    archiveEntryCount: archiveEntries.length,
    assetCount: archiveEntries.filter(([entryName]) => (
      entryName !== 'project.json' && !entryName.endsWith('/')
    )).length,
    embeddedExtensionCount: embeddedExtensions.length,
    changed: decision.action !== 'unchanged',
    differenceCounts: decision.comparison ? {
      added: decision.comparison.differences.added.length,
      modified: decision.comparison.differences.modified.length,
      removed: decision.comparison.differences.removed.length,
    } : null,
    inputPath: resolvedInputPath,
    outputDirectory: resolvedOutputDirectory,
    rollbackCleanupWarning,
  };
}

function usage() {
  return `Usage: pnpm sb3:import -- [input.sb3] [--output directory] [--yes] [--discard-local-changes]\n\nDefaults:\n  input:  ${defaultInputPath}\n  output: ${defaultOutputDirectory}\n\nIdentical output is left unchanged. Differing, Git-clean output requires confirmation.\nUse --yes to skip that confirmation. Uncommitted output changes are rejected unless\n--discard-local-changes is explicitly supplied.`;
}

export function parseCliArguments(arguments_) {
  let inputPath = defaultInputPath;
  let outputDirectory = defaultOutputDirectory;
  let discardLocalChanges = false;
  let yes = false;
  let positionalInputSeen = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--') {
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      return {help: true};
    }
    if (argument === '--output') {
      const value = arguments_[index + 1];
      assert(value && !value.startsWith('-'), '--output requires a directory.');
      outputDirectory = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === '--yes') {
      yes = true;
      continue;
    }
    if (argument === '--discard-local-changes') {
      discardLocalChanges = true;
      continue;
    }
    assert(argument !== '--force',
      '--force is intentionally unsupported. Use --yes and, only when necessary, '
      + '--discard-local-changes.');
    assert(!argument.startsWith('-'), `Unknown option: ${argument}`);
    assert(!positionalInputSeen, 'Only one input SB3 may be specified.');
    inputPath = path.resolve(argument);
    positionalInputSeen = true;
  }

  return {discardLocalChanges, help: false, inputPath, outputDirectory, yes};
}

function formatDifferenceLines(differences) {
  const labels = {added: '+', modified: '~', removed: '-'};
  const lines = Object.entries(differences).flatMap(([kind, paths]) => (
    paths.map((relativePath) => `${labels[kind]} ${relativePath}`)
  ));
  const visibleLines = lines.slice(0, 12);
  if (lines.length > visibleLines.length) {
    visibleLines.push(`... and ${lines.length - visibleLines.length} more`);
  }
  return visibleLines.join('\n');
}

async function confirmOutputReplacement(context) {
  const {comparison, discardLocalChanges, gitState, outputDirectory} = context;
  assert(process.stdin.isTTY && process.stdout.isTTY,
    `Output directory already exists: ${outputDirectory}. `
    + 'Non-interactive replacement requires --yes.');
  const readline = createInterface({input: process.stdin, output: process.stdout});
  try {
    const gitMessage = gitState.clean
      ? 'Git state: clean'
      : `Git state: uncommitted changes will be discarded (${summarizeGitChanges(gitState)})`;
    const answer = await readline.question(
      `Existing SB3 source differs from the import candidate:\n`
      + `  ${outputDirectory}\n`
      + `${formatDifferenceLines(comparison.differences)}\n`
      + `${gitMessage}\n`
      + `${discardLocalChanges ? 'WARNING: --discard-local-changes is active.\n' : ''}`
      + 'Replace the existing source directory? [y/N] ',
    );
    return /^(?:y|yes)$/iu.test(answer.trim());
  } finally {
    readline.close();
  }
}

async function main() {
  const options = parseCliArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const result = await importSb3({...options, confirmReplace: confirmOutputReplacement});
  if (result.changed) {
    const differenceMessage = result.differenceCounts
      ? ` Changes: +${result.differenceCounts.added} `
        + `~${result.differenceCounts.modified} -${result.differenceCounts.removed}.`
      : '';
    console.log(
      `Imported ${result.archiveEntryCount} SB3 entries into ${result.outputDirectory} `
      + `(${result.assetCount} assets, ${result.embeddedExtensionCount} embedded extensions).`
      + differenceMessage,
    );
  } else {
    console.log(`Already up to date; no files changed: ${result.outputDirectory}`);
  }
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
