import { AnnotationStorage } from './annotator-storage';
import { WHRect, htmlToElements, rotateRect, rotation } from './annotator-utils';
import { Annotator, GetAnnotationBound } from './annotator';

export type FreeformRect = WHRect & {
  dataUrl: string,
};

export type Freeform = {
  id: string,
  type: string,
  freeforms: { [pageNum: number]: FreeformRect }
};

export class FreeformViewer {
  private document: any;
  private documentEl: any;

  private pdfjs: any;
  private annotator: Annotator;
  private storage: AnnotationStorage<Freeform>;

  private configs: {
    resize: boolean,
  };

  constructor({ baseHref, iframe, pdfjs, annotator, storage, configs }) {
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.storage = storage;
    this.annotator = annotator;

    this.configs = configs;

    this._attachStylesheet(baseHref);
    this._renderOnPagerendered();
  }

  private _attachStylesheet(baseHref: string) {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="${baseHref}assets/freeform-viewer.css" />`
    ));
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pagerendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.annotator.getOrAttachLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__freeform').forEach((el: any) => el.remove());

      this.storage.list()
        .filter(annot => annot.type == 'freeform')
        .filter(annot => Object.keys(annot.freeforms)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(annot => this.render(annot));
    });
  }

  render(annot: Freeform) {
    Object.keys(annot.freeforms)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = this.annotator.getOrAttachLayerEl(pageNum);
        annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdfjs-annotation__freeform`)
          .forEach((el: any) => el.remove());

        const degree = rotation(this.pdfjs);
        const bound = rotateRect(degree, true, annot.freeforms[pageNum]);
        const freeformEl = htmlToElements(
          `<div data-annotation-id="${annot.id}" 
            data-analytic-id="annot-freeform-${annot.id}"
            class="pdfjs-annotation__freeform"
            tabindex="-1" 
            style="
              top: ${bound.top}%;
              bottom: ${bound.bottom}%;
              left: ${bound.left}%;
              right: ${bound.right}%;
              ${this.configs?.resize ? 'resize: both;' : ''}
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

    const degree = rotation(this.pdfjs);
    const style = getComputedStyle(annotEl);
    image.style.width = degree == 90 || degree == 270 ? style.height : style.width;
    image.style.height = degree == 90 || degree == 270 ? style.width : style.height;
  }
}