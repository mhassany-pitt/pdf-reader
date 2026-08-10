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

    this.registry.register('show-boundary', this);

    this._attachStylesheet();
    this._toggleBoundaryOnClick();
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getStorage() { return this.registry.get('storage'); }

  private _clearSelection(pageEl?: HTMLElement) {
    const root = pageEl || this._getDocumentEl();
    removeSelectorAll(root, '.pdf-annotation__bound');
    root.querySelectorAll?.('.pdf-annotation--selected')
      ?.forEach((el: Element) => el.classList.remove('pdf-annotation--selected'));
    if (!pageEl) {
      this._getDocumentEl().querySelectorAll('.pdf-annotation--selected')
        .forEach(el => el.classList.remove('pdf-annotation--selected'));
    }
  }

  private _toggleBoundaryOnClick() {
    this._getDocument().addEventListener('click', ($event: any) => {
      if ($event.target.closest('.pdf-toolbar'))
        return;

      const pageEl = getPageEl($event.target);
      if (!pageEl) return;

      if (!$event.target.classList.contains('pdf-annotation__bound'))
        this._clearSelection(pageEl);

      const annotEl = getAnnotEl($event.target);
      if (annotEl) {
        const annotId: any = annotEl.getAttribute('data-annotation-id');
        const annot = this._getStorage().read(annotId);
        pageEl.querySelectorAll(`[data-annotation-id="${annotId}"]`)
          .forEach((el: Element) => el.classList.add('pdf-annotation--selected'));
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
          top: calc(${rect.top}% - 2px);
          left: calc(${rect.left}% - 2px);
          bottom: calc(${rect.bottom}% - 2px);
          right: calc(${rect.right}% - 2px);
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
            border-radius: 0.3rem;
            border: 2px solid #3d6df0;
            box-shadow: 0 0 0 3px rgba(61, 109, 240, 0.18);
            pointer-events: none;
            z-index: 8;
          }
          @media (prefers-color-scheme: dark) {
            .pdf-annotation__bound {
              border-color: #7ea2ff;
              box-shadow: 0 0 0 3px rgba(126, 162, 255, 0.22);
            }
          }
        </style>`));
  }
}
