import {readFileSync} from 'node:fs';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

import {strFromU8, unzipSync} from 'fflate';

export const defaultKamishibaiSb3Path = fileURLToPath(
  new URL('../../tmp/kamishibai.sb3', import.meta.url),
);

export function resolveKamishibaiSb3Path(environment = process.env) {
  return environment.KAMISHIBAI_SB3_PATH ?? defaultKamishibaiSb3Path;
}

export function loadKamishibaiProject(sb3Path = resolveKamishibaiSb3Path()) {
  const archive = unzipSync(new Uint8Array(readFileSync(sb3Path)));
  const projectEntry = archive['project.json'];
  if (!projectEntry) {
    throw new Error(`SB3 does not contain project.json: ${sb3Path}`);
  }
  try {
    return JSON.parse(strFromU8(projectEntry));
  } catch (error) {
    throw new Error(`SB3 project.json is invalid JSON: ${sb3Path} (${error.message})`, {
      cause: error,
    });
  }
}
