import {createHash} from 'node:crypto';

/** @param {string | NodeJS.ArrayBufferView} value */
export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** @param {string | NodeJS.ArrayBufferView} value */
export function md5(value) {
  return createHash('md5').update(value).digest('hex');
}

/** @param {unknown} value */
export function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

/** @param {unknown} value @returns {unknown} */
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, child]) => [key, sortValue(child)]),
    );
  }
  return value;
}
