import {strFromU8, unzipSync} from 'fflate';

import {bundleManifestFormatVersion, packageName, packageVersion} from './constants.js';
import {Sb3BuilderError} from './errors.js';
import {sha256} from './hash.js';
import {collectAssetLines} from './script.js';

/** @param {unknown} condition @param {string} message */
function assert(condition, message) {
  if (!condition) throw new Sb3BuilderError(message, {stage: 'validate-output'});
}

/** @param {Record<string, unknown>} project @param {string} targetName */
function findTarget(project, targetName) {
  const targets = /** @type {Record<string, unknown>[]} */ (project.targets);
  return targets.find((target) =>
    targetName === '@stage'
      ? target.isStage === true
      : target.isStage !== true && target.name === targetName,
  );
}

/**
 * @param {{sb3Bytes: Buffer | Uint8Array, scriptBytes: Buffer | Uint8Array, manifest: Record<string, any>}} bundle
 */
export function validateBundle(bundle) {
  const {manifest} = bundle;
  assert(
    manifest.formatVersion === bundleManifestFormatVersion,
    'Unexpected output manifest formatVersion.',
  );
  assert(
    manifest.builder?.package === packageName && manifest.builder?.version === packageVersion,
    'Output manifest builder identity is invalid.',
  );
  assert(
    manifest.outputs?.sb3?.sha256 === sha256(bundle.sb3Bytes),
    'Output SB3 SHA-256 does not match manifest.',
  );
  assert(
    manifest.outputs?.script?.sha256 === sha256(bundle.scriptBytes),
    'Output script SHA-256 does not match manifest.',
  );
  const archive = unzipSync(new Uint8Array(bundle.sb3Bytes));
  const projectEntry = archive['project.json'];
  assert(projectEntry, 'Generated SB3 has no project.json.');
  const project = JSON.parse(strFromU8(projectEntry));
  assert(Array.isArray(project.targets), 'Generated SB3 project has no targets array.');
  const script = new TextDecoder('utf-8', {fatal: true}).decode(bundle.scriptBytes);
  const scriptAssets = new Map(
    collectAssetLines(script).map((asset) => [asset.name, asset.reference]),
  );
  assert(
    ![...scriptAssets.values()].some((reference) => /^(?:file|https?):/u.test(reference)),
    'Generated script still has an external asset reference.',
  );
  assert(Array.isArray(manifest.assets), 'Output manifest assets must be an array.');
  for (const asset of manifest.assets) {
    const archiveAsset = archive[asset.output.filename];
    assert(archiveAsset, `Generated SB3 is missing ${asset.output.filename}.`);
    assert(
      sha256(archiveAsset) === asset.sha256,
      `Generated SB3 asset hash mismatch: ${asset.name}`,
    );
    const target = findTarget(project, asset.target);
    assert(target, `Generated SB3 target is missing: ${asset.target}`);
    const collectionName =
      asset.kind === 'backdrop' || asset.kind === 'costume' ? 'costumes' : 'sounds';
    const collection = /** @type {Record<string, any>[]} */ (target?.[collectionName] ?? []);
    const projectAsset = collection.find(
      (candidate) => candidate.name === asset.sb3Name && candidate.md5ext === asset.output.filename,
    );
    assert(projectAsset, `Generated SB3 reference is unresolved: ${asset.output.reference}`);
    assert(
      scriptAssets.get(asset.name) === asset.output.reference,
      `Generated script mapping does not match manifest: ${asset.name}`,
    );
  }
  return {archive, project, script};
}
