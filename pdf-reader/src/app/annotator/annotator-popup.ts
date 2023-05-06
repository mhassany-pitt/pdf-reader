import { Annotator } from "./annotator";
import { AnnotationStore } from "./annotator-store";
import {
  closestPageEl, createUniqueId,
  getBound, getPageNum, htmlToElements, isLeftClick
} from "./utils";

export class AnnotatorPopup {
  private window;
  private document;
  private documentEl;

  private pdfjs;
  private annotator: Annotator;
  private store: AnnotationStore;

  private pending;
  location: { top: any, left: any } = null as any;

  private itemUIs: (($event: any) => HTMLElement)[] = [];

  constructor({ iframe, pdfjs, annotator, store }) {
    this.window = iframe?.contentWindow;
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.annotator = annotator;
    this.store = store;

    this._attachStylesheet();
    this._setupOnTextSelection();
    this._setupOnClick();
    this._setupOnContextMenu();
    this._hideOnDelete();
    this._registerToBeAnnotItemUI(); // <-- should be called first
    this._registerAnnotTypeItemUI();
    this._registerAnnotColorItemUI();
    this._registerAnnotNoteItemUI();
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/annotator-popup.css" />`
    ));
  }

  private _getOrAttachPopupLayerEl(pageEl: HTMLElement) {
    if (!pageEl.querySelector('.pdfjs-annotation-popup'))
      pageEl.appendChild(htmlToElements(`<div class="pdfjs-annotation-popup"></div>`));
    return pageEl.querySelector('.pdfjs-annotation-popup') as HTMLElement;
  }

  private _hideOnDelete() {
    this.document.addEventListener('keydown', ($event: any) => {
      if (($event.key == 'Delete' || $event.key == 'Backspace')
        && $event.target.classList.contains('pdfjs-annotation__bound'))
        this.hide();
    });
  }

  private _setupOnTextSelection() {
    this.annotator.onTextSelection = ($event: any) => this._prepareItemUIs($event);
  }

  private _setupOnClick() {
    this.document.addEventListener('click', ($event: any) => {
      const itemUIs = this._prepareItemUIs($event);
      if (itemUIs.length < 1 // hide popup if clicked outside it
        && !$event.target.classList.contains('pdfjs-annotation-popup__container')
        && !$event.target.closest('.pdfjs-annotation-popup__container'))
        this.hide();
    });
  }

  private _setupOnContextMenu() {
    this.document.addEventListener('contextmenu', ($event: any) => this._prepareItemUIs($event));
  }

  private _prepareItemUIs($event: any) {
    const pageEl = closestPageEl($event.target);
    if (!pageEl)
      return [];

    const itemUIs = this.itemUIs
      .map(itemUI => itemUI($event))
      .filter(itemEl => itemEl);

    if (itemUIs.length)
      this.show(pageEl, itemUIs, $event);

    return itemUIs;
  }

  private _registerToBeAnnotItemUI() {
    this.registerItemUI(($event: any) => {
      const rects = this.annotator.getSelectionRects();
      if (isLeftClick($event) && rects && Object.keys(rects).length) {
        const pageEl = closestPageEl($event.target);
        const bound = getBound(rects[getPageNum(pageEl)]);
        this.location = { top: `calc(100% - ${bound.bottom}%)`, left: `${bound.left}%` };
        this.pending = { id: createUniqueId(), rects };
      }
      return null as any;
    });
  }

  private _setAnnotationAttr = (annotation: any, attr: string, value: any) => {
    if (!annotation.type)
      annotation.type = 'highlight';
    annotation[attr] = value;
    if (annotation == this.pending)
      this.store.create(annotation);
    else
      this.store.update(annotation);
    this.annotator.render(annotation);
    this.window.getSelection().removeAllRanges();
  }

  private _isPendingAnnotOrRect($event: any) {
    const selectionRects = this.annotator.getSelectionRects();
    const isPendingAnnot = this.pending && selectionRects && Object.keys(selectionRects).length;
    const isAnnotRect = $event.target.classList.contains('pdfjs-annotation__rect');
    return isLeftClick($event) && (isPendingAnnot || isAnnotRect);
  }

  private _registerAnnotNoteItemUI() {
    this.registerItemUI(($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        const annot = this.pending || this.store.read($event.target.getAttribute('data-annotation-id'));
        const noteEl = htmlToElements(`<textarea rows="5">${annot.note || ''}</textarea>`);
        noteEl.onchange = ($ev: any) => this._setAnnotationAttr(annot, 'note', $ev.target.value);

        const containerEl = htmlToElements(`<div class="pdfjs-annotation-popup__highlight-note"></div>`);
        containerEl.appendChild(noteEl);
        return containerEl;
      }
      return null as any;
    });
  }

  private _registerAnnotColorItemUI() {
    this.registerItemUI(($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        const annot = this.pending || this.store.read($event.target.getAttribute('data-annotation-id'));
        const colorsEl = htmlToElements(`<div class="pdfjs-annotation-popup__highlight-colors"></div>`);
        ['#ffd400', '#ff6563', '#5db221', '#2ba8e8', '#a28ae9', '#e66df2', '#f29823', '#aaaaaa', 'black'].forEach(color => {
          const colorEl = htmlToElements(`<button class="pdfjs-annotation-popup__highlight-color-btn"></button>`);
          colorEl.style.backgroundColor = color;
          colorEl.onclick = ($ev) => this._setAnnotationAttr(annot, 'color', color);
          colorsEl.appendChild(colorEl);
        });
        return colorsEl;
      }
      return null as any;
    });
  }

  private _registerAnnotTypeItemUI() {
    this.registerItemUI(($event: any) => {
      if (this._isPendingAnnotOrRect($event)) {
        const annot = this.pending || this.store.read($event.target.getAttribute('data-annotation-id'));
        const typeBtnHtmls = {
          'highlight': '<span style="background: orange;">highlight</span>',
          'underline': '<span style="text-decoration: underline;">underline</span>',
          'linethrough': '<span style="text-decoration: line-through;">line-through</span>',
        };
        const typesEl = htmlToElements(`<div class="pdfjs-annotation-popup__highlight-types"></div>`);
        Object.keys(typeBtnHtmls).forEach(type => {
          const buttonEl = htmlToElements(`<button class="pdfjs-annotation-popup__highlight-type-btn">${typeBtnHtmls[type]}</button>`);
          buttonEl.onclick = ($ev) => this._setAnnotationAttr(annot, 'type', type);
          typesEl.appendChild(buttonEl);
        });
        return typesEl;
      }
      return null as any;
    });
  }

  hide() {
    this.pending = null;
    this.location = null as any;
    const popupEl = this.documentEl.querySelector('.pdfjs-annotation-popup');
    popupEl?.remove();
  }

  show(pageEl: HTMLElement, itemUIs: HTMLElement[], $event: any) {
    const location = this.location;
    const styles = getComputedStyle($event.target);
    const top = location ? location.top : `calc(${styles.top} + ${styles.height})`;
    const left = location ? location.left : `${styles.left}`;

    const popupEl = htmlToElements(
      `<div class="pdfjs-annotation-popup__container" style="
          top: ${top};
          left: ${left};
          width: 15rem;
        ">
      </div>`);

    const popupLayerEl = this._getOrAttachPopupLayerEl(pageEl);
    popupLayerEl.replaceChildren();
    popupLayerEl.appendChild(popupEl);
    itemUIs.forEach(itemUI => popupEl.appendChild(itemUI));
  }

  registerItemUI(item: ($event: any) => HTMLElement) {
    this.itemUIs.push(item);
  }

  unregisterItemUI(item: ($event: any) => HTMLElement) {
    const index = this.itemUIs.indexOf(item);
    if (index > -1)
      this.itemUIs.splice(index, 1);
  }
}