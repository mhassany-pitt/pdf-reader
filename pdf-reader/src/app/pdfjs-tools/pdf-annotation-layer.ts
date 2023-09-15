import { getPageEl, htmlToElements, rotation } from './pdf-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfAnnotationLayer {
  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('annotation-layer', this);

    this._attachStylesheet();
  }

  private _getDocumentEl() { return this.registry.getDocumentEl(); }

  getOrAttachLayerEl(pageNum: number) {
    const pageEl = getPageEl(this._getDocumentEl(), pageNum);
    if (!pageEl) return null;
    if (!pageEl.querySelector('.pdf-annotations'))
      pageEl.appendChild(htmlToElements(`<div class="pdf-annotations"></div>`));
    const layer = pageEl.querySelector('.pdf-annotations');
    layer.setAttribute('data-rotation-degree', rotation(this.registry.getPdfJS()));
    return layer;
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-annotations {
            position: absolute;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            line-height: 1;
            /* overflow: hidden; */
            pointer-events: none;
            text-size-adjust: none;
            forced-color-adjust: none;
            transform-origin: center center;
            z-index: 5;
          }
        </style>`));
  }
}
