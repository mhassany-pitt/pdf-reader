import { PdfDelete } from './pdf-delete';
import { PdfToolbarBtn } from './pdf-toolbar-btn';

export class PdfDeleteToolbarBtn extends PdfToolbarBtn {

  constructor({ registry }) {
    super({ registry });

    this.registry.register(`configs.default.delete`, () => PdfDeleteToolbarBtn.defaultConfigs());

    this._addToolbarUI();
  }

  protected _configs() { return this.registry.get(`configs.delete`); }
  static defaultConfigs() {
    return true;
  }

  private _getEditor(): PdfDelete { return this.registry.get('delete'); }

  protected getIcon() { return `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAAPElEQVR42mNgGADwv+E/DHTgU3b0Pz5wGFPDYbwaDjEMiGfxgFENoxpoq+ExTvWPsGvwxKHl0X8PeuYaAMKt6lyRETd/AAAAAElFTkSuQmCC">`; }
  protected override getClassName() { return 'delete'; }
  protected override getTitle() { return 'Delete'; }

  protected override _addToolbarUI() {
    if (!this._configs())
      return;

    super._addToolbarUI();
  }

  protected override selected() {
    this._getEditor().setEnabled(true);
    this._getToolbarEl().showDetails(null as any);
  }

  protected override unselected() {
    this._getEditor().setEnabled(false);
    this._getToolbarEl().showDetails(null as any);
  }
}
