import { getAnnotEl, getOrParent, getPageEl, removeSelectorAll } from './pdf-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfRemoveOnDelete {

  private registry: PdfRegistry;
  private selected: any = null;

  constructor({ registry }) {
    this.registry = registry;

    this._toggleSelectOnClick();
    this._removeOnKeyBkSpaceOrDelete();
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getStorage() { return this.registry.get('storage'); }

  private _isDeleteable($event: any) {
    return $event.target.classList.contains('pdfjs-annotation--deletable');
  }

  private _toggleSelectOnClick() {
    this._getDocument().addEventListener('click', ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (!pageEl) return;

      if (!this._isDeleteable($event)) {
        this.selected = null;
      }

      const annotEl = getAnnotEl($event.target);
      if (annotEl && getOrParent($event, '.pdfjs-annotation--deletable')) {
        const annotId = annotEl.getAttribute('data-annotation-id');
        this.selected = this._getStorage().read(annotId);
        if (!$event.target.closest('.pdfjs-annotation--unfocusable'))
          annotEl.focus();
      }
    });
  }

  private _removeOnKeyBkSpaceOrDelete() {
    this._getDocument().addEventListener('keydown', ($event: any) => {
      if (this.selected && ['Delete', 'Backspace'].includes($event.key) && this._isDeleteable($event))
        this._getStorage().delete(this.selected, () => {
          this.registry.list(`${this.selected.type}.deleted.`).forEach(k => this.registry.get(k)(this.selected));
          removeSelectorAll(this._getDocumentEl(), `.pdfjs-annotations [data-annotation-id="${this.selected.id}"]`);
          this.selected = null;
        });
    });
  }
}
