import {
  getPageEl, relativeToPageEl,
  WHRect, isLeftClick, getOrParent, getPageNum
} from './annotator-utils';

export class EnableElemMovement {
  private documentEl: any;
  private storage: any;
  private embedLinkViewer: any;
  private freeformViewer: any;

  private embedEl: any;
  private freeformEl: any;
  private annotEl: any;
  private annotType: any;

  private isResizing: any;
  private startBound: any;
  private offsetBound: any;

  private timeout: any;
  private lastBound: any;

  constructor({ iframe, embedLinkViewer, freeformViewer, storage }) {
    this.documentEl = iframe?.contentDocument.documentElement;
    this.embedLinkViewer = embedLinkViewer;
    this.freeformViewer = freeformViewer;
    this.storage = storage;

    this._onMouseDown();
    this._onMouseMove();
    this._onMouseUp();
  }

  private _onMouseDown() {
    this.documentEl.addEventListener("mousedown", ($event: any) => {
      if (!isLeftClick($event)) return;

      this.embedEl = getOrParent($event, 'pdfjs-annotation__embed');
      this.freeformEl = getOrParent($event, 'pdfjs-annotation__freeform');
      this.annotEl = this.embedEl || this.freeformEl;
      this.annotType = this.annotEl == this.embedEl ? 'embed'
        : (this.annotEl == this.freeformEl ? 'freeform' : null);

      this.startBound = this.annotEl?.getBoundingClientRect();
      this.offsetBound = this.annotEl ? {
        top: $event.clientY - this.startBound.top,
        left: $event.clientX - this.startBound.left
      } : null;

      this.isResizing = this.annotEl
        && (this.annotEl.offsetHeight - this.offsetBound.top) <= 16
        && (this.annotEl.offsetWidth - this.offsetBound.left) <= 16;
    });
  }

  private _onMouseMove() {
    this.documentEl.addEventListener("mousemove", ($event: any) => {
      if (!isLeftClick($event) || !this.annotEl) return;

      const pageEl = getPageEl(this.annotEl);
      if (this.isResizing) {
        this.lastBound = relativeToPageEl({
          top: this.startBound.top,
          left: this.startBound.left,
          right: $event.clientX,
          bottom: $event.clientY,
          width: parseFloat((this.annotEl.style.width).replace('px', '')),
          height: parseFloat((this.annotEl.style.height).replace('px', '')),
        } as any, pageEl);
      } else { // isMoving
        const top = $event.clientY - this.offsetBound.top;
        const left = $event.clientX - this.offsetBound.left;
        this.lastBound = relativeToPageEl({
          top, left,
          right: left + this.startBound.width,
          bottom: top + this.startBound.height,
          height: this.startBound.height,
          width: this.startBound.width,
        } as any, pageEl);
      }

      if (this.lastBound) {
        this.annotEl.style.top = `${this.lastBound.top}%`;
        this.annotEl.style.left = `${this.lastBound.left}%`;
        this.annotEl.style.right = `${this.lastBound.right}%`;
        this.annotEl.style.bottom = `${this.lastBound.bottom}%`;
      }

      if (this.timeout) clearTimeout(this.timeout);
      this.timeout = setTimeout(() => {
        /**/ if (this.annotType == 'embed') this.embedLinkViewer?.fitIframeToParent($event.target);
        else if (this.annotType == 'freeform') this.freeformViewer?.fitImageToParent($event.target);
      }, 300);
    });
  }

  private _onMouseUp() {
    this.documentEl.addEventListener("mouseup", ($event: any) => {
      if (isLeftClick($event) && this.annotEl && this.lastBound) {
        const annotId = this.annotEl.getAttribute('data-annotation-id') as string;
        const annot = this.storage.read(annotId);
        const pageEl = getPageEl(this.annotEl);
        const pageNum = getPageNum(pageEl);

        if (this.embedEl)
          annot.bound = this.lastBound;
        else if (this.freeformEl) {
          const { dataUrl, ...bound } = annot.freeforms[pageNum];
          annot.freeforms[pageNum] = { dataUrl, ...this.lastBound };
        }

        this.storage.update(annot);
      }

      this.annotEl = null;
      this.lastBound = null;
    });
  }
}
