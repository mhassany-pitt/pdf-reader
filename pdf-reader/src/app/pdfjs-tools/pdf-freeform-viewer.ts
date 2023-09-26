import { htmlToElements, removeSelectorAll, rotateRect, rotation } from './pdf-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfFreeformViewer {

  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('freeform-viewer', this);

    this._attachStylesheet();
    this._renderOnPagerendered();
  }

  protected _configs() { return this.registry.get(`configs.freeform`); }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getStorage() { return this.registry.get('storage'); }
  private _getAnnotLayer() { return this.registry.get('annotation-layer'); }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(pageNum);
      removeSelectorAll(annotsLayerEl, '.pdf-annotation__freeform');

      this._getStorage().list()
        .filter(annot => annot.type == 'freeform')
        .filter(annot => Object.keys(annot.freeforms)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(annot => this.render(annot));
    });
  }

  render(annot: any) {
    const editor = this.registry.get('freeform-editor');
    const configs = this._configs();

    Object.keys(annot.freeforms)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(pageNum);
        annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdf-annotation__freeform`)
          .forEach((el: any) => el.remove());

        const degree = rotation(this._getPdfJS());
        const bound = rotateRect(degree, true, annot.freeforms[pageNum]);
        const viewerEl = htmlToElements(
          `<div 
            data-annotation-id="${annot.id}" 
            data-annotation-type="${annot.type}"
            data-analytic="freeform:${annot.id}"
            tabindex="-1" 
            class="
              pdf-annotation__freeform 
              ${editor && configs?.move ? 'pdf-annotation--moveable' : ''}
              ${editor && configs?.delete ? 'pdf-annotation--deletable' : ''}" 
            style="
              top: ${bound.top}%;
              bottom: ${bound.bottom}%;
              left: ${bound.left}%;
              right: ${bound.right}%;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
          </div>`);

        annotsLayerEl.appendChild(viewerEl);
        const image = new Image();
        viewerEl.appendChild(image);

        image.src = annot.freeforms[pageNum].dataUrl;
        image.style.position = 'absolute';
        image.style.transform = `rotate(${degree}deg)`;
        image.style.pointerEvents = 'none';

        this.fitImageToParent(viewerEl);
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
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-annotation__freeform {
            position: absolute;
            pointer-events: stroke;
            user-select: none;
            cursor: pointer;
            z-index: 4;
          }
        </style>`));
  }
}
