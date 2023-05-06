import { Annotator } from './annotator';
import { AnnotatorPopup } from './annotator-popup';
import { AnnotationStore } from './annotator-store';
import {
  Rect, closestPageEl, createUniqueId, getPageEl, getPageNum,
  htmlToElements, relativeToPageEl, rotateRect, rotation, scale
} from './utils';

export type Freeform = {
  bound: Rect,
  dataUrl: string,
};

export type FreeformAnnotation = {
  id: string,
  type: string,
  freeforms: { [pageNum: number]: Freeform }
};

export class FreeformAnnotator {
  private window;
  private document;
  private documentEl;

  private pdfjs;
  private annotator: Annotator;
  private store: AnnotationStore;
  private popup: AnnotatorPopup;

  private enabled = false;
  private canvases: { [pageNum: number]: HTMLCanvasElement } = {};
  private canvasLineWidth = 3;
  private canvasStrokeStyle = 'black';

  constructor({ iframe, pdfjs, annotator, store, popup }) {
    this.window = iframe?.contentWindow;
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.annotator = annotator;
    this.store = store;
    this.popup = popup;

    this.annotator.registerBoundCalculator('paws-annotation__freeform',
      (pageNum: number, annot: any) => annot.freeforms[pageNum].bound);

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._attachCanvasOnMousedown();
    this._reattachCanvasOnPagechanging();
    this._registerToggleItemUI();
    this._registerStrokeSizeItemUI();
    this._registerStrokeColorItemUI();
  }

  private _disableFreeform() {
    this.enabled = false;
    this.popup.hide();

    const canvases = this.canvases;
    this.canvases = {};

    const annot = { id: createUniqueId(), type: 'freeform', freeforms: {} };

    for (const key of Object.keys(canvases)) {
      const pageNum = parseInt(key);
      const canvasEl = canvases[pageNum];
      this._rotateCanvasLayerEl(canvasEl, 0);
      const cropped = this._getCroppedCanvas(canvasEl);
      if (cropped) {
        const { canvas, ...bound } = cropped;
        annot.freeforms[pageNum] = { dataUrl: canvas.toDataURL(), bound };
      }
      canvasEl.remove();
    }

    if (Object.keys(annot.freeforms).length) {
      this.store.create(annot);
      this.render(annot);
    }
  }

  private _registerToggleItemUI() {
    this.popup.registerItemUI(($event: any) => {
      // const classList = $event.target.classList;
      if ($event.button != 2) // || !classList.contains('paws-annotation__freeform')
        return null as any;

      $event.preventDefault();
      const pageEl = closestPageEl($event.target);
      const pageBound = pageEl.getBoundingClientRect();
      this.popup.location = {
        top: `${$event.y - pageBound.y}px`,
        left: `${$event.x - pageBound.x}px`,
      };

      const containerEl = htmlToElements(`<div style="display: flex; gap: 5px;"></div>`);
      const buttonEl = htmlToElements(`<button style="flex-grow: 1;">${this.enabled ? 'disable freeform' : 'enable freeform'}</button>`);
      containerEl.appendChild(buttonEl);
      buttonEl.onclick = ($ev) => {
        if (this.enabled)
          this._disableFreeform();
        else {
          this.enabled = true;
          this.popup.hide();
        }
      }

      return containerEl;
    });
  }

  private _registerStrokeSizeItemUI() {
    this.popup.registerItemUI(($event: any) => {
      // const classList = $event.target.classList;
      if (!this.enabled || $event.button != 2) // || !classList.contains('paws-annotation__freeform')
        return null as any;

      const containerEl = htmlToElements(`<div style="display: flex; gap: 5px;"></div>`);
      ["thin,100,1", "normal,normal,3", "thick,900,5"].forEach(strokeSize => {
        const parts = strokeSize.split(',');
        const buttonEl = htmlToElements(`<button style="flex-grow: 1; font-weight: ${parts[1]};">${parts[0]}</button>`);
        containerEl.appendChild(buttonEl);
        buttonEl.onclick = ($ev) => {
          this.canvasLineWidth = parseInt(parts[2]);
          this.popup.hide();
        }
      });

      return containerEl;
    });
  }

