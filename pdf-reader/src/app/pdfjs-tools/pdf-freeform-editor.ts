import {
  getPageEl, getPageNum, htmlToElements,
  isLeftClick, removeSelectorAll, rotation, scale, uuid
} from './pdf-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfFreeformEditor {

  private registry: PdfRegistry;

  private enabled = false;
  private canvases: { [pageNum: number]: HTMLCanvasElement } = {};
  private stroke = 3;
  private color = 'black';

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('freeform-editor', this);
    this.registry.register(`freeform-move-elements`,
      ($event, action, payload) => this._handleMoveEvents($event, action, payload));

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._attachCanvasOnMousedown();
    this._reattachCanvasOnPagechanging();
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getStorage() { return this.registry.get('storage'); }
  private _getAnnotLayer() { return this.registry.get('annotation-layer'); }
  private _getViewer() { return this.registry.get('freeform-viewer'); }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!this.enabled)
      this._endFreeform();
  }

  isEnabled() { return this.enabled; }
  setStroke(stroke: number) { this.stroke = stroke; }
  getStroke() { return this.stroke; }
  setColor(color: string) { this.color = color; }
  getColor() { return this.color; }

  private _handleMoveEvents($event, action: string, payload: any) {
    if (action == 'moving-completed') {
      const { top, left, right, bottom, width, height } = payload.rect;
      const annot = this._getStorage().read(payload.id);
      annot.freeforms[payload.page] = {
        ...annot.freeforms[payload.page],
        top, left, right, bottom, width, height
      };
      this._getStorage().update(annot);
    }
  }

  private _endFreeform() {
    const canvases = this.canvases;
    this.canvases = {};

    const annot = {
      id: uuid(),
      type: 'freeform',
      freeforms: {},
      pages: Object.keys(canvases).map(k => parseInt(k))
    };

    for (const pageNum of annot.pages) {
      const canvasEl = canvases[pageNum];
      this._rotateCanvasLayerEl(canvasEl, 0);
      const cropped = this._getCroppedCanvas(canvasEl);
      if (cropped) {
        const { canvas, ...bound } = cropped;
        annot.freeforms[pageNum] = { ...bound, dataUrl: canvas.toDataURL() };
      }
      canvases[pageNum].remove();
    }

    if (Object.keys(annot.freeforms).length) {
      this._getStorage().create(annot, () => this._getViewer().render(annot));
    }
  }

  private _attachCanvasOnMousedown() {
    this._getDocument().addEventListener('mousedown', ($event: any) => {
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
    this._getPdfJS().eventBus.on('pagechanging',
      ($event: any) => this._reattachCanvasEl($event.pageNumber));
  }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(pageNum);
      removeSelectorAll(annotsLayerEl, '.pdf-annotation__freeform-canvas');

      this._reattachCanvasEl(pageNum);
    });
  }

  private _reattachCanvasEl(pageNum: number) {
    if (this.enabled) {
      const pageEl = getPageEl(this._getDocumentEl(), pageNum);
      if (pageNum in this.canvases && !this._getCanvasEl(pageEl)) {
        const canvasEl = this.canvases[pageNum];
        this._rotateCanvasLayerEl(canvasEl);
        pageEl.appendChild(canvasEl);
      }
    }
  }

  private _getCanvasEl(pageEl: HTMLElement) {
    return pageEl.querySelector('.pdf-annotation__freeform-canvas');
  }

  private _getOrAttachCanvasEl(pageNum: number): HTMLCanvasElement {
    const pageEl = getPageEl(this._getDocumentEl(), pageNum);
    if (!pageEl.querySelector('.pdf-annotation__freeform-canvas'))
      pageEl.appendChild(htmlToElements(`<canvas class="pdf-annotation__freeform-canvas"></canvas>`));
    return pageEl.querySelector('.pdf-annotation__freeform-canvas');
  }

  private _rotateCanvas(canvasEl: HTMLCanvasElement, rotationAngle: number) {
    if (rotationAngle == 0)
      return;

    let $canvasEl = this._getDocument().createElement('canvas');
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
    const newAngle = angle === undefined ? rotation(this._getPdfJS()) : angle;
    const prevAngle = parseFloat(canvasEl.getAttribute('data-rotation') || '0');
    this._rotateCanvas(canvasEl, this._angleDiff(prevAngle, newAngle));
    canvasEl.setAttribute('data-rotation', `${newAngle}`);
  }

  private _enableFreeform(canvasEl: HTMLCanvasElement) {
    const context = canvasEl.getContext('2d') as CanvasRenderingContext2D;

    // scale width/height
    const scaleFactor = 1 / scale(this._getPdfJS());
    const pageElStyle = getComputedStyle(canvasEl.parentElement as HTMLElement);
    const width = scaleFactor * parseFloat(pageElStyle.width.replace('px', ''));
    const height = scaleFactor * parseFloat(pageElStyle.height.replace('px', ''));

    // flip width/height
    const rotationAngle = rotation(this._getPdfJS());
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
        const scaleFactor = 1 / scale(this._getPdfJS());
        context.moveTo(scaleFactor * $event.offsetX, scaleFactor * $event.offsetY);
        context.lineWidth = this.stroke;
        context.strokeStyle = this.color;
      }
    };
    canvasEl.onmousemove = ($event) => {
      if (drawing && isLeftClick($event)) {
        const scaleFactor = 1 / scale(this._getPdfJS());
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

    const $canvasEl = this._getDocument().createElement('canvas');
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

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-annotation__freeform-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: auto;
            text-size-adjust: none;
            forced-color-adjust: none;
            transform-origin: center center;
            z-index: 6;
          }
          
          .pdf-annotation-freeform__toggle-btns,
          .pdf-annotation-freeform__stroke-btns,
          .pdf-annotation-freeform__color-btns {
            display: flex;
            align-items: center;
            justify-content: space-evenly;
            column-gap: 0.125rem;
            z-index: 1;
          }
          
          .pdf-annotation-freeform__toggle-btns button,
          .pdf-annotation-freeform__stroke-btns button {
            flex-grow: 1;
          }
          
          .pdf-annotation-freeform__toggle-btns button {
            display: flex;
            align-items: center;
            column-gap: 0.25rem;
          }
          
          .pdf-annotation-freeform__color-btns button {
            height: 0.75rem;
            border-width: 1px;
            flex-grow: 1;
          }      
        </style>`
      ));
  }
}
