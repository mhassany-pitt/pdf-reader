import {
  WHRect, getPageEl, getPageNum,
  htmlToElements, getAnnotEl, rotateRect,
  rotation, getAnnotBound, removeSelectorAll
} from './pdf-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfShowBoundary {

  private registry: PdfRegistry;

  enabled: boolean = false;
  type = 'highlight';
  color: string = 'transparent';
  stroke = '0.125rem';
  strokeStyle = 'solid';

  constructor({ registry }) {
    this.registry = registry;

    this._attachStylesheet();
    this._toggleBoundaryOnClick();
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getStorage() { return this.registry.get('storage'); }

  private _toggleBoundaryOnClick() {
    this._getDocument().addEventListener('click', ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (!pageEl) return;

      if (!$event.target.classList.contains('pdf-annotation__bound'))
        removeSelectorAll(pageEl, '.pdf-annotation__bound');

      const annotEl = getAnnotEl($event.target);
      if (annotEl) {
        const annotId: any = annotEl.getAttribute('data-annotation-id');
        const annot = this._getStorage().read(annotId);
        this._showBoundary(getPageNum(pageEl), annot, getAnnotBound($event));
      }
    });
  }

  private _showBoundary(pageNum: number, annot: any, rect: WHRect) {
    rect = rotateRect(rotation(this._getPdfJS()), true, rect);
    const boundEl = htmlToElements(
      `<div data-annotation-id="${annot.id}"
        class="pdf-annotation__bound" 
        style="
          top: calc(${rect.top}% - 1px);
          left: calc(${rect.left}% - 1px);
          bottom: calc(${rect.bottom}% - 1px);
          right: calc(${rect.right}% - 1px);
        ">
      </div>`
    );

    this.registry.get('annotation-layer').getOrAttachLayerEl(pageNum).appendChild(boundEl);
    return boundEl;
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-annotation__bound {
            position: absolute;
            border-radius: 0.125rem;
            border: 1px dashed blue;
          }
        </style>`));
  }
}
