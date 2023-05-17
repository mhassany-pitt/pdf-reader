import {
  Rect, htmlToElements, rotateRect,
  rotation,
  scale,
} from './annotator-utils';
import {
  Annotator, GET_ANNOTATION_BOUND, GetAnnotationBound, POPUP_ROW_ITEM_UI
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
            `<div class="pdfjs-embed-link__popup" style="display: flex; flex-flow: column; height: 100%;">
              <div style="text-align: right; margin-bottom: 5px;">
                <a href="${annot.link}" target="_blank">open in new tab</a>
              </div>
              <iframe src="${annot.link}" style="width: 100%; flex-grow: 1;"></iframe>
            </div>`);
        } else if (annot.target == 'new-page') {
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
        data-analytic-id="embedded-link-${annot.id}"
        class="pdfjs-annotation__embed"
        tabindex="-1" 
        style="
          top: ${bound.top}%;
          bottom: ${bound.bottom}%;
          left: ${bound.left}%;
          right: ${bound.right}%;
          ${this.configs?.resize ? 'resize: both;' : ''}
          min-width: 16px;
          min-height: 16px;
          border-radius: 5px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
      </div>`);

    annotsLayerEl.appendChild(embedEl);
    if (annot.target == 'inline-iframe') {
      const iframe = htmlToElements(
        `<iframe src="${annot.link}" style="border: none; background-color: white;"></iframe>`);
      embedEl.appendChild(iframe);

      this.fitIframeToParent(embedEl);
    }
  }

  fitIframeToParent(annotEl: HTMLElement) {
    const iframe = annotEl.querySelector('iframe') as HTMLIFrameElement;
    const degree = rotation(this.pdfjs);
    const scaleFactor = scale(this.pdfjs);
    iframe.style.position = 'absolute';
    iframe.style.transform = `scale(${scaleFactor}) rotate(${degree}deg)`;

    const computedStyle = getComputedStyle(annotEl);
    let width: any = parseFloat(computedStyle.width.replace('px', '')) / scaleFactor;
    let height: any = parseFloat(computedStyle.height.replace('px', '')) / scaleFactor;
    width = degree == 90 || degree == 270 ? height : width;
    height = degree == 90 || degree == 270 ? width : height;
    iframe.style.width = `${width - 4}px`;
    iframe.style.height = `${height - (this.configs?.resize ? 24 : 4)}px`;
    iframe.style.marginTop = `-${this.configs?.resize ? 12 : 0}px`;
  }
}