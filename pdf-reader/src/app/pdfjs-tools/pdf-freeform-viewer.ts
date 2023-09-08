import { getSelectionRects, htmlToElements, isLeftClick, rotateRect, rotation, uuid } from './annotator-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfFreeformViewer {

  private registry: PdfRegistry;

  attachMoveElClass: boolean = false;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('freeform-viewer', this);

    this._attachStylesheet();
    this._renderOnPagerendered();
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getStorage() { return this.registry.get('storage'); }
  private _getAnnotLayer() { return this.registry.get('annotation-layer'); }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__freeform').forEach((el: any) => el.remove());

      this._getStorage().list()
        .filter(annot => annot.type == 'freeform')
        .filter(annot => Object.keys(annot.freeforms)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(annot => this.render(annot));
    });
  }

  render(annot: any) {
    Object.keys(annot.freeforms)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(pageNum);
        annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdfjs-annotation__freeform`)
          .forEach((el: any) => el.remove());

        const degree = rotation(this._getPdfJS());
        const bound = rotateRect(degree, true, annot.freeforms[pageNum]);
        const freeformEl = htmlToElements(
          `<div data-annotation-id="${annot.id}" 
            data-analytic-id="annot-freeform-${annot.id}"
            class="pdfjs-annotation__freeform ${this.attachMoveElClass ? 'pdf-movable-el' : ''}" 
            ${this.attachMoveElClass ? `data-movable-type="freeform"` : ''}
            tabindex="-1" 
            style="
              top: ${bound.top}%;
              bottom: ${bound.bottom}%;
              left: ${bound.left}%;
              right: ${bound.right}%;
              ${/* TODO: this.configs?.resize ? 'resize: both;' : '' */''}
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
          </div>`);

        annotsLayerEl.appendChild(freeformEl);
        const image = new Image();
        freeformEl.appendChild(image);

        image.src = annot.freeforms[pageNum].dataUrl;
        image.style.position = 'absolute';
        image.style.transform = `rotate(${degree}deg)`;
        image.style.pointerEvents = 'none';

        this.fitImageToParent(freeformEl);
      });
  }

  fitImageToParent(annotEl: any) {
    const image = annotEl.querySelector('img');
    if (!image)
      return;

    const degree = rotation(this._getPdfJS());
    const style = getComputedStyle(annotEl);
    image.style.width = degree == 90 || degree == 270 ? style.height : style.width;
    image.style.height = degree == 90 || degree == 270 ? style.width : style.height;
  }

  private _attachStylesheet() {
    this._getDocumentEl().querySelector('head').appendChild(htmlToElements(
      `<style>
        .pdfjs-annotation__freeform {
          position: absolute;
          pointer-events: stroke;
          user-select: none;
          z-index: 4;
        }
      </style>`));
  }
}
