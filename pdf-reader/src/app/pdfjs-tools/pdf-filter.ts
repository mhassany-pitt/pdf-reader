import { PdfRegistry } from './pdf-registry';
import { PdfStorage } from './pdf-storage';

export class PdfFilter {

  private registry: PdfRegistry;
  private _state: any = {};

  constructor({ registry }) {
    this.registry = registry;

    this.load();
    this._getStorage().qparams['annotators'] = this.getSelecteds().join(',');
    this._getStorage().reload(true);

    this.registry.register('filter', this);
    this.registry.register(`storage.oncreate.${Math.random()}`, (annot: any) => {
      if (!annot.misc) annot.misc = {};
      annot.misc.displayName = this.getDisplayName();
    });
  }

  private _getStorage(): PdfStorage { return this.registry.get('storage'); }

  load() { this._state = JSON.parse(localStorage.getItem('pdf-annotations-filter') || '{"annotators": [], "displayName": ""}'); }
  persist() { localStorage.setItem('pdf-annotations-filter', JSON.stringify(this._state)); }

  getAnnotators() { return this._getStorage().getAnnotators(); }
  getSelecteds() { return this._state.annotators; }
  setSelecteds(selecteds: string[]) { this._state.annotators = selecteds; }
  getDisplayName() { return this._state.displayName; }
  setDisplayName(displayName: string) { this._state.displayName = displayName; }
}
