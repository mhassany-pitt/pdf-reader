import { PdfStorage } from "./pdf-storage";
import { getOrParent, isLeftClick, removeSelectorAll } from "./pdf-utils";
import { PdfRegistry } from "./pdf-registry";

export class PdfDelete {

  protected registry: PdfRegistry;

  enabled: boolean = false;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('delete', this);

    this.onAnnotClick();
  }

  protected _getDocument() { return this.registry.getDocument(); }
  protected _getDocumentEl() { return this.registry.getDocumentEl(); }
  protected _getStorage(): PdfStorage { return this.registry.get('storage'); }

  setEnabled(enable: boolean) {
    this.enabled = enable;
  }

  protected onAnnotClick() {
    this._getDocument().addEventListener('click', async ($event: any) => {
      const annotEl = getOrParent($event, '[data-annotation-id]');
      if (this.enabled &&
        isLeftClick($event) &&
        annotEl &&
        confirm('Are you sure you want to delete this annotation?')) {
        $event.preventDefault();
        $event.stopPropagation();
        const annotId = annotEl.getAttribute('data-annotation-id');
        const annot = await this._getStorage().read(annotId);
        await this._getStorage().delete(annot, () => removeSelectorAll(
          this._getDocumentEl(), `.pdf-annotations [data-annotation-id="${annotId}"]`));
      }
    });
  }
}
