import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {createInterface} from 'node:readline/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';

import {strFromU8, unzipSync} from 'fflate';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const defaultInputPath = path.join(projectRoot, 'kamishibai.sb3');
const defaultOutputDirectory = path.join(projectRoot, 'app');
const sourceFormatVersion = 1;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function isSamePathOrAncestor(candidatePath, targetPath) {
  const relativePath = path.relative(candidatePath, targetPath);
  return relativePath === '' || (
    relativePath !== '..'
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath)
  );
}

export function validateOutputDirectoryPath(outputDirectory, protectedRoot = projectRoot) {
  const resolvedOutputDirectory = path.resolve(outputDirectory);
  const resolvedProtectedRoot = path.resolve(protectedRoot);
  assert(resolvedOutputDirectory !== path.parse(resolvedOutputDirectory).root,
    'Refusing to replace a filesystem root with imported SB3 sources.');
  assert(!isSamePathOrAncestor(resolvedOutputDirectory, resolvedProtectedRoot),
    'Refusing to replace the repository root or one of its ancestors.');
  assert(!resolvedOutputDirectory.split(path.sep).includes('.git'),
    'Refusing to write imported SB3 sources into a .git directory.');
  return resolvedOutputDirectory;
}

async function assertRecognizedOutputDirectory(outputDirectory) {
  const stats = await lstat(outputDirectory);
  assert(stats.isDirectory() && !stats.isSymbolicLink(),
    `Refusing to replace a non-directory or symbolic link: ${outputDirectory}`);

  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(outputDirectory, 'sb3-source.json'), 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT' && !(error instanceof SyntaxError)) {
      throw error;
    }
    throw new Error(
      `Refusing to replace an unrecognized directory without a valid sb3-source.json: ${outputDirectory}`,
      {cause: error},
    );
  }

  assert(
    manifest?.formatVersion === sourceFormatVersion
      && manifest.project === 'project.source.json'
      && manifest.embeddedExtensions === 'embedded-extensions.json'
      && manifest.assetsDirectory === 'assets'
      && Array.isArray(manifest.archiveEntries),
    `Refusing to replace an unrecognized directory without a valid sb3-source.json: ${outputDirectory}`,
  );
}

async function authorizeOutputReplacement({outputDirectory, force, confirmReplace}) {
  if (!await pathExists(outputDirectory)) {
    return;
  }

  await assertRecognizedOutputDirectory(outputDirectory);
  if (force) {
    return;
  }
  assert(typeof confirmReplace === 'function',
    `Output directory already exists: ${outputDirectory}. `
    + 'Refusing to replace it without interactive confirmation or --force.');
  assert(await confirmReplace(outputDirectory),
    'SB3 import cancelled; the existing output was not changed.');
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

async function replaceDirectoryAtomically(temporaryDirectory, outputDirectory) {
  const parentDirectory = path.dirname(outputDirectory);
  const backupDirectory = path.join(
    parentDirectory,
    `.${path.basename(outputDirectory)}.backup-${process.pid}-${Date.now()}`,
  );
  const outputExists = await pathExists(outputDirectory);

  if (outputExists) {
    await rename(outputDirectory, backupDirectory);
  }

  try {
    await rename(temporaryDirectory, outputDirectory);
  } catch (error) {
    if (outputExists) {
      await rename(backupDirectory, outputDirectory);
    }
    throw error;
  }

  if (outputExists) {
    await rm(backupDirectory, {recursive: true});
  }
}

export async function importSb3({
  inputPath = defaultInputPath,
  outputDirectory = defaultOutputDirectory,
  force = false,
  confirmReplace,
} = {}) {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputDirectory = validateOutputDirectoryPath(outputDirectory);

  const archive = unzipSync(new Uint8Array(await readFile(resolvedInputPath)));
  const archiveEntries = Object.entries(archive);
  assert(archiveEntries.length > 0, 'SB3 archive is empty.');
  for (const [entryName] of archiveEntries) {
    validateArchiveEntryName(entryName);
  }

  const projectEntry = archive['project.json'];
  assert(projectEntry, 'SB3 archive does not contain project.json.');

  let project;
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

    await authorizeOutputReplacement({
      outputDirectory: resolvedOutputDirectory,
      force,
      confirmReplace,
    });
    await replaceDirectoryAtomically(temporaryDirectory, resolvedOutputDirectory);
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
    inputPath: resolvedInputPath,
    outputDirectory: resolvedOutputDirectory,
  };
}

function usage() {
  return `Usage: pnpm sb3:import -- [input.sb3] [--output directory] [--force]\n\nDefaults:\n  input:  ${defaultInputPath}\n  output: ${defaultOutputDirectory}\n\nExisting recognized output requires interactive confirmation.\nUse --force (or --yes) only for intentional non-interactive replacement.`;
}

export function parseCliArguments(arguments_) {
  let inputPath = defaultInputPath;
  let outputDirectory = defaultOutputDirectory;
  let force = false;
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
    if (argument === '--force' || argument === '--yes') {
      force = true;
      continue;
    }
    assert(!argument.startsWith('-'), `Unknown option: ${argument}`);
    assert(!positionalInputSeen, 'Only one input SB3 may be specified.');
    inputPath = path.resolve(argument);
    positionalInputSeen = true;
  }

  return {help: false, inputPath, outputDirectory, force};
}

async function confirmOutputReplacement(outputDirectory) {
  assert(process.stdin.isTTY && process.stdout.isTTY,
    `Output directory already exists: ${outputDirectory}. `
    + 'Non-interactive replacement requires --force.');
  const readline = createInterface({input: process.stdin, output: process.stdout});
  try {
    const answer = await readline.question(
      `Existing SB3 source directory will be replaced and stale files removed:\n  ${outputDirectory}\nContinue? [y/N] `,
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
  console.log(
    `Imported ${result.archiveEntryCount} SB3 entries into ${result.outputDirectory} `
    + `(${result.assetCount} assets, ${result.embeddedExtensionCount} embedded extensions).`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
