import { Annotations } from './annotations';
import {
  WHRect, getPageEl, getBound,
  getPageNum, getSelectionRects, htmlToElements,
  getAnnotEl, isLeftClick, isRightClick, rotateRect,
  rotation, uuid, getAnnotBound, removeSelectorAll
} from './annotator-utils';

// -- annotator

export const POPUP_ROW_ITEM_UI = 'POPUP_ROW_ITEM_UI';

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
  private storage: Annotations;
  private toolbar: any;
  private configs: any;

  private selected: any;
  private pending: any;

  location: Location = null as any;

  private ebus: {
    [type: string]: {
      priority: number,
      callback: ((...args: any) => any),
    }[]
  } = {};
  register(type: string, callback: (...args: any) => any, priority = 0) {
    if (type in this.ebus == false)
      this.ebus[type] = [];
    this.ebus[type].push({ callback, priority });
    this.ebus[type].sort((a, b) => b.priority - a.priority); // descending
  }
  unregister(type: string, callback: (...args: any) => any) {
    if (type in this.ebus == false)
      return;

    const filtered = this.ebus[type].filter(cb => cb.callback == callback);
    if (filtered.length < 1)
      return;

    this.ebus[type].splice(this.ebus[type].indexOf(filtered[0]), 1);
  }

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

  constructor({ baseHref, iframe, pdfjs, storage, toolbar, configs }) {
    this.window = iframe?.contentWindow;
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.storage = storage;
    this.toolbar = toolbar;
    this.configs = configs;

    this._attachStylesheet(baseHref);
    this._renderOnPagerendered();
    this._setupOnTextSelection();
    this._toggleBoundaryOnClick();
    this._removeOnKeyBkSpaceOrDelete();
    // -- popup
    this._setupPopupOnMouseMove();
    this._setupPopupOnTextSelection();
    this._setupPopupOnClick();
    this._setupPopupOnContextMenu();
    this._hideOnKeyBkSpaceOrDelete();
    // -- popup row items
    this.register('hide', () => this.pending = null);
    this._registerPopupAnnotUserItemUI();
    this._registerPopupToBeAnnotItemUI();
    this._registerPopupAnnotTypeItemUI();
    this._registerPopupAnnotColorItemUI();
    this._registerPopupAnnotNoteItemUI();

    // -- toolbar
    // this._addToolbarUI();
  }


  private _attachStylesheet(baseHref: string) {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="${baseHref}assets/annotator.css" />`
    ));
  }

  private _removeOnKeyBkSpaceOrDelete() {
    this.document.addEventListener('keydown', ($event: any) => {
      if (this.selected
        && $event.key == 'Delete' || $event.key == 'Backspace'
        && $event.target.classList.contains('pdfjs-annotation__bound')) {
        removeSelectorAll(this.documentEl, `.pdfjs-annotations [data-annotation-id="${this.selected.id}"]`);
        this.storage.delete(this.selected, () => {
          this.selected = null;
        });
      }
    });
  }

  private _setupOnTextSelection() {
    let down = false, dragging = false;
    this.document.addEventListener('mousedown', ($event: any) => {
      if (isLeftClick($event)) down = true;
    });
    this.document.addEventListener('mousemove', ($event: any) => {
      if (isLeftClick($event)) dragging = down;
    });

    const handle = ($event: any) => {
      down = false;
      if (dragging && this.onTextSelection)
        this.onTextSelection($event)
    };

    this.document.addEventListener('mouseup', ($event: any) => {
      if (isLeftClick($event)) handle($event);
    });
    this.document.addEventListener('dblclick', ($event: any) => {
      dragging = true;
      handle($event);
    });
  }

  private _toggleBoundaryOnClick() {
    this.document.addEventListener('click', ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (!pageEl) return;

      const classList = $event.target.classList;

      // remove boundaries if clicked outside one
      if (!classList.contains('pdfjs-annotation__bound')) {
        removeSelectorAll(pageEl, '.pdfjs-annotation__bound');
        this.selected = null;
      }

      const annotEl = getAnnotEl($event.target);
      if (annotEl) {
        const annotId: any = annotEl.getAttribute('data-annotation-id');
        this.selected = this.storage.read(annotId);
        this.showBoundary(getPageNum(pageEl), this.selected, getAnnotBound($event));
      }
    });
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.getOrAttachLayerEl(pageNum);
      removeSelectorAll(annotsLayerEl, '.pdfjs-annotation__rect');
      removeSelectorAll(annotsLayerEl, '.pdfjs-annotation__bound');
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

        removeSelectorAll(annotsLayerEl, `[data-annotation-id="${annot.id}"].pdfjs-annotation__rect`);

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
    this.onTextSelection = ($event: any) => this._prepareAndShowPopup($event);
  }

  private _setupPopupOnClick() {
    this.document.addEventListener('click', ($event: any) => {
      if (getAnnotEl($event.target))
        this.location = null as any; // let popup decide its location

      if (!this._getPopupContainerEl($event.target)
        && this._prepareAndShowPopup($event).length < 1) {
        this.hidePopup();  // hide popup if clicked outside it
      }
    });
  }

  private _setupPopupOnContextMenu() {
    this.document.addEventListener('contextmenu', ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (!pageEl) return;

      $event.preventDefault();

      if (getAnnotEl($event.target))
        this.location = null as any; // let popup decide its location
      else {
        const bound = pageEl.getBoundingClientRect();
        this.location = { top: `${$event.y - bound.y}px`, left: `${$event.x - bound.x}px` };
      }

      this._prepareAndShowPopup($event);
    });
  }

  private _prepareAndShowPopup($event: any) {
    const pageEl = getPageEl($event.target);
    if (!pageEl) return [];

    const cbs = this.ebus[POPUP_ROW_ITEM_UI] || [];
    const rowItemUIs = cbs.map(cb => cb.callback($event)).filter(rowItemEl => rowItemEl);
    if (rowItemUIs.length)
      this.showPopup(pageEl, rowItemUIs, $event);

    return rowItemUIs;
  }

  hidePopup() {
    this.location = null as any;
    removeSelectorAll(this.documentEl, '.pdfjs-annotation-popup');
    this.ebus['hide']?.forEach(cb => cb.callback());
  }

  showPopup(pageEl: HTMLElement, elements: HTMLElement[], $event: any) {
    if (this.location == null) {
      const bound = getAnnotBound($event);;
      this.location = { top: `calc(100% - ${bound.bottom}%)`, left: `${bound.left}%` };
    }

    const popupEl = htmlToElements(
      `<form class="pdfjs-annotation-popup__container" style="
          top: ${this.location.top};
          left: ${this.location.left};
          width: ${this.location.width || 'fit-content'};
          height: ${this.location.height || 'fit-content'};
        " autocomplete="off">
      </form>`);

    const popupLayerEl = this.getOrAttachPopupLayerEl(pageEl);
    popupLayerEl.replaceChildren();
    popupLayerEl.appendChild(popupEl);
    elements.forEach(rowItemUI => popupEl.appendChild(rowItemUI));
    this.ebus['show']?.forEach(cb => cb.callback());
  }

  private _getPopupContainerEl(target: HTMLElement, closest = true) {
    return !target.classList.contains('pdfjs-annotation-popup__container')
      ? (closest ? target.closest('.pdfjs-annotation-popup__container') : null) as HTMLElement
      : target;
  }

  // move popup on mouse move
  private _setupPopupOnMouseMove() {
    let isdragging = false;
    let offset = { left: 0, top: 0 };
    let popupContainerEl: HTMLElement;
    this.document.addEventListener('mousedown', ($event) => {
      this._renderNoteTmpHighlight($event);

      popupContainerEl = this._getPopupContainerEl($event.target, false);
      if (isLeftClick($event) && popupContainerEl) {
        isdragging = true;
        offset.left = $event.clientX - popupContainerEl.offsetLeft;
        offset.top = $event.clientY - popupContainerEl.offsetTop;
        $event.preventDefault();
      }
    });

    this.document.addEventListener('mousemove', ($event) => {
      if (isLeftClick($event) && isdragging) {
        popupContainerEl.style.left = `${$event.clientX - offset.left}px`;
        popupContainerEl.style.top = `${$event.clientY - offset.top}px`;
      }
    });

    this.document.addEventListener('mouseup', () => isdragging = false);
  }

  private _renderNoteTmpHighlight($event) {
    const noteEl = $event.target;
    if (!noteEl.classList.contains('pdfjs-annotation-popup__annot-note'))
      return;

    const id = 'tmpid' + Math.random().toString().substring(2);
    const rects: any = getSelectionRects(this.document, this.pdfjs);
    this.render({ id, type: 'highlight', rects });

    const removeTmpHighlight = ($event) => {
      removeSelectorAll(this.documentEl, `.pdfjs-annotations [data-annotation-id="${id}"]`);
      noteEl.removeEventListener('blur', removeTmpHighlight);
    }
    noteEl.addEventListener('blur', removeTmpHighlight);
  }

  // -- popup row items

  private _registerPopupToBeAnnotItemUI() {
    this.register(POPUP_ROW_ITEM_UI, ($event: any) => {
      const rects = getSelectionRects(this.document, this.pdfjs);
      if (isLeftClick($event) && rects && Object.keys(rects).length) {
        const pageNum = getPageNum(getPageEl($event.target));
        const bound = getBound(rects[pageNum]);
        this.location = { top: `calc(100% - ${bound.bottom}%)`, left: `${bound.left}%` };

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
        if (this.configs.linethrough) /**/ typeBtnHtmls.linethrough = '<span style="text-decoration: line-through;">Strikethrough</span>';
        if (this.configs.redact) /*     */ typeBtnHtmls.redact = '<span style="background: darkgray;">Redact</span>';

        if (Object.keys(typeBtnHtmls).length < 1)
          return null;

        const annot = this.pending || this.storage.read($event.target.getAttribute('data-annotation-id'));
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
      const target: any = getAnnotEl($event.target);
      if (target) {
        const annot: any = this.storage.read(target.getAttribute('data-annotation-id'));
        if (annot.user_fullname)
          return htmlToElements(`<span class="pdfjs-annotation-popup__user-fullname">${annot.user_fullname}</span>`);
      }
      return null as any;
    });
  }
}
