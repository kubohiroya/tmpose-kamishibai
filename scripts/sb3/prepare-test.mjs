import process from 'node:process';
import {pathToFileURL} from 'node:url';

import {buildSb3} from './build.mjs';

export async function prepareTestSb3({
  build = buildSb3,
  environment = process.env,
} = {}) {
  if (environment.KAMISHIBAI_SB3_PATH) {
    return {
      configured: true,
      outputPath: environment.KAMISHIBAI_SB3_PATH,
    };
  }
  return {
    ...await build({yes: true}),
    configured: false,
  };
}

async function main() {
  const result = await prepareTestSb3();
  if (result.configured) {
    console.log(`Using configured SB3 for tests: ${result.outputPath}`);
    return;
  }
  const action = result.changed ? 'Built test SB3' : 'Test SB3 already up to date';
  console.log(`${action}: ${result.outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
