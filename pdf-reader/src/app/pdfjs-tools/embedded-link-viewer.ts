import {
  Rect, htmlToElements, rotateRect,
  rotation, scale, Annotator, GET_ANNOTATION_BOUND, GetAnnotationBound, POPUP_ROW_ITEM_UI
} from './annotator';
import { AnnotationStorage } from './annotator-storage';

export type EmbeddedLink = {
  id: string,
  type: string,
  page: number,
  bound: Rect,
  link: string,
  target: string,
}

export class EmbeddedLinkViewer {
  private document: any;
  private documentEl: any;

  private pdfjs: any;
  private annotator: Annotator;
  private storage: AnnotationStorage<EmbeddedLink>;

  private configs: {
    resize: boolean,
  };

  constructor({ iframe, pdfjs, annotator, storage, configs }) {
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.storage = storage;
    this.annotator = annotator;

    this.configs = configs;

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._registerGetEmbedBound();
    this._registerViewItemUI();
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/embedded-link-viewer.css" />`
    ));
  }

  private _registerGetEmbedBound() {
    this.annotator.register(GET_ANNOTATION_BOUND, (pageNum, annot) => ({
      className: 'pdfjs-annotation__embed',
      getBound: (pageNum: number, annot: any) => annot.bound
    }) as GetAnnotationBound);
  }

  private _registerViewItemUI() {
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const embedEl = $event.target.classList.contains('pdfjs-annotation__embed')
        ? $event.target : $event.target.closest('.pdfjs-annotation__embed');

      if (embedEl) {
        const annot = this.storage.read(embedEl.getAttribute('data-annotation-id'));
        if (annot.target == 'popup-iframe') {
          const embedElStyle = getComputedStyle(embedEl);
          const scaledHeight = 24 * scale(this.pdfjs);
          this.annotator.location = {
            top: `calc(${embedElStyle.top} + ${scaledHeight + 5}px)`,
            left: `calc(${embedElStyle.left} - 320px)`,
            width: '640px',
            height: '480px'
          };

          return htmlToElements(
            `<div style="display: flex; flex-flow: column; height: 100%;">
              <div style="text-align: right; margin-bottom: 5px;">
                <a href="${annot.link}" target="_blank">open in new tab</a>
              </div>
              <iframe src="${annot.link}" style="width: 100%; flex-grow: 1;"></iframe>
            </div>`);
        } else if (annot.target == 'page') {
          window.open(annot.link, '_blank');
        }
      }

      return null as any;
    });
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pagerendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.annotator.getOrAttachLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__embed').forEach((el: any) => el.remove());

      (this.storage.list() as EmbeddedLink[])
        .filter(annot => annot.type == 'embed')
        .filter(annot => annot.page == pageNum)
        .forEach(annot => this.render(annot));
    });
  }

  render(annot: EmbeddedLink) {
    const annotsLayerEl = this.annotator.getOrAttachLayerEl(annot.page);
    annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdfjs-annotation__embed`)
      .forEach((el: any) => el.remove());

    const degree = rotation(this.pdfjs);
    const bound = rotateRect(degree, true, annot.bound as any);
    const embedEl = htmlToElements(
      `<div data-annotation-id="${annot.id}" 
        class="pdfjs-annotation__embed"
        tabindex="-1" 
        style="
          top: ${bound.top}%;
          bottom: ${bound.bottom}%;
          left: ${bound.left}%;
          right: ${bound.right}%;
          ${this.configs?.resize ? 'resize: both;' : ''}
          overflow: hidden;
          min-width: 16px;
          min-height: 16px;
          border-radius: 5px;
        ">
        ${annot.target == 'inline-iframe'
        ? `<iframe src="${annot.link}" style="
              width: calc(100% - 4px); 
              height: calc(100% - ${this.configs?.resize ? 16 : 4}px); 
              border: solid 2px lightgray; 
              background-color: white;
            ">
          </iframe>`
        : ''}
      </div>`);

    annotsLayerEl.appendChild(embedEl);
  }
}