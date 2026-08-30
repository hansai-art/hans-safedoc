import type { FormatAdapter } from './contracts.js';
export class FormatAdapterRegistry {
  readonly #adapters = new Map<string, FormatAdapter<unknown>>();
  register(format: string, adapter: FormatAdapter<unknown>) {
    if (this.#adapters.has(format)) throw new Error(`Adapter already registered: ${format}`);
    this.#adapters.set(format, adapter);
  }
  get(format: string) {
    const adapter = this.#adapters.get(format);
    if (!adapter) throw new Error(`Format is not enabled: ${format}`);
    return adapter;
  }
  enabled() {
    return [...this.#adapters.keys()];
  }
}
