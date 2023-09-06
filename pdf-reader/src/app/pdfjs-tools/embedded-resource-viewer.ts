import {
  Rect, getOrParent, htmlToElements, isLeftClick,
  rotateRect, rotation, scale
} from './annotator-utils';
import {
  Annotator, GetAnnotationBound, POPUP_ROW_ITEM_UI
} from './annotator';
import { Annotations } from './annotations';

export type EmbeddedResource = {
  id: string,
  type: string,
  page: number,
  bound: Rect,
  target: string,
  targetSize?: string,
  resource: string,
  thumbnail?: string,
}

export class EmbeddedResourceViewer {
  private document: any;
  private documentEl: any;

  private pdfjs: any;
  private annotator: Annotator;
  private storage: Annotations;

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
    this._registerViewItemUI();
  }

  private _attachStylesheet(baseHref: string) {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="${baseHref}assets/embedded-resource-viewer.css" />`
    ));
  } 

  private _registerViewItemUI() {
    let lastEvTypes: any = {};
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const rectEl = getOrParent($event, 'pdfjs-annotation__rect');
      const embedEl = getOrParent($event, 'pdfjs-annotation__embed');
      const freeformEl = getOrParent($event, 'pdfjs-annotation__freeform');
      const annotEl = embedEl || rectEl || freeformEl;
      if (!annotEl) return null as any;

      const annotId = annotEl.getAttribute('data-annotation-id');

      // moving the annotEl will trigger mouseup and then click
      // we don't want to show the popup just after moving the annotEl
      // we record the last event type to check if the current one is a click
      const ifLeftClick = isLeftClick($event, true)
        && (!lastEvTypes[annotId] || lastEvTypes[annotId] == 'click');
      lastEvTypes[annotId] = $event.type;

      if (!ifLeftClick) return null as any;

      const annot = this.storage.read(annotId);
      if (annot.target == 'popup-iframe') {
        const popupEl = htmlToElements(
          `<div class="pdfjs-embed-resource__popup" data-annotation-id="${annotId}">
              <div class="pdfjs-embed-resource__popup-header">
                <a href="${annot.resource}" target="_blank">open in new tab</a>
                <span style="flex-grow: 1;"></span>
                <button type="button">close</button>
              </div>
              <iframe src="${annot.resource}" style="flex-grow: 1; height: 0%;"></iframe>
            </div>`);

        const closeBtnEl = popupEl.querySelector('button') as any;
        closeBtnEl.addEventListener('click', () => this.annotator.hidePopup());

        if (annot.targetSize == 'fullscreen') {
          popupEl.style.position = 'fixed';
          popupEl.style.inset = '32px 0 0 0';
        } else if (annot.targetSize == 'fullpage') {
          this.annotator.location = { top: '0', left: '0', width: '100%', height: '100%' };
        } else { // custom size popup
          const style = getComputedStyle(annotEl);
          const targetSize = annot.targetSize ? annot.targetSize.split(',') : ['640px', '480px'];
          this.annotator.location = {
            top: `calc(100% - ${style.bottom} + 5px)`,
            left: `calc(${style.left} + (${style.width} / 2) - (${targetSize[0]} / 2))`,
            width: `${targetSize[0]}`,
            height: `${targetSize[1]}`
          };
        }

        return popupEl;
      } else if (annot.target == 'new-page') {
        window.open(annot.resource, '_blank');
        return null as any;
      }
    });
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.annotator.getOrAttachLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__embed').forEach((el: any) => el.remove());

      this.storage.list()
        .filter(annot => annot.type == 'embed')
        .filter(annot => annot.page == pageNum)
        .forEach(annot => this.render(annot));
    });
  }

  render(annot: EmbeddedResource) {
    const annotsLayerEl = this.annotator.getOrAttachLayerEl(annot.page);
    annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdfjs-annotation__embed`)
      .forEach((el: any) => el.remove());

    const degree = rotation(this.pdfjs);
    const bound = rotateRect(degree, true, annot.bound as any);
    const embedEl = htmlToElements(
      `<div data-annotation-id="${annot.id}" 
        data-analytic-id="embedded-resource-${annot.id}"
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
      const iframeEl = htmlToElements(
        `<iframe src="${annot.resource}" style="border: none; background-color: white;"></iframe>`);
      embedEl.appendChild(iframeEl);
      this.fitIframeToParent(embedEl);
      embedEl.style.backgroundColor = 'lightgray';
    } else if (annot.thumbnail) {
      const thumbEl = htmlToElements(
        `<img src="${annot.thumbnail}" draggable="false" style="width: 80%; height: 80%; object-fit: contain;" />`);
      embedEl.appendChild(thumbEl);
    }
  }

  fitIframeToParent(annotEl: HTMLElement) {
    const iframe = annotEl.querySelector('iframe') as HTMLIFrameElement;
    if (iframe == null)
      return;

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