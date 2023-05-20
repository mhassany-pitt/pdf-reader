import { AnnotationStorage } from './annotator-storage';
import {
  WHRect, closestPageEl, getBound,
  getPageEl, getPageNum, getSelectionRects, htmlToElements,
  isLeftClick, isRightClick, rotateRect,
  rotation, uuid
} from './annotator-utils';

// -- annotator

export const POPUP_ROW_ITEM_UI = 'POPUP_ROW_ITEM_UI';
export const GET_ANNOTATION_BOUND = 'GET_ANNOTATION_BOUND';

export type Annotation = {
  id: string,
  type: string,
  color?: string,
  rects: { [pageNum: number]: WHRect[] },
  note?: string
}

type Location = {
  top: string,
  left: string,
  width?: string,
  height?: string
};

export type GetAnnotationBound = {
  className: string,
  getBound: (pageNum: number, annot: any) => WHRect,
};

export class Annotator {
  private window: any;
  private document: any;
  private documentEl: any;

  private pdfjs: any;
  private storage: AnnotationStorage<Annotation>;

  private selected: any;
  private pending: any;

  location: Location = null as any;

  private callbacks: { [type: string]: ((...args: any) => any)[] } = {};
  register(type: string, callback: (...args: any) => any) {
    if (!this.callbacks[type])
      this.callbacks[type] = [];
    this.callbacks[type].push(callback);
  }
  unregister(type: string, callback: (...args: any) => any) {
    const index = this.callbacks[type]?.indexOf(callback);
    if (index > -1) this.callbacks[type].splice(index, 1);
  }

  // private boundGetters: {
  //   [className: string]: (pageNum: number, annot: any) => WHRect
  // } = {};

  onTextSelection = ($event: any) => {
    const rects = getSelectionRects(this.document, this.pdfjs);
    if (rects && Object.keys(rects).length) {
      const annot = { id: uuid(), type: 'highlight', rects };
      this.storage.create(annot);
      this.render(annot);
      this.clearSelection();
    }
  };

