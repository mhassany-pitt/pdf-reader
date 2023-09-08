import {
  getPageEl, relativeToPageEl,
  WHRect, isLeftClick, getOrParent, getPageNum
} from './annotator-utils';

export class PdfMoveElements {

  private registry: any;

  private movingEl: any;
  private pageEl: any;
  private pageNum: any;
  private down: boolean = false;
  private moving: boolean = false;
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
      const movingEl = getOrParent($event, 'pdf-movable-el');
      const excluded = getOrParent($event, 'pdf-movable-el-excluded');
      if (isLeftClick($event) && movingEl && !excluded) {
        this.movingEl = movingEl;
        this.pageEl = getPageEl(movingEl);
        this.pageNum = getPageNum(this.pageEl);
        this.startBound = movingEl?.getBoundingClientRect();
        this.offsetBound = movingEl ? {
          top: $event.clientY - this.startBound.top,
          left: $event.clientX - this.startBound.left
        } : null;

        this.resizing = movingEl
          && (movingEl.offsetHeight - this.offsetBound.top) <= 16
          && (movingEl.offsetWidth - this.offsetBound.left) <= 16;

        this.down = true;
      }
    });
  }

  private _onMouseMove() {
    this._getDocument().addEventListener("mousemove", ($event: any) => {
      const movingEl = this.movingEl;
      if (isLeftClick($event) && movingEl) {
        if (this.down && !this.moving) {
          // only when mouse is down and moving, it is considered as moving
          const callback = this.registry.get(`${this.movingEl.getAttribute('data-movable-type')}-move-elements`)
          callback?.($event, 'moving-started', { id: this.movingEl.getAttribute('data-annotation-id'), page: this.pageNum });
        }

        if (this.resizing) {
          this.lastBound = relativeToPageEl({
            top: this.startBound.top,
            left: this.startBound.left,
            right: $event.clientX,
            bottom: $event.clientY,
            width: parseFloat((movingEl.style.width).replace('px', '')),
            height: parseFloat((movingEl.style.height).replace('px', '')),
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

        movingEl.style.top = `${this.lastBound.top}%`;
        movingEl.style.left = `${this.lastBound.left}%`;
        movingEl.style.right = `${this.lastBound.right}%`;
        movingEl.style.bottom = `${this.lastBound.bottom}%`;

        const callback = this.registry.get(`${this.movingEl.getAttribute('data-movable-type')}-move-elements`)
        callback?.($event, 'moving', { id: this.movingEl.getAttribute('data-annotation-id'), page: this.pageNum, rect: { ...this.lastBound } });
        this.moving = true;
      }
    });
  }

  private _onMouseUp() {
    this._getDocument().addEventListener("mouseup", ($event: any) => {
      if (this.movingEl && this.lastBound) {
        const callback = this.registry.get(`${this.movingEl.getAttribute('data-movable-type')}-move-elements`)
        callback?.($event, 'moving-completed', { id: this.movingEl.getAttribute('data-annotation-id'), page: this.pageNum, rect: { ...this.lastBound } });
      }

      this.down = false;
      this.moving = false;
      this.movingEl = null;
      this.pageEl = null;
      this.lastBound = null;
    });
  }
}
