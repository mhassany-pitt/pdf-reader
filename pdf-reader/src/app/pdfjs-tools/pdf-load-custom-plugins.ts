import { PdfRegistry } from './pdf-registry';
import { loadPlugin } from './pdf-utils';

export class PdfLoadCustomPlugins {

  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register(`configs.default.plugins`, () => PdfLoadCustomPlugins.defaultConfigs());

    this._load();
  }

  protected _configs() { return this.registry.get(`configs.plugins`); }
  static defaultConfigs() {
    return [];
  }

  private _load() {
    const plugins = this._configs();
    for (const url of plugins || []) {
      try {
        loadPlugin({
          url, registry: this.registry,
          loaded: () => { },
          failed: () => { },
        });
      } catch (exp) { console.error(exp); }
    }
  }
}
