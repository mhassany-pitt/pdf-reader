import { AnnotationStorage } from './annotator-storage';
import { WHRect, htmlToElements, rotateRect, rotation, Annotator, GET_ANNOTATION_BOUND, GetAnnotationBound } from './annotator';

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

  constructor({ iframe, pdfjs, annotator, storage }) {
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.storage = storage;
    this.annotator = annotator;

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._registerGetFreeformBound();
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/freeform-annotation-viewer.css" />`
    ));
  }

  private _registerGetFreeformBound() {
    this.annotator.register(GET_ANNOTATION_BOUND, (pageNum, annot) => ({
      className: 'pdfjs-annotation__freeform',
      getBound: (pageNum: number, annot: any) => annot.freeforms[pageNum]
    }) as GetAnnotationBound);
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pagerendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.annotator.getOrAttachLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__freeform').forEach((el: any) => el.remove());

      (this.storage.list() as Freeform[])
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
        const freeform = annot.freeforms[pageNum];
        const bound = rotateRect(degree, true, freeform);

        const freeformEl = htmlToElements(
          `<div data-annotation-id="${annot.id}" 
            class="pdfjs-annotation__freeform"
            tabindex="-1" 
            style="
              top: ${bound.top}%;
              bottom: ${bound.bottom}%;
              left: ${bound.left}%;
              right: ${bound.right}%;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
          </div>`);

        const image = new Image();
        image.src = freeform.dataUrl;
        image.style.position = 'relative';
        image.style.transform = `rotate(${degree}deg)`;
        image.style.pointerEvents = 'none';

        freeformEl.appendChild(image);
        annotsLayerEl.appendChild(freeformEl);

        const computedStyle = getComputedStyle(freeformEl);
        image.style.width = degree == 90 || degree == 270 ? computedStyle.height : computedStyle.width;
        image.style.height = degree == 90 || degree == 270 ? computedStyle.width : computedStyle.height;
      });
  }
}