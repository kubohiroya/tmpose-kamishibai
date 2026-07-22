import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {assetManifestFormatVersion} from './constants.js';
import {Sb3BuilderError} from './errors.js';
import {stableStringify} from './hash.js';

const kinds = new Set(['backdrop', 'costume', 'stageSound', 'spriteSound']);
const imageFormats = new Map([
  ['svg', new Set(['image/svg+xml'])],
  ['png', new Set(['image/png'])],
  ['jpg', new Set(['image/jpeg'])],
  ['jpeg', new Set(['image/jpeg'])],
  ['gif', new Set(['image/gif'])],
]);
const soundFormats = new Map([
  ['wav', new Set(['audio/wav', 'audio/x-wav', 'audio/wave'])],
  ['mp3', new Set(['audio/mpeg'])],
]);

/**
 * @typedef {object} NormalizedAsset
 * @property {string} name
 * @property {string} uri
 * @property {'backdrop' | 'costume' | 'stageSound' | 'spriteSound'} kind
 * @property {string} target
 * @property {string} sb3Name
 * @property {string} contentType
 * @property {string} dataFormat
 * @property {string} sha256
 * @property {number} size
 * @property {string} license
 * @property {{bitmapResolution?: number, rotationCenterX?: number, rotationCenterY?: number, format?: string, rate?: number, sampleCount?: number}} metadata
 */

/** @param {unknown} condition @param {string} message */
function assert(condition, message) {
  if (!condition) throw new Sb3BuilderError(message, {stage: 'manifest'});
}

/** @param {unknown} value */
function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @param {string} description */
function nonEmptyString(value, description) {
  assert(
    typeof value === 'string' && value.trim().length > 0,
    `${description} must be a non-empty string.`,
  );
  return /** @type {string} */ (value);
}

/** @param {string} value @param {string} description */
function dslToken(value, description) {
  assert(
    !/[:,\r\n]/u.test(value),
    `${description} cannot contain a comma, colon, or line break: ${JSON.stringify(value)}`,
  );
  return value;
}

/** @param {unknown} value @param {string} description */
function finiteNumber(value, description) {
  assert(
    typeof value === 'number' && Number.isFinite(value),
    `${description} must be a finite number.`,
  );
  return /** @type {number} */ (value);
}

/** @param {unknown} value @param {string} description @param {number} minimum */
function integer(value, description, minimum) {
  assert(
    Number.isInteger(value) && Number(value) >= minimum,
    `${description} must be an integer >= ${minimum}.`,
  );
  return /** @type {number} */ (value);
}

/**
 * @param {unknown} rawEntry
 * @param {number} index
 * @returns {NormalizedAsset}
 */
function normalizeAsset(rawEntry, index) {
  assert(isObject(rawEntry), `assets[${index}] must be an object.`);
  const entry = /** @type {Record<string, unknown>} */ (rawEntry);
  const prefix = `assets[${index}]`;
  const name = dslToken(nonEmptyString(entry.name, `${prefix}.name`), `${prefix}.name`);
  const uri = nonEmptyString(entry.uri, `${prefix}.uri`);
  assert(/^(?:file|https?):/u.test(uri), `${prefix}.uri must use file:, http:, or https:.`);
  const rawKind = nonEmptyString(entry.kind, `${prefix}.kind`);
  assert(
    kinds.has(rawKind),
    `${prefix}.kind must be backdrop, costume, stageSound, or spriteSound.`,
  );
  const kind = /** @type {NormalizedAsset['kind']} */ (rawKind);
  const target = dslToken(nonEmptyString(entry.target, `${prefix}.target`), `${prefix}.target`);
  if (kind === 'backdrop' || kind === 'stageSound') {
    assert(target === '@stage', `${prefix}.target must be @stage for ${kind}.`);
  } else {
    assert(target !== '@stage', `${prefix}.target must name a sprite for ${kind}.`);
  }
  const sb3Name = dslToken(nonEmptyString(entry.sb3Name, `${prefix}.sb3Name`), `${prefix}.sb3Name`);
  const contentType = nonEmptyString(entry.contentType, `${prefix}.contentType`).toLowerCase();
  assert(!contentType.includes(';'), `${prefix}.contentType must not include parameters.`);
  const dataFormat = nonEmptyString(entry.dataFormat, `${prefix}.dataFormat`).toLowerCase();
  const formats = kind === 'backdrop' || kind === 'costume' ? imageFormats : soundFormats;
  assert(
    formats.has(dataFormat),
    `${prefix}.dataFormat is not supported for ${kind}: ${dataFormat}`,
  );
  assert(
    formats.get(dataFormat)?.has(contentType),
    `${prefix}.contentType ${contentType} does not match dataFormat ${dataFormat}.`,
  );
  const expectedSha256 = nonEmptyString(entry.sha256, `${prefix}.sha256`).toLowerCase();
  assert(
    /^[a-f0-9]{64}$/u.test(expectedSha256),
    `${prefix}.sha256 must be 64 lowercase hexadecimal characters.`,
  );
  const size = integer(entry.size, `${prefix}.size`, 0);
  const license = nonEmptyString(entry.license, `${prefix}.license`);
  const metadata = entry.metadata;
  assert(isObject(metadata), `${prefix}.metadata must be an object.`);

  let normalizedMetadata;
  if (kind === 'backdrop' || kind === 'costume') {
    const imageMetadata = /** @type {Record<string, unknown>} */ (metadata);
    const bitmapResolution = integer(
      imageMetadata.bitmapResolution,
      `${prefix}.metadata.bitmapResolution`,
      1,
    );
    assert(
      bitmapResolution === 1 || bitmapResolution === 2,
      `${prefix}.metadata.bitmapResolution must be 1 or 2.`,
    );
    normalizedMetadata = {
      bitmapResolution,
      rotationCenterX: finiteNumber(
        imageMetadata.rotationCenterX,
        `${prefix}.metadata.rotationCenterX`,
      ),
      rotationCenterY: finiteNumber(
        imageMetadata.rotationCenterY,
        `${prefix}.metadata.rotationCenterY`,
      ),
    };
  } else {
    const soundMetadata = /** @type {Record<string, unknown>} */ (metadata);
    normalizedMetadata = {
      format: typeof soundMetadata.format === 'string' ? soundMetadata.format : '',
      rate: integer(soundMetadata.rate, `${prefix}.metadata.rate`, 1),
      sampleCount: integer(soundMetadata.sampleCount, `${prefix}.metadata.sampleCount`, 0),
    };
  }

  return {
    name,
    uri,
    kind,
    target,
    sb3Name,
    contentType,
    dataFormat,
    sha256: expectedSha256,
    size,
    license,
    metadata: normalizedMetadata,
  };
}

