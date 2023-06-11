import { AnnotationStorage } from './annotator-storage';
import {
  WHRect, closestPageEl, getBound,
  getPageEl, getPageNum, getSelectionRects, htmlToElements,
  isLeftClick, isRightClick, relativeToPageEl, rotateRect,
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
  private configs;

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
      this.storage.create(annot, () => {
        this.clearSelection();
        this.render(annot);
      });
    }
  };

  constructor({ iframe, pdfjs, storage, configs }) {
    this.window = iframe?.contentWindow;
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.storage = storage;
    this.configs = configs;

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
    this._registerPopupAnnotUserItemUI();
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
        this.storage.delete(this.selected, () => {
          this.selected = null;
        });
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
      this.storage.list()
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

  rerender() {
    const querySelector = '#viewerContainer .pdfViewer .page[data-loaded="true"]';
    this.documentEl.querySelectorAll(querySelector).forEach(el => {
      const pageNumber = parseInt(el.getAttribute('data-page-number'));
      this.pdfjs.eventBus.dispatch("pagerendered", { pageNumber });
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
        const bound = pageEl.getBoundingClientRect();
        this.location = {
          top: `${$event.y - bound.y}px`,
          left: `${$event.x - bound.x}px`,
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

  private _calcAnnotBound(pageEl: HTMLElement, $event: any) {
    const annot = $event.target.closest('[data-annotation-id]');
    if (!annot) return null;

    const annotId = annot.getAttribute('data-annotation-id');
    const annotLayerEl = $event.target.closest('.pdfjs-annotations');
    const annotEls = Array.from(annotLayerEl.querySelectorAll(`[data-annotation-id="${annotId}"]`));
    const annotElsBound = annotEls.map((el: any) => {
      const rect = relativeToPageEl(el.getBoundingClientRect(), pageEl);
      const { left, right, top, bottom, width, height } = rect;
      return { left, right, top, bottom, width, height };
    });

    const bound = getBound(annotElsBound);
    return { top: `calc(100% - ${bound.bottom}%)`, left: `${bound.left}%` };
  }

  showPopup(pageEl: HTMLElement, elements: HTMLElement[], $event: any) {
    const location = this.location || this._calcAnnotBound(pageEl, $event);
    const popupEl = htmlToElements(
      `<form class="pdfjs-annotation-popup__container" style="
          top: ${location.top};
          left: ${location.left};
          width: ${location.width || 'fit-content'};
          height: ${location.height || 'fit-content'};
        " autocomplete="off">
      </form>`);

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

  private _setAnnotationAttr(annot: any, attr: string, value: any) {
    if (!annot.type)
      annot.type = 'highlight';
    annot[attr] = value;
    const then = () => {
      this.clearSelection();
      this.render(annot);
      this.hidePopup();
    };
    if (annot == this.pending)
      this.storage.create(annot, then);
    else
      this.storage.update(annot, then);
  }

  private _isPendingAnnotOrRect($event: any) {
    const selectionRects = getSelectionRects(this.document, this.pdfjs);
    const isPendingAnnot = this.pending && selectionRects && Object.keys(selectionRects).length;
    const isAnnotRect = $event.target.classList.contains('pdfjs-annotation__rect');
    return isPendingAnnot || (isAnnotRect && (
      (this.configs.onleftclick && isLeftClick($event)) || isRightClick($event)
    ));
  }

  private _registerPopupAnnotTypeItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        const typeBtnHtmls: any = {};
        if (this.configs.highlight) /*  */ typeBtnHtmls.highlight = '<span style="background: orange;">Highlight</span>';
        if (this.configs.underline) /*  */ typeBtnHtmls.underline = '<span style="text-decoration: underline;">Underline</span>';
        if (this.configs.linethrough) /**/ typeBtnHtmls.linethrough = '<span style="text-decoration: line-through;">Line through</span>';
        if (this.configs.redact) /*     */ typeBtnHtmls.redact = '<span style="background: darkgray;">Redact</span>';

        if (Object.keys(typeBtnHtmls).length < 1)
          return null;

        const annot = this.pending || this.storage.read($event.target.getAttribute('data-annotation-id'));
        // const pageEl = closestPageEl($event.target);
        // const bound = getBound(annot.rects[getPageNum(pageEl)]);
        // this.location = {
        //   top: `calc(100% - ${bound.bottom}%)`,
        //   left: `${bound.left}%`
        // };

        const typesEl = htmlToElements(`<div class="pdfjs-annotation-popup__annot-type-btns"></div>`);
        Object.keys(typeBtnHtmls).forEach(type => {
          const buttonEl = htmlToElements(`<button type="button" class="pdfjs-annotation-popup__annot-type-btn--${type}">${typeBtnHtmls[type]}</button>`);
          buttonEl.onclick = ($ev) => this._setAnnotationAttr(annot, 'type', type);
          typesEl.appendChild(buttonEl);
        });

        return typesEl;
      }
      return null as any;
    });
  }

  private _registerPopupAnnotColorItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        if (!this.configs.highlight
          && !this.configs.underline
          && !this.configs.linethrough
          && !this.configs.redact)
          return null;

        const annot = this.pending || this.storage.read($event.target.getAttribute('data-annotation-id'));
        const colorsEl = htmlToElements(`<div class="pdfjs-annotation-popup__annot-color-btns"></div>`);
        this.configs.annotation_colors.split(',').forEach(color => {
          const colorEl = htmlToElements(`<button type="button" class="pdfjs-annotation-popup__annot-color-btn--${color.replace('#', '')}"></button>`);
          colorEl.style.backgroundColor = color;
          colorEl.onclick = ($ev) => this._setAnnotationAttr(annot, 'color', color);
          colorsEl.appendChild(colorEl);
        });
        return colorsEl;
      }
      return null as any;
    });
  }

  private _registerPopupAnnotNoteItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        const annot = this.pending || this.storage.read($event.target.getAttribute('data-annotation-id'));
        if (this.configs.notes) {
          const noteEl = htmlToElements(`<textarea class="pdfjs-annotation-popup__annot-note" rows="5">${annot.note || ''}</textarea>`);
          noteEl.onchange = ($ev: any) => this._setAnnotationAttr(annot, 'note', $ev.target.value);
          return noteEl;
        } else if (annot.note) {
          return htmlToElements(`<span class="pdfjs-annotation-popup__annot-note">${annot.note}</span>`);
        }
      }
      return null as any;
    });
  }

  private _registerPopupAnnotUserItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const target = $event.target.closest('[data-annotation-id]');
      if (!target) return null as any;
      const annot: any = this.storage.read(target.getAttribute('data-annotation-id'));
      return htmlToElements(`<span class="pdfjs-annotation-popup__user-fullname">by ${annot.user_fullname || 'unknown'}</span>`);
    });
  }
}