  private _registerStrokeColorItemUI() {
    this.popup.registerItemUI(($event: any) => {
      // const classList = $event.target.classList;
      if (!this.enabled || $event.button != 2) // || !classList.contains('paws-annotation__freeform')
        return null as any;

      const containerEl = htmlToElements(`<div style="display: flex; gap: 5px;"></div>`);
      ['black', 'gray', 'green', 'blue', 'red'].forEach(color => {
        const buttonEl = htmlToElements(`<button style="flex-grow: 1; background-color: ${color};">&nbsp;</button>`);
        containerEl.appendChild(buttonEl);
        buttonEl.onclick = ($ev) => {
          this.canvasStrokeStyle = color;
          this.popup.hide();
        }
      });
      return containerEl;
    });
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/annotator-freeform.css" />`
    ));
  }

  private _attachCanvasOnMousedown() {
    this.document.addEventListener('mousedown', ($event: any) => {
      if (this.enabled && $event.button === 0) {
        const pageEl = closestPageEl($event.target);
        if (!pageEl)
          return;

        const pageNum = getPageNum(pageEl);
        if (!(pageNum in this.canvases)) {
          const canvasEl = this._getOrAttachCanvasEl(pageNum);
          this.canvases[pageNum] = canvasEl;
          this._enableFreeform(canvasEl);
          canvasEl?.dispatchEvent(new MouseEvent($event.type, $event));
        }
      }
    });
  }

  private _reattachCanvasOnPagechanging() {
    this.pdfjs.eventBus.on('pagechanging',
      ($event: any) => this._reattachCanvasEl($event.pageNumber));
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pagerendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.annotator.getOrAttachAnnotLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.paws-annotation__freeform').forEach((el: any) => el.remove());

      (this.store.list() as FreeformAnnotation[])
        .filter(ant => ant.type == 'freeform')
        .filter(annot => Object.keys(annot.freeforms)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(ant => this.render(ant));

      this._reattachCanvasEl(pageNum);
    });
  }

  private _reattachCanvasEl(pageNum: number) {
    if (this.enabled) {
      const pageEl = getPageEl(this.documentEl, pageNum);
      if (pageNum in this.canvases && !this._getCanvasEl(pageEl)) {
        const canvasEl = this.canvases[pageNum];
        this._rotateCanvasLayerEl(canvasEl);
        pageEl.appendChild(canvasEl);
      }
    }
  }

  private _getCanvasEl(pageEl: HTMLElement) {
    return pageEl.querySelector('.paws-annotation-freeform-canvas');
  }

  private _getOrAttachCanvasEl(pageNum: number): HTMLCanvasElement {
    const pageEl = getPageEl(this.documentEl, pageNum);
    if (!pageEl.querySelector('.paws-annotation-freeform-canvas'))
      pageEl.appendChild(htmlToElements(`<canvas class="paws-annotation-freeform-canvas"></canvas>`));
    return pageEl.querySelector('.paws-annotation-freeform-canvas');
  }

  private _rotateCanvas(canvasEl: HTMLCanvasElement, rotationAngle: number) {
    if (rotationAngle == 0)
      return;

    let $canvasEl = this.document.createElement('canvas');
    const flipSides = rotationAngle % 180 !== 0;
    $canvasEl.width = flipSides ? canvasEl.height : canvasEl.width;
    $canvasEl.height = flipSides ? canvasEl.width : canvasEl.height;

    const $context = $canvasEl.getContext('2d') as CanvasRenderingContext2D;
    if (rotationAngle == 90) $context.translate($canvasEl.width, 0);
    if (rotationAngle == 180)
      $context.translate($canvasEl.width, $canvasEl.height);
    if (rotationAngle == 270) $context.translate(0, $canvasEl.height);
    $context.rotate((rotationAngle * Math.PI) / 180);
    $context.drawImage(canvasEl, 0, 0);

    const context = canvasEl.getContext('2d') as CanvasRenderingContext2D;
    context.clearRect(0, 0, canvasEl.width, canvasEl.height);
    canvasEl.width = $canvasEl.width;
    canvasEl.height = $canvasEl.height;
    context.drawImage($canvasEl, 0, 0);
  }

  private ـangleDiff(angle1: number, angle2: number) {
    const angles = [0, 90, 180, 270];
    return angles[(angles.indexOf(angle2) - angles.indexOf(angle1) + angles.length) % angles.length];
  }

  private _rotateCanvasLayerEl(canvasEl: HTMLCanvasElement, angle?: number) {
    const newAngle = angle === undefined ? rotation(this.pdfjs) : angle;
    const prevAngle = parseFloat(canvasEl.getAttribute('data-rotation') || '0');
    this._rotateCanvas(canvasEl, this.ـangleDiff(prevAngle, newAngle));
    canvasEl.setAttribute('data-rotation', `${newAngle}`);
  }

  private _enableFreeform(canvasEl: HTMLCanvasElement) {
    const context = canvasEl.getContext('2d') as CanvasRenderingContext2D;

    // scale width/height
    const scaleFactor = 1 / scale(this.pdfjs);
    const pageElStyle = getComputedStyle(canvasEl.parentElement as HTMLElement);
    const width = scaleFactor * parseFloat(pageElStyle.width.replace('px', ''));
    const height = scaleFactor * parseFloat(pageElStyle.height.replace('px', ''));

    // flip width/height
    const rotationAngle = rotation(this.pdfjs);
    const flipSides = rotationAngle % 180 !== 0;
    canvasEl.width = flipSides ? height : width;
    canvasEl.height = flipSides ? width : height;

    context.lineJoin = 'round';
    context.lineCap = 'round';

    this._rotateCanvasLayerEl(canvasEl);

    let drawing = false;
    canvasEl.onmouseup = ($event) => drawing = false;
    canvasEl.onmousedown = ($event) => {
      if ($event.button === 0) {
        drawing = true;
        context.beginPath();
        const scaleFactor = 1 / scale(this.pdfjs);
        context.moveTo(scaleFactor * $event.offsetX, scaleFactor * $event.offsetY);
        context.lineWidth = this.canvasLineWidth;
        context.strokeStyle = this.canvasStrokeStyle;
      }
    };
    canvasEl.onmousemove = ($event) => {
      if (drawing && $event.button === 0) {
        const scaleFactor = 1 / scale(this.pdfjs);
        context.lineTo(scaleFactor * $event.offsetX, scaleFactor * $event.offsetY);
        context.stroke();
      }
    };
  }

  private _getCroppedCanvas(canvasEl: HTMLCanvasElement) {
    const canvasWidth = canvasEl.width;
    const canvasHeight = canvasEl.height;
    const context = canvasEl.getContext('2d') as CanvasRenderingContext2D;
    const content = context.getImageData(0, 0, canvasWidth, canvasHeight).data;

    let left = canvasEl.width;
    let top = canvasEl.height;
    let right = 0;
    let bottom = 0;
    for (let i = 0; i < content.length; i += 4) {
      const x = (i / 4) % canvasEl.width;
      const y = Math.floor((i / 4) / canvasEl.width);
      if (content[i + 3] > 0) {
        left = Math.min(x, left);
        right = Math.max(x, right);
        top = Math.min(y, top);
        bottom = Math.max(y, bottom);
      }
    }
    const width = right - left + 1;
    const height = bottom - top + 1;

    const $canvasEl = this.document.createElement('canvas');
    $canvasEl.width = width;
    $canvasEl.height = height;
    const $context = $canvasEl.getContext('2d') as CanvasRenderingContext2D;
    $context.putImageData(context.getImageData(left, top, width, height), 0, 0);

    return {
      left: parseFloat((left / canvasWidth * 100).toFixed(3)),
      top: parseFloat((top / canvasHeight * 100).toFixed(3)),
      right: parseFloat(((canvasWidth - right - 1) / canvasWidth * 100).toFixed(3)),
      bottom: parseFloat(((canvasHeight - bottom - 1) / canvasHeight * 100).toFixed(3)),
      canvas: $canvasEl
    };
  }

  render(annot: FreeformAnnotation) {
    Object.keys(annot.freeforms)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = this.annotator.getOrAttachAnnotLayerEl(pageNum);
        annotsLayerEl.querySelectorAll(`[paws-annotation-id="${annot.id}"].paws-annotation__freeform`)
          .forEach((el: any) => el.remove());

        const degree = rotation(this.pdfjs);
        const freeform = annot.freeforms[pageNum];
        const bound = rotateRect(degree, true, freeform.bound);

        const boundEl = htmlToElements(
          `<div paws-annotation-id="${annot.id}" 
          class="paws-annotation__freeform"
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

        boundEl.appendChild(image);
        annotsLayerEl.appendChild(boundEl);

        const computedStyle = getComputedStyle(boundEl);
        image.style.width = degree == 90 || degree == 270 ? computedStyle.height : computedStyle.width;
        image.style.height = degree == 90 || degree == 270 ? computedStyle.width : computedStyle.height;
      });
  }
}