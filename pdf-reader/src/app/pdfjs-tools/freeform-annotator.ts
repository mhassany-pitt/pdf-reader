import { AnnotationStorage } from './annotator-storage';
import {
  getPageEl, uuid, getPageNum, htmlToElements,
  isLeftClick, isRightClick, rotation, scale,
} from './annotator-utils';
import { Annotator, POPUP_ROW_ITEM_UI } from './annotator';
import { Freeform, FreeformViewer } from './freeform-viewer';

export class FreeformAnnotator {
  private document: any;
  private documentEl: any;

  private pdfjs: any;
  private annotator: Annotator;
  private freeformViewer: FreeformViewer;
  private storage: AnnotationStorage<Freeform>;
  private configs;

  private enabled = false;
  private canvases: { [pageNum: number]: HTMLCanvasElement } = {};
  private canvasLineWidth = 3;
  private canvasStrokeStyle = 'black';

  constructor({ iframe, pdfjs, annotator, freeformViewer, storage, configs }) {
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.storage = storage;
    this.annotator = annotator;
    this.freeformViewer = freeformViewer;
    this.configs = configs;

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._attachCanvasOnMousedown();
    this._reattachCanvasOnPagechanging();
    this._registerToggleItemUI();
    this._registerStrokeSizeItemUI();
    this._registerStrokeColorItemUI();
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/freeform-annotator.css" />`
    ));
  }

  private _endFreeform() {
    this.enabled = false;
    this.annotator.hidePopup();

    const canvases = this.canvases;
    this.canvases = {};

    const annot: Freeform = { id: uuid(), type: 'freeform', freeforms: {} };

    for (const key of Object.keys(canvases)) {
      const pageNum = parseInt(key);
      const canvasEl = canvases[pageNum];
      this._rotateCanvasLayerEl(canvasEl, 0);
      const cropped = this._getCroppedCanvas(canvasEl);
      if (cropped) {
        const { canvas, ...bound } = cropped;
        annot.freeforms[pageNum] = { ...bound, dataUrl: canvas.toDataURL() };
      }
      canvasEl.remove();
    }

    if (Object.keys(annot.freeforms).length) {
      this.storage.create(annot, () => {
        this.freeformViewer.render(annot);
      });
    }
  }

  private _registerToggleItemUI() {
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (!isRightClick($event))
        return null as any;

      const containerEl = htmlToElements(
        `<div class="pdfjs-annotation-freeform__toggle-btns"></div>`);

      const buttonEl = htmlToElements(
        `<button type="button" class="pdfjs-annotation-freeform__${this.enabled ? 'end-btn' : 'start-btn'}">
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABFElEQVR4AWJwL/ChCJOugQFQOR1AdAxEcRzfrtWomCBBABCAJBCJgAAgNQgwAAgAAklMCFYqQAABEBFIEkgLVkoCIUCo73jLz22HHh//7dn73e5vF42YuBdAuVZgMG71ntcH5DoJDVMlzga3QM1iIvRW1BHuzflfgKQf4gvb3X5luMKTBH+j6L0yNYMGa9KrUGPM7ndwi2ldfRSLyPGBZeuf4FGGd/GCTLewhRo3uMKm9U+9lffQYFwWjebxiiXvzytxh9Tu9/Gsw/YbrePBG17AD1bt/mBouAtIcYl3FNYsLOANF6gxqcMdXTXHhl0fW8AnrpHpsNIvUJtzWMGUnoHwYbJ0OST+Z+z+dRophwROAgf9Av3htycKGTnjAAAAAElFTkSuQmCC"/>
          <span>${this.enabled ? 'End Freehand' : 'Start Freehand'}<span>
        </button>`);
      containerEl.appendChild(buttonEl);
      buttonEl.onclick = ($ev) => {
        if (this.enabled)
          this._endFreeform();
        else {
          this.enabled = true;
          this.annotator.hidePopup();
        }
      }

      return containerEl;
    });
  }

  private _registerStrokeSizeItemUI() {
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (!this.enabled || !isRightClick($event))
        return null as any;

      const containerEl = htmlToElements(
        `<div class="pdfjs-annotation-freeform__stroke-btns"></div>`);

      this.configs.freeform_stroke_sizes.split(',').forEach(strokeSize => {
        const parts = strokeSize.split('-');
        const buttonEl = htmlToElements(
          `<button type="button" class="pdfjs-annotation-freeform__stroke-btn--${parts[0]}">
            ${parts[0]}
          </button>`);
        containerEl.appendChild(buttonEl);
        buttonEl.onclick = ($ev) => {
          this.canvasLineWidth = parseInt(parts[1]);
          this.annotator.hidePopup();
        }
      });

      return containerEl;
    });
  }

  private _registerStrokeColorItemUI() {
    this.annotator.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (!this.enabled || !isRightClick($event))
        return null as any;

      const containerEl = htmlToElements(
        `<div class="pdfjs-annotation-freeform__color-btns"></div>`);

      this.configs.freeform_colors.split(',').forEach(color => {
        const buttonEl = htmlToElements(
          `<button type="button" class="pdfjs-annotation-freeform__color-btn--${color}" 
            style="flex-grow: 1; background-color: ${color};">&nbsp;</button>`);
        containerEl.appendChild(buttonEl);
        buttonEl.onclick = ($ev) => {
          this.canvasStrokeStyle = color;
          this.annotator.hidePopup();
        }
      });

      return containerEl;
    });
  }

  private _attachCanvasOnMousedown() {
    this.document.addEventListener('mousedown', ($event: any) => {
      if (this.enabled && isLeftClick($event)) {
        const pageEl = getPageEl($event.target);
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
    return pageEl.querySelector('.pdfjs-annotation-freeform-canvas');
  }

  private _getOrAttachCanvasEl(pageNum: number): HTMLCanvasElement {
    const pageEl = getPageEl(this.documentEl, pageNum);
    if (!pageEl.querySelector('.pdfjs-annotation-freeform-canvas'))
      pageEl.appendChild(htmlToElements(`<canvas class="pdfjs-annotation-freeform-canvas"></canvas>`));
    return pageEl.querySelector('.pdfjs-annotation-freeform-canvas');
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

  private _angleDiff(angle1: number, angle2: number) {
    const angles = [0, 90, 180, 270];
    return angles[(angles.indexOf(angle2) - angles.indexOf(angle1) + angles.length) % angles.length];
  }

  private _rotateCanvasLayerEl(canvasEl: HTMLCanvasElement, angle?: number) {
    const newAngle = angle === undefined ? rotation(this.pdfjs) : angle;
    const prevAngle = parseFloat(canvasEl.getAttribute('data-rotation') || '0');
    this._rotateCanvas(canvasEl, this._angleDiff(prevAngle, newAngle));
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
      if (isLeftClick($event)) {
        drawing = true;
        context.beginPath();
        const scaleFactor = 1 / scale(this.pdfjs);
        context.moveTo(scaleFactor * $event.offsetX, scaleFactor * $event.offsetY);
        context.lineWidth = this.canvasLineWidth;
        context.strokeStyle = this.canvasStrokeStyle;
      }
    };
    canvasEl.onmousemove = ($event) => {
      if (drawing && isLeftClick($event)) {
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
      width: parseFloat((width / canvasWidth * 100).toFixed(3)),
      height: parseFloat((height / canvasHeight * 100).toFixed(3)),
      canvas: $canvasEl
    };
  }
}