import { getAnnotEl, getPageEl, removeSelectorAll } from './annotator-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfRemoveOnDelete {

  private registry: PdfRegistry;
  private selected: any;

  constructor({ registry }) {
    this.registry = registry;

    this._toggleSelectOnClick();
    this._removeOnKeyBkSpaceOrDelete();
  }

  private _toggleSelectOnClick() {
    this._getDocument().addEventListener('click', ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (!pageEl) return;

      const classList = $event.target.classList;
      if (!classList.contains('pdfjs-annotation__bound'))
        this.selected = null;

      const annotEl = getAnnotEl($event.target);
      if (annotEl) {
        const annotId = annotEl.getAttribute('data-annotation-id');
        this.selected = this._getStorage().read(annotId);
      }
    });
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getStorage() { return this.registry.get('storage'); }

  private _removeOnKeyBkSpaceOrDelete() {
    this._getDocument().addEventListener('keydown', ($event: any) => {
      if (this.selected
        && $event.key == 'Delete' || $event.key == 'Backspace'
        && $event.target.classList.contains('pdfjs-annotation__bound')) {
        removeSelectorAll(this._getDocumentEl(), `.pdfjs-annotations [data-annotation-id="${this.selected.id}"]`);
        this._getStorage().delete(this.selected, () => this.selected = null);
      }
    });
  }
}
