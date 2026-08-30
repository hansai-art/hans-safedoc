/**
 * Build-time injected denial for dormant network loaders in bundled dependencies.
 * Hans SafeDoc supplies verified WASM bytes directly and never needs these loaders.
 */
export function fetch(): never {
  throw new Error('PB-NETWORK-001: bundled fetch is disabled');
}

export class XMLHttpRequest {
  constructor() {
    throw new Error('PB-NETWORK-001: bundled network loader is disabled');
  }
}
