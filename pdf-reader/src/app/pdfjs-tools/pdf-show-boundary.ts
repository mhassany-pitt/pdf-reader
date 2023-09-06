import {
  WHRect, getPageEl, getPageNum,
  htmlToElements, getAnnotEl, rotateRect,
  rotation, getAnnotBound, removeSelectorAll
} from './annotator-utils';
import { Highlight } from './highlight.type';
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

      const classList = $event.target.classList;

      // remove boundaries if clicked outside one
      if (!classList.contains('pdfjs-annotation__bound')) {
        removeSelectorAll(pageEl, '.pdfjs-annotation__bound');
      }

      const annotEl = getAnnotEl($event.target);
      if (annotEl) {
        const annotId: any = annotEl.getAttribute('data-annotation-id');
        const annot = this._getStorage().read(annotId);
        const boundEl = this._showBoundary(getPageNum(pageEl), annot, getAnnotBound($event));

        if (!$event.target.closest('.pdfjs-show-boundary__unfocusable'))
          boundEl.focus();
      }
    });
  }

  private _showBoundary(pageNum: number, annot: Highlight, boundRect: WHRect) {
    boundRect = rotateRect(rotation(this._getPdfJS()), true, boundRect);

    const boundEl = htmlToElements(
      `<div data-annotation-id="${annot.id}"
        class="pdfjs-annotation__bound" 
        tabindex="-1"
        style="
          top: calc(${boundRect.top}% - 1px);
          left: calc(${boundRect.left}% - 1px);
          bottom: calc(${boundRect.bottom}% - 1px);
          right: calc(${boundRect.right}% - 1px);
        ">
      </div>`
    );

    this.registry.get('annotation-layer').getOrAttachLayerEl(pageNum).appendChild(boundEl);
    return boundEl;
  }

  private _attachStylesheet() {
    this.registry.getDocumentEl().querySelector('head').appendChild(htmlToElements(
      `<style>
        .pdfjs-annotation__bound {
          position: absolute;
          pointer-events: auto;
          border-radius: 5px;
          border: 1px dashed blue;
        }
      </style>`));
  }
}
