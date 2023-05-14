import { AnnotationStorage } from './annotator-storage';
import {
  Rect, closestPageEl, uuid, getPageNum,
  htmlToElements, isRightClick, relativeToPageEl,
  rotateRect, rotation, scale, Annotator, POPUP_ROW_ITEM_UI, WHRect, isLeftClick
} from './annotator';
import { EmbeddedLinkViewer, EmbeddedLink } from './embedded-link-viewer';

export class EmbedLink {
  private document: any;
  private documentEl: any;

  private pdfjs: any;
  private storage: AnnotationStorage<EmbeddedLink>;
  private annotator: Annotator;
  private embedLinkViewer: EmbeddedLinkViewer;

  constructor({ iframe, pdfjs, annotator, embedLinkViewer, storage }) {
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.storage = storage;
    this.annotator = annotator;
    this.embedLinkViewer = embedLinkViewer;

    this._attachStylesheet();
    this._enableMoveOnDrag();
    this._registerToggleItemUI();
    this._registerEditorItemUI();
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/embed-link.css" />`
    ));
  }

  private _registerToggleItemUI() {
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (!isRightClick($event))
        return null as any;

      $event.preventDefault();
      const containerEl = htmlToElements(`<div style="display: flex; gap: 5px;"></div>`);
      const buttonEl = htmlToElements(`<button>embed link</button>`);
      containerEl.appendChild(buttonEl);
      buttonEl.onclick = ($ev) => {
        const pageEl = closestPageEl($event.target);;
        const pageNum = getPageNum(pageEl);
        const { top, left, right, bottom } = relativeToPageEl({
          top: $event.y,
          left: $event.x,
          bottom: $event.y + 24,
          right: $event.x + 24,
          width: 24, height: 24
        } as any, pageEl);
        const annot = {
          id: uuid(),
          type: 'embed',
          bound: { top, left, right, bottom },
          page: pageNum,
          link: '',
          target: 'popup-iframe',
        };
        this.storage.create(annot);
        this.embedLinkViewer.render(annot);
        this.annotator.hidePopup();
      }

      return containerEl;
    });
  }

  private _registerEditorItemUI() {
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const embedEl = $event.target.classList.contains('pdfjs-annotation__embed')
        ? $event.target : $event.target.closest('.pdfjs-annotation__embed');

      if (embedEl) {
        const annot = this.storage.read(embedEl.getAttribute('data-annotation-id'));
        const style = getComputedStyle(embedEl);
        this.annotator.location = {
          top: `calc(100% - ${style.bottom})`,
          left: `${style.left}`,
        };

        const containerEl = htmlToElements(`<div style="display: flex; flex-flow: column;"></div>`);

        const linkInputEl = htmlToElements(
          `<input type="url" placeholder="put resource url" style="margin-bottom: 5px;" value="${annot.link}"/>`);
        containerEl.appendChild(linkInputEl);
        linkInputEl.onchange = ($ev: any) => {
          annot.link = (linkInputEl as any).value;
          this.storage.update(annot);
        };

        const random = Math.random();
        const onclick = (parent: HTMLElement, target) => {
          (parent.querySelector('input') as any).onclick = ($ev) => {
            annot.target = target;
            this.storage.update(annot);
            this.embedLinkViewer.render(annot);
          }
        }

        const inlineIframeEl = htmlToElements(
          `<div><input type="radio" name="popup" id="inline-iframe-${random}" ${annot.target == 'inline-iframe' ? 'checked' : ''}/>
                <label for="inline-iframe-${random}">embed inline</label></div>`);
        containerEl.appendChild(inlineIframeEl);
        onclick(inlineIframeEl, 'inline-iframe');

        const popupOptionEl = htmlToElements(
          `<div><input type="radio" name="popup" id="popup-iframe-${random}" ${annot.target == 'popup-iframe' ? 'checked' : ''}/>
                <label for="popup-iframe-${random}">open in popup</label></div>`);
        containerEl.appendChild(popupOptionEl);
        onclick(popupOptionEl, 'popup-iframe');

        const pageOptionEl = htmlToElements(
          `<div><input type="radio" name="popup" id="page-${random}" ${annot.target == 'page' ? 'checked' : ''}/>
                <label for="page-${random}">open in new page</label></div>`);
        containerEl.appendChild(pageOptionEl);
        onclick(pageOptionEl, 'page');

        return containerEl;
      }

      return null as any;
    });
  }

  private _enableMoveOnDrag() {
    let embedEl: HTMLElement;
    let isResizing: boolean;
    let orgBoundIn: DOMRect;
    let offset: { left: number, top: number };

    this.documentEl.addEventListener("mousedown", ($event: any) => {
      if (!isLeftClick($event))
        return;
      else if ($event.target.classList.contains('pdfjs-annotation__embed'))
        embedEl = $event.target;
      else if ($event.target.parentNode.classList.contains('pdfjs-annotation__embed'))
        embedEl = $event.target.parentNode;

      orgBoundIn = embedEl?.getBoundingClientRect();
      offset = embedEl ? { left: $event.clientX - orgBoundIn.left, top: $event.clientY - orgBoundIn.top } : null as any;
      isResizing = embedEl && (embedEl.offsetWidth - offset.left) <= 16 && (embedEl.offsetHeight - offset.top) <= 16;
    });

    let lastBound: WHRect;
    let fitIframeToParent;
    this.documentEl.addEventListener("mousemove", ($event: any) => {
      if (!isLeftClick($event) || !embedEl)
        return;

      if (isResizing) {
        lastBound = relativeToPageEl({
          top: orgBoundIn.top,
          left: orgBoundIn.left,
          bottom: $event.clientY,
          right: $event.clientX,
          width: parseFloat((embedEl.style.width).replace('px', '')),
          height: parseFloat((embedEl.style.height).replace('px', '')),
        } as any, closestPageEl(embedEl));
      } else { // isMoving
        const left = $event.clientX - offset.left;
        const top = $event.clientY - offset.top;
        lastBound = relativeToPageEl({
          top,
          left,
          bottom: top + orgBoundIn.height,
          right: left + orgBoundIn.width,
          height: orgBoundIn.height,
          width: orgBoundIn.width,
        } as any, closestPageEl(embedEl));
        embedEl.style.top = `${lastBound.top}%`;
        embedEl.style.left = `${lastBound.left}%`;
        embedEl.style.right = `${lastBound.right}%`;
        embedEl.style.bottom = `${lastBound.bottom}%`;
      }

      if ($event.target.classList.contains('pdfjs-annotation__embed')) {
        if (fitIframeToParent) clearTimeout(fitIframeToParent);
        fitIframeToParent = setTimeout(() => this.embedLinkViewer.fitIframeToParent($event.target), 10);
      }
    });

    this.documentEl.addEventListener("mouseup", ($event: any) => {
      if (isLeftClick($event) && embedEl && lastBound) {
        const annotId = embedEl.getAttribute('data-annotation-id') as string;
        const annot = this.storage.read(annotId);
        annot.bound = lastBound;
        this.storage.update(annot);
      }
      embedEl = null as any;
    });
  }
}