  constructor({ iframe, pdfjs, storage }) {
    this.window = iframe?.contentWindow;
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.storage = storage;

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._setupOnTextSelection();
    this._toggleBoundaryOnClick();
    this._removeOnKeyBkSpaceOrDelete();
    this._registerGetAnnotRectBound();
    // -- popup
    this._setupPopupOnMouseMove();
    this._setupPopupOnTextSelection();
    this._setupPopupOnClick();
    this._setupPopupOnContextMenu();
    this._hideOnKeyBkSpaceOrDelete();
    // -- popup row items
    this.register('hide', () => this.pending = null);
    this._registerPopupToBeAnnotItemUI(); // <-- should be called first
    this._registerPopupAnnotTypeItemUI();
    this._registerPopupAnnotColorItemUI();
    this._registerPopupAnnotNoteItemUI();
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/annotator.css" />`
    ));
  }

  private _registerGetAnnotRectBound() {
    this.register(GET_ANNOTATION_BOUND, (pageNum, annot) => ({
      className: 'pdfjs-annotation__rect',
      getBound: (pageNum, annot) => getBound(annot.rects[pageNum])
    }) as GetAnnotationBound);
  }

  private _removeOnKeyBkSpaceOrDelete() {
    this.document.addEventListener('keydown', ($event: any) => {
      if (this.selected
        && $event.key == 'Delete' || $event.key == 'Backspace'
        && $event.target.classList.contains('pdfjs-annotation__bound')) {
        this.documentEl.querySelectorAll(`.pdfjs-annotations [data-annotation-id="${this.selected.id}"]`)
          .forEach((el: any) => el.remove());
        this.storage.delete(this.selected);
        this.selected = null;
      }
    });
  }

  private _setupOnTextSelection() {
    let down = false, dragging = false;
    this.document.addEventListener('mousedown', ($event: any) => {
      if (isLeftClick($event))
        down = true;
    });
    this.document.addEventListener('mousemove', ($event: any) => {
      if (isLeftClick($event))
        dragging = down;
    });

    const handle = ($event: any) => {
      down = false;
      if (dragging && this.onTextSelection)
        this.onTextSelection($event)
    };

    this.document.addEventListener('mouseup', ($event: any) => {
      if (isLeftClick($event))
        handle($event);
    });
    this.document.addEventListener('dblclick', ($event: any) => {
      dragging = true;
      handle($event);
    });
  }

  private _toggleBoundaryOnClick() {
    this.document.addEventListener('click', ($event: any) => {
      const pageEl = closestPageEl($event.target);
      if (!pageEl)
        return;

      const classList = $event.target.classList;

      // remove boundaries if clicked outside one
      if (!classList.contains('pdfjs-annotation__bound')) {
        pageEl.querySelectorAll(`.pdfjs-annotation__bound`).forEach((el: any) => el.remove());
        this.selected = null;
      }

      // show the boundary for the clicked rect
      const annotationBounds: GetAnnotationBound[] = (
        this.callbacks[GET_ANNOTATION_BOUND] || []).map(callback => callback($event));

      for (const annotationBound of annotationBounds) {
        const className = annotationBound.className;
        const targetEl = classList.contains(className)
          ? $event.target
          : $event.target.closest(`.${className}`);

        if (targetEl) {
          this.selected = this.storage.read(targetEl.getAttribute('data-annotation-id'));
          const pageNum = parseInt(pageEl.getAttribute('data-page-number') || '');
          const annotBound = annotationBound.getBound(pageNum, this.selected);
          this.showBoundary(pageNum, this.selected, annotBound);
        }
      }
    });
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pagerendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.getOrAttachLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__rect').forEach((el: any) => el.remove());
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__bound').forEach((el: any) => el.remove());
      annotsLayerEl.setAttribute('data-rotation-degree', rotation(this.pdfjs));

      // current page and only annotations with rects
      (this.storage.list() as Annotation[])
        .filter(annot => annot.rects)
        .filter(annot => Object.keys(annot.rects)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(annot => this.render({ ...annot, rects: { [pageNum]: annot.rects[pageNum] } }));
    });
  }

  clearSelection() {
    this.window.getSelection().removeAllRanges();
  }

  getOrAttachLayerEl(pageNum: number) {
    const pageEl = getPageEl(this.documentEl, pageNum);
    if (!pageEl.querySelector('.pdfjs-annotations'))
      pageEl.appendChild(htmlToElements(`<div class="pdfjs-annotations"></div>`));
    return pageEl.querySelector('.pdfjs-annotations');
  }

  showBoundary(pageNum: number, annot: Annotation, boundRect: WHRect) {
    boundRect = rotateRect(rotation(this.pdfjs), true, boundRect);

    const boundEl = htmlToElements(
      `<div data-annotation-id="${annot.id}"
        class="pdfjs-annotation__bound" 
        tabindex="-1"
        style="
          top: calc(${boundRect.top}% - 1px);
          bottom: calc(${boundRect.bottom}% - 1px);
          left: calc(${boundRect.left}% - 1px);
          right: calc(${boundRect.right}% - 1px);
        ">
      </div>`
    );

    this.getOrAttachLayerEl(pageNum).appendChild(boundEl);
    boundEl.focus();
  }

  render(annot: Annotation) {
    Object.keys(annot.rects)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = this.getOrAttachLayerEl(pageNum);

        annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdfjs-annotation__rect`)
          .forEach((el: any) => el.remove());

        const degree = rotation(this.pdfjs);
        const rects: WHRect[] = annot.rects[pageNum];
        rects.forEach(rect => {
          rect = rotateRect(degree, true, rect);
          const rectEl = htmlToElements(
            `<div data-annotation-id="${annot.id}" 
              data-analytic-id="annot${annot.type ? '-' + annot.type : ''}-${annot.id}"
              class="pdfjs-annotation__rect ${annot.type ? 'pdfjs-annotation__' + annot.type : ''}" 
              style="
                top: calc(${rect.top}% + 1px);
                bottom: calc(${rect.bottom}% + 1px);
                left: ${rect.left}%;
                right: ${rect.right}%;
                --annotation-color: ${annot.color || 'rgb(255, 212, 0)'};
              ">
            </div>`
          );

          annotsLayerEl.appendChild(rectEl);
        })
      });
  }

  // -- annotator popup 

  getOrAttachPopupLayerEl(pageEl: HTMLElement) {
    if (!pageEl.querySelector('.pdfjs-annotation-popup'))
      pageEl.appendChild(htmlToElements(`<div class="pdfjs-annotation-popup"></div>`));
    return pageEl.querySelector('.pdfjs-annotation-popup') as HTMLElement;
  }

  private _hideOnKeyBkSpaceOrDelete() {
    this.document.addEventListener('keydown', ($event: any) => {
      if (($event.key == 'Delete' || $event.key == 'Backspace')
        && $event.target.classList.contains('pdfjs-annotation__bound'))
        this.hidePopup();
    });
  }

  private _setupPopupOnTextSelection() {
    this.onTextSelection = ($event: any) => this._preparePopupRowItemUIs($event);
  }

  private _setupPopupOnClick() {
    this.document.addEventListener('click', ($event: any) => {
      const rowItemUIs = this._preparePopupRowItemUIs($event);
      if (rowItemUIs.length < 1 // hide popup if clicked outside it
        && !$event.target.classList.contains('pdfjs-annotation-popup__container')
        && !$event.target.closest('.pdfjs-annotation-popup__container'))
        this.hidePopup();
    });
  }

  private _setupPopupOnContextMenu() {
    this.document.addEventListener('contextmenu', ($event: any) => {
      const pageEl = closestPageEl($event.target);
      if (pageEl) {
        const pageBound = pageEl.getBoundingClientRect();
        this.location = {
          top: `${$event.y - pageBound.y}px`,
          left: `${$event.x - pageBound.x}px`,
        };
        this._preparePopupRowItemUIs($event);
      }
    });
  }

  private _preparePopupRowItemUIs($event: any) {
    const pageEl = closestPageEl($event.target);
    if (!pageEl)
      return [];


    const callbacks = this.callbacks[POPUP_ROW_ITEM_UI] || [];
    const rowItemUIs = callbacks.map(callback => callback($event)).filter(rowItemEl => rowItemEl);
    if (rowItemUIs.length)
      this.showPopup(pageEl, rowItemUIs, $event);

    return rowItemUIs;
  }

  hidePopup() {
    this.location = null as any;
    const popupEl = this.documentEl.querySelector('.pdfjs-annotation-popup');
    popupEl?.remove();
    this.callbacks['hide']?.forEach(callback => callback());
  }

  showPopup(pageEl: HTMLElement, elements: HTMLElement[], $event: any) {
    const location = this.location;
    const styles = getComputedStyle($event.target);
    const top = location ? location.top : `calc(${styles.top} + ${styles.height})`;
    const left = location ? location.left : `${styles.left}`;
    const width = (location ? location.width : null) || 'fit-content';
    const height = (location ? location.height : null) || 'fit-content';

    const popupEl = htmlToElements(
      `<div class="pdfjs-annotation-popup__container" style="
          top: ${top};
          left: ${left};
          width: ${width};
          height: ${height};
        ">
      </div>`);

    const popupLayerEl = this.getOrAttachPopupLayerEl(pageEl);
    popupLayerEl.replaceChildren();
    popupLayerEl.appendChild(popupEl);
    elements.forEach(rowItemUI => popupEl.appendChild(rowItemUI));
    this.callbacks['show']?.forEach(callback => callback());
  }

  // move popup on mouse move
  private _setupPopupOnMouseMove() {
    var isdragging = false;
    var offset = { left: 0, top: 0 };
    var popupContainerEl: HTMLElement;
    this.document.addEventListener('mousedown', function ($event) {
      popupContainerEl = !$event.target.classList.contains('pdfjs-annotation-popup__container')
        ? $event.target.closest('.pdfjs-annotation-popup__container')
        : $event.target;
      if (isLeftClick($event) && popupContainerEl) {
        isdragging = true;
        offset.left = $event.clientX - popupContainerEl.offsetLeft;
        offset.top = $event.clientY - popupContainerEl.offsetTop;
      }
    });

    this.document.addEventListener('mousemove', function ($event) {
      if (isLeftClick($event) && isdragging) {
        popupContainerEl.style.left = `${$event.clientX - offset.left}px`;
        popupContainerEl.style.top = `${$event.clientY - offset.top}px`;
      }
    });

    this.document.addEventListener('mouseup', () => isdragging = false);
  }

  // -- popup row items

  private _registerPopupToBeAnnotItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const rects = getSelectionRects(this.document, this.pdfjs);
      if (isLeftClick($event) && rects && Object.keys(rects).length) {
        const pageEl = closestPageEl($event.target);
        const bound = getBound(rects[getPageNum(pageEl)]);
        this.location = {
          top: `calc(100% - ${bound.bottom}%)`,
          left: `${bound.left}%`
        };

        this.pending = { id: uuid(), rects };
      }
      return null as any;
    });
  }

  private _setAnnotationAttr(annotation: any, attr: string, value: any) {
    if (!annotation.type)
      annotation.type = 'highlight';
    annotation[attr] = value;
    if (annotation == this.pending)
      this.storage.create(annotation);
    else
      this.storage.update(annotation);
    this.render(annotation);
    this.clearSelection();
  }

  private _isPendingAnnotOrRect($event: any) {
    const selectionRects = getSelectionRects(this.document, this.pdfjs);
    const isPendingAnnot = this.pending && selectionRects && Object.keys(selectionRects).length;
    const isAnnotRect = $event.target.classList.contains('pdfjs-annotation__rect');
    return isPendingAnnot || (isAnnotRect && isRightClick($event));
  }

  private _registerPopupAnnotNoteItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        const annot = this.pending || this.storage.read($event.target.getAttribute('data-annotation-id'));
        const noteEl = htmlToElements(`<textarea class="pdfjs-annotation-popup__annot-note" rows="5">${annot.note || ''}</textarea>`);
        noteEl.onchange = ($ev: any) => this._setAnnotationAttr(annot, 'note', $ev.target.value);
        return noteEl;
      }
      return null as any;
    });
  }

  private _registerPopupAnnotColorItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        const annot = this.pending || this.storage.read($event.target.getAttribute('data-annotation-id'));
        const colorsEl = htmlToElements(`<div class="pdfjs-annotation-popup__annot-color-btns"></div>`);
        ['#ffd400', '#ff6563', '#5db221', '#2ba8e8', '#a28ae9', '#e66df2', '#f29823', '#aaaaaa', 'black'].forEach(color => {
          const colorEl = htmlToElements(`<button class="pdfjs-annotation-popup__annot-color-btn pdfjs-annotation-popup__annot-color-btn--${color.replace('#', '')}"></button>`);
          colorEl.style.backgroundColor = color;
          colorEl.onclick = ($ev) => this._setAnnotationAttr(annot, 'color', color);
          colorsEl.appendChild(colorEl);
        });
        return colorsEl;
      }
      return null as any;
    });
  }

  private _registerPopupAnnotTypeItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        const annot = this.pending || this.storage.read($event.target.getAttribute('data-annotation-id'));

        const pageEl = closestPageEl($event.target);
        const bound = getBound(annot.rects[getPageNum(pageEl)]);
        this.location = {
          top: `calc(100% - ${bound.bottom}%)`,
          left: `${bound.left}%`
        };

        const typeBtnHtmls = {
          'highlight': '<span style="background: orange;">highlight</span>',
          'underline': '<span style="text-decoration: underline;">underline</span>',
          'linethrough': '<span style="text-decoration: line-through;">line-through</span>',
        };
        const typesEl = htmlToElements(`<div class="pdfjs-annotation-popup__annot-type-btns"></div>`);
        Object.keys(typeBtnHtmls).forEach(type => {
          const buttonEl = htmlToElements(`<button class="pdfjs-annotation-popup__annot-type-btn--${type}">${typeBtnHtmls[type]}</button>`);
          buttonEl.onclick = ($ev) => this._setAnnotationAttr(annot, 'type', type);
          typesEl.appendChild(buttonEl);
        });

        return typesEl;
      }
      return null as any;
    });
  }
}
