import path from 'node:path';

import {packageVersion} from './constants.js';
import {Sb3BuilderError} from './errors.js';
import {buildSb3Bundle} from './index.js';

export function usage() {
  return `Usage:
  tmpose-kamishibai build-sb3 --base BASE.sb3 --script SOURCE.txt \\
    --assets assets.lock.json --output dist/sample --profile editor [options]

Options:
  --allow-file-root DIR   Allow file: assets below DIR (repeatable)
  --allow-http            Permit plain HTTP assets (HTTPS is the default)
  --timeout-ms N          Per-request timeout in milliseconds
  --max-asset-bytes N     Maximum bytes per asset
  --max-script-bytes N    Maximum embedded script bytes
  --max-redirects N       Maximum HTTP redirects
  --help                  Show this help
  --version               Show the package version

The output path is a basename. The example writes dist/sample.sb3,
dist/sample.txt, and dist/sample.manifest.json as one validated transaction.`;
}

/**
 * @param {string[]} arguments_
 * @returns {{action: 'help'} | {action: 'version'} | {action: 'build', options: Parameters<typeof buildSb3Bundle>[0]}}
 */
export function parseCliArguments(arguments_) {
  if (arguments_.includes('--help') || arguments_.includes('-h')) return {action: 'help'};
  if (arguments_.includes('--version') || arguments_.includes('-v')) return {action: 'version'};
  const [command, ...rest] = arguments_;
  if (command !== 'build-sb3') {
    throw new Sb3BuilderError(`Expected the build-sb3 command, received ${command ?? '(none)'}.`, {
      stage: 'cli',
    });
  }
  const values = new Map();
  const allowedFileRoots = [];
  let allowHttp = false;
  const numericOptions = new Set([
    '--timeout-ms',
    '--max-asset-bytes',
    '--max-script-bytes',
    '--max-redirects',
  ]);
  for (let index = 0; index < rest.length; index += 1) {
    const option = rest[index];
    if (option === '--allow-http') {
      allowHttp = true;
      continue;
    }
    const value = rest[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Sb3BuilderError(`${option} requires a value.`, {stage: 'cli'});
    }
    if (option === '--allow-file-root') {
      allowedFileRoots.push(path.resolve(value));
    } else if (
      ['--base', '--script', '--assets', '--output', '--profile'].includes(option) ||
      numericOptions.has(option)
    ) {
      if (values.has(option))
        throw new Sb3BuilderError(`Duplicate option: ${option}`, {stage: 'cli'});
      values.set(option, value);
    } else {
      throw new Sb3BuilderError(`Unknown option: ${option}`, {stage: 'cli'});
    }
    index += 1;
  }
  for (const required of ['--base', '--script', '--assets', '--output', '--profile']) {
    if (!values.has(required))
      throw new Sb3BuilderError(`Missing required option: ${required}`, {stage: 'cli'});
  }
  /** @param {string} option */
  const numberValue = (option) => {
    const raw = values.get(option);
    if (raw === undefined) return undefined;
    const value = Number(raw);
    const minimum = option === '--max-redirects' ? 0 : 1;
    if (!Number.isInteger(value) || value < minimum) {
      throw new Sb3BuilderError(`${option} must be an integer >= ${minimum}.`, {stage: 'cli'});
    }
    return value;
  };
  const outputBase = path.resolve(/** @type {string} */ (values.get('--output')));
  const profile = values.get('--profile');
  if (profile !== 'editor' && profile !== 'player') {
    throw new Sb3BuilderError('--profile must be either editor or player.', {stage: 'cli'});
  }
  return {
    action: 'build',
    options: {
      baseSb3: path.resolve(/** @type {string} */ (values.get('--base'))),
      sourceScript: path.resolve(/** @type {string} */ (values.get('--script'))),
      assetManifest: path.resolve(/** @type {string} */ (values.get('--assets'))),
      outputDirectory: path.dirname(outputBase),
      outputName: path.basename(outputBase),
      profile,
      allowedFileRoots: allowedFileRoots.length > 0 ? allowedFileRoots : undefined,
      allowHttp,
      requestTimeoutMs: numberValue('--timeout-ms'),
      maxAssetBytes: numberValue('--max-asset-bytes'),
      maxEmbeddedScriptBytes: numberValue('--max-script-bytes'),
      maxRedirects: numberValue('--max-redirects'),
    },
  };
}

/**
 * @param {string[]} arguments_
 * @param {{stdout?: Pick<NodeJS.WriteStream, 'write'>}} [io]
 */
export async function runCli(arguments_, io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const parsed = parseCliArguments(arguments_);
  if (parsed.action === 'help') {
    stdout.write(`${usage()}\n`);
    return null;
  }
  if (parsed.action === 'version') {
    stdout.write(`${packageVersion}\n`);
    return null;
  }
  const result = await buildSb3Bundle(parsed.options);
  stdout.write(`Built ${result.outputPaths[`${parsed.options.outputName}.sb3`]}\n`);
  stdout.write(`Built ${result.outputPaths[`${parsed.options.outputName}.txt`]}\n`);
  stdout.write(`Built ${result.outputPaths[`${parsed.options.outputName}.manifest.json`]}\n`);
  return result;
}
