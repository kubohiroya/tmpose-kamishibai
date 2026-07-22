export class Sb3BuilderError extends Error {
  /**
   * @param {string} message
   * @param {{assetName?: string, inputUri?: string, stage?: string, code?: string, cause?: unknown}} [details]
   */
  constructor(message, details = {}) {
    const context = [
      details.stage ? `stage=${details.stage}` : null,
      details.assetName ? `asset=${JSON.stringify(details.assetName)}` : null,
      details.inputUri ? `uri=${JSON.stringify(details.inputUri)}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    super(context ? `${context}: ${message}` : message, {cause: details.cause});
    this.name = 'Sb3BuilderError';
    this.code = details.code ?? 'ERR_SB3_BUILDER';
    this.stage = details.stage ?? 'build';
    this.assetName = details.assetName ?? null;
    this.inputUri = details.inputUri ?? null;
  }
}

/**
 * @param {unknown} error
 * @param {{assetName: string, inputUri: string, stage: string}} details
 * @returns {Sb3BuilderError}
 */
export function toAssetError(error, details) {
  if (error instanceof Sb3BuilderError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new Sb3BuilderError(message, {...details, cause: error});
}
