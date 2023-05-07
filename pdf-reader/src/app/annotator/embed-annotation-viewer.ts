import { Annotator } from './annotator';
import { AnnotatorPopup } from './annotator-popup';
import { AnnotationStore } from './annotator-store';
import {
  Rect,
  closestPageEl, createUniqueId, getPageEl, getPageNum,
  htmlToElements, isRightClick, relativeToPageEl, rotateRect, rotation, scale
} from './utils';

export type EmbedAnnotation = {
  id: string,
  type: string,
  page: number,
  bound: Rect,
  link: string,
  target: string,
}

export class EmbedAnnotationViewer {
  private window;
  private document;
  private documentEl;

  private pdfjs;
  private annotator: Annotator;
  private store: AnnotationStore;
  private popup: AnnotatorPopup;

  constructor({ iframe, pdfjs, annotator, store, popup }) {
    this.window = iframe?.contentWindow;
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.annotator = annotator;
    this.store = store;
    this.popup = popup;

    this.annotator.registerBoundGetter('pdfjs-annotation__embed',
      (pageNum: number, annot: any) => annot.bound);

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._registerViewItemUI();
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/embed-annotation-viewer.css" />`
    ));
  }

  private _registerViewItemUI() {
    this.popup.registerItemUI(($event: any) => {
      const embedEl = $event.target.classList.contains('pdfjs-annotation__embed')
        ? $event.target : $event.target.closest('.pdfjs-annotation__embed');

      if (embedEl) {
        const annot = this.store.read(embedEl.getAttribute('data-annotation-id'));

        if (annot.target == 'popup') {
          const embedElStyle = getComputedStyle(embedEl);
          const scaledHeight = 24 * scale(this.pdfjs);
          this.popup.location = {
            top: `calc(${embedElStyle.top} + ${scaledHeight + 5}px)`,
            left: `calc(${embedElStyle.left} - 320px)`,
            width: '640px',
            height: '480px'
          };

          return htmlToElements(
            `<div style="display: flex; flex-flow: column; height: 100%;">
              <div style="text-align: right;">
                <a href="${annot.link}" target="_blank">open in new tab</a>
              </div>
              <iframe src="${annot.link}" style="width: 100%; flex-grow: 1;"></iframe>
            </div>`);
        } else {
          window.open(annot.link, '_blank');
        }
      }

      return null as any;
    });
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pagerendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.annotator.getOrAttachAnnotLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__embed').forEach((el: any) => el.remove());

      (this.store.list() as EmbedAnnotation[])
        .filter(annot => annot.type == 'embed')
        .filter(annot => annot.page == pageNum)
        .forEach(annot => this.render(annot));
    });
  }

  render(annot: EmbedAnnotation) {
    const annotsLayerEl = this.annotator.getOrAttachAnnotLayerEl(annot.page);
    annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdfjs-annotation__embed`)
      .forEach((el: any) => el.remove());

    const degree = rotation(this.pdfjs);
    const bound = rotateRect(degree, true, annot.bound as any);
    const embedEl = htmlToElements(
      `<button data-annotation-id="${annot.id}" 
        class="pdfjs-annotation__embed"
        tabindex="-1" 
        style="
          top: ${bound.top}%;
          bottom: ${bound.bottom}%;
          left: ${bound.left}%;
          right: ${bound.right}%;
          border-radius: 100%;
        ">
      </button>`);

    annotsLayerEl.appendChild(embedEl);
  }
}