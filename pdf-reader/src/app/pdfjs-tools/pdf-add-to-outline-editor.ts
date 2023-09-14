import { getSelectionRects, isLeftClick } from './pdf-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfAddToOutlineEditor {

  private registry: PdfRegistry;

  private _enabled: boolean = false;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('add-to-outline-editor', this);

    this._addToOutlineOnTextSelection();
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }

  isEnabled() { return this._enabled; }
  setEnabled(enabled: boolean) { this._enabled = enabled; }

  private _getDocument() { return this.registry.getDocument(); }

  private _addToOutlineOnTextSelection() {
    this._getDocument().addEventListener('mouseup', ($event: any) => {
      if (this._enabled && isLeftClick($event))
        this._handleTextSelection($event);
    });
    this._getDocument().addEventListener('dblclick', ($event: any) => {
      if (this._enabled && isLeftClick($event))
        this._handleTextSelection($event);
    });
  }

  private _handleTextSelection($event: any) {
    const rects = getSelectionRects(this._getDocument(), this._getPdfJS());
    if (rects && Object.keys(rects).length)
      this.registry.get('add-to-outline')?.($event, {
        selection: this._getDocument().getSelection(),
        rects
      });
  }
}
