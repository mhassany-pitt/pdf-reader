import {
  getPageEl, relativeToPageEl,
  WHRect, isLeftClick, getOrParent, getPageNum
} from './annotator-utils';

export class PdfMoveElements {

  private registry: any;

  private el: any;
  private pageEl: any;
  private resizing: any;
  private startBound: any;
  private offsetBound: any;
  private lastBound: any;

  constructor({ registry }) {
    this.registry = registry;

    this._onMouseDown();
    this._onMouseMove();
    this._onMouseUp();
  }

  private _getDocument() { return this.registry.getDocument(); }

  private _onMouseDown() {
    this._getDocument().addEventListener("mousedown", ($event: any) => {
      const el = getOrParent($event, 'pdf-movable-el');
      const excluded = getOrParent($event, 'pdf-movable-el-excluded');
      if (isLeftClick($event) && el && !excluded) {
        this.el = el;
        this.pageEl = getPageEl(el);
        this.startBound = el?.getBoundingClientRect();
        this.offsetBound = el ? {
          top: $event.clientY - this.startBound.top,
          left: $event.clientX - this.startBound.left
        } : null;

        this.resizing = el
          && (el.offsetHeight - this.offsetBound.top) <= 16
          && (el.offsetWidth - this.offsetBound.left) <= 16;

        const callback = this.registry.get(`${this.el.getAttribute('data-movable-type')}-move-elements`)
        callback?.('moving-started', { id: this.el.getAttribute('data-annotation-id'), rect: this.lastBound });
      }
    });
  }

  private _onMouseMove() {
    this._getDocument().addEventListener("mousemove", ($event: any) => {
      const el = this.el;
      if (isLeftClick($event) && el) {
        if (this.resizing) {
          this.lastBound = relativeToPageEl({
            top: this.startBound.top,
            left: this.startBound.left,
            right: $event.clientX,
            bottom: $event.clientY,
            width: parseFloat((el.style.width).replace('px', '')),
            height: parseFloat((el.style.height).replace('px', '')),
          } as any, this.pageEl);
        } else { // isMoving
          const top = $event.clientY - this.offsetBound.top;
          const left = $event.clientX - this.offsetBound.left;
          this.lastBound = relativeToPageEl({
            top, left,
            right: left + this.startBound.width,
            bottom: top + this.startBound.height,
            height: this.startBound.height,
            width: this.startBound.width,
          } as any, this.pageEl);
        }

        el.style.top = `${this.lastBound.top}%`;
        el.style.left = `${this.lastBound.left}%`;
        el.style.right = `${this.lastBound.right}%`;
        el.style.bottom = `${this.lastBound.bottom}%`;

        const callback = this.registry.get(`${this.el.getAttribute('data-movable-type')}-move-elements`)
        callback?.('moving', { id: this.el.getAttribute('data-annotation-id'), rect: this.lastBound });
      }
    });
  }

  private _onMouseUp() {
    this._getDocument().addEventListener("mouseup", ($event: any) => {
      if (this.el && this.lastBound) {
        const callback = this.registry.get(`${this.el.getAttribute('data-movable-type')}-move-elements`)
        callback?.('moving-completed', { id: this.el.getAttribute('data-annotation-id'), rect: this.lastBound });
      }

      this.el = null;
      this.pageEl = null;
      this.lastBound = null;
    });
  }
}