/** @param {unknown} rawManifest */
export function validateAssetManifest(rawManifest) {
  assert(isObject(rawManifest), 'Asset manifest must be a JSON object.');
  const manifest = /** @type {Record<string, unknown>} */ (rawManifest);
  assert(
    manifest.formatVersion === assetManifestFormatVersion,
    `Asset manifest formatVersion must be ${assetManifestFormatVersion}.`,
  );
  assert(
    Array.isArray(manifest.assets) && manifest.assets.length > 0,
    'Asset manifest assets must be a non-empty array.',
  );
  const assets = /** @type {unknown[]} */ (manifest.assets).map(normalizeAsset);
  const names = new Set();
  const destinations = new Set();
  for (const asset of assets) {
    assert(!names.has(asset.name), `Duplicate DSL asset name: ${asset.name}`);
    names.add(asset.name);
    const collection =
      asset.kind === 'backdrop' || asset.kind === 'costume' ? 'costumes' : 'sounds';
    const destination = `${asset.target}\0${collection}\0${asset.sb3Name}`;
    assert(
      !destinations.has(destination),
      `Conflicting SB3 asset destination: ${asset.target}/${collection}/${asset.sb3Name}`,
    );
    destinations.add(destination);
  }
  return /** @type {{formatVersion: number, assets: NormalizedAsset[]}} */ ({
    formatVersion: assetManifestFormatVersion,
    assets,
  });
}

/**
 * @param {string | URL | Record<string, unknown>} assetManifest
 * @param {string} [manifestBaseDirectory]
 */
export async function loadAssetManifest(assetManifest, manifestBaseDirectory) {
  let rawBytes;
  let rawManifest;
  let baseDirectory;
  let sourceName;
  if (typeof assetManifest === 'string' || assetManifest instanceof URL) {
    const manifestPath =
      assetManifest instanceof URL ? fileURLToPath(assetManifest) : path.resolve(assetManifest);
    rawBytes = await readFile(manifestPath);
    sourceName = path.basename(manifestPath);
    baseDirectory = path.dirname(manifestPath);
    try {
      rawManifest = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(rawBytes));
    } catch (error) {
      throw new Sb3BuilderError(`Asset manifest is not valid UTF-8 JSON: ${manifestPath}`, {
        stage: 'manifest',
        cause: error,
      });
    }
  } else {
    rawManifest = assetManifest;
    rawBytes = Buffer.from(`${stableStringify(assetManifest)}\n`);
    sourceName = 'inline-assets.json';
    baseDirectory = path.resolve(manifestBaseDirectory ?? process.cwd());
  }
  return {
    baseDirectory,
    bytes: Buffer.from(rawBytes),
    manifest: validateAssetManifest(rawManifest),
    sourceName,
  };
}

/** @param {string} outputName */
export function validateOutputName(outputName) {
  assert(
    typeof outputName === 'string' && outputName.length > 0,
    'outputName must be a non-empty string.',
  );
  assert(
    path.basename(outputName) === outputName && outputName !== '.' && outputName !== '..',
    `outputName must be a filename without directory components: ${outputName}`,
  );
  assert(
    !outputName.includes('/') && !outputName.includes('\\'),
    `outputName cannot contain a path separator: ${outputName}`,
  );
  assert(
    !outputName.includes('\0') && !outputName.startsWith('.'),
    `outputName cannot contain NUL or start with a dot: ${outputName}`,
  );
  assert(
    !/\.(?:sb3|txt|manifest\.json)$/iu.test(outputName),
    `outputName must not include an output extension: ${outputName}`,
  );
  return outputName;
}
