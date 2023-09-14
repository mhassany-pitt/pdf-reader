import { PdfStorage } from "./pdf-storage";
import { getOrParent, isLeftClick } from "./pdf-utils";
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
      if (this.enabled && isLeftClick($event) && annotEl && confirm('Delete this annotation?')) {
        $event.preventDefault();
        $event.stopPropagation();
        const annotId = annotEl.getAttribute('data-annotation-id');
        const annot = await this._getStorage().read(annotId);
        annotEl.remove();
        await this._getStorage().delete(annot);
        this.registry.list(`${annot.type}.deleted.`).forEach(k => this.registry.get(k)(annot));
      }
    });
  }
}