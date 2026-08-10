import { PdfToolbarBtn } from './pdf-toolbar-btn';

/**
 * Kept for configs.default.filter registration / plugin defaults.
 * The filter UI now lives in the shared Preferences panel (PdfConfigToolbarBtn).
 */
export class PdfFilterToolbarBtn extends PdfToolbarBtn {

  constructor({ registry }) {
    super({ registry });
    this.registry.register(`configs.default.filter`, () => PdfFilterToolbarBtn.defaultConfigs());
  }

  protected _configs() { return this.registry.get(`configs.filter`); }
  protected _defaultConfigs() { return PdfFilterToolbarBtn.defaultConfigs(); }
  static defaultConfigs() {
    return true;
  }

  protected override getIcon() { return ''; }
  protected override getClassName() { return 'filter'; }
  protected override getTitle() { return 'Filter'; }
  protected override selected() { }
  protected override unselected() { }
  protected override _addToolbarUI() { /* merged into Preferences */ }
}
