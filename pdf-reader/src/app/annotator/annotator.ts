import {
  WHRect, closestPageEl, createUniqueId, getBound, getPageEl, getRectPageNum,
  groupByPageNum, htmlToElements, isLeftClick, mergeRects, rotateRect, rotation
} from './utils';

export type Annotation = {
  id: string,
  type: string,
  color?: string,
  rects: { [pageNum: number]: WHRect[] },
  note?: string
}

export class Annotator {
  private window;
  private document;
  private documentEl;

  private pdfjs;
  private store;

  private selected;

  private boundGetters: {
    [className: string]: (pageNum: number, annot: any) => WHRect
  } = {};

  onTextSelection = ($event: any) => {
    const rects = this.getSelectionRects();
    if (rects && Object.keys(rects).length) {
      const annot = { id: createUniqueId(), type: 'highlight', rects };
      this.store.create(annot);
      this.render(annot);

      this.window.getSelection().removeAllRanges();
    }
  };

  constructor({ iframe, pdfjs, store }) {
    this.window = iframe?.contentWindow;
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;
    this.store = store;

    this.registerBoundGetter('pdfjs-annotation__rect',
      (pageNum, annot) => getBound(annot.rects[pageNum]));

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._setupOnTextSelection();
    this._toggleBoundaryOnClick();
    this._removeOnDelete();
  }

  private _removeOnDelete() {
    this.document.addEventListener('keydown', ($event: any) => {
      if (this.selected
        && $event.key == 'Delete' || $event.key == 'Backspace'
        && $event.target.classList.contains('pdfjs-annotation__bound')) {
        this.documentEl.querySelectorAll(`.pdfjs-annotations [data-annotation-id="${this.selected.id}"]`)
          .forEach((el: any) => el.remove());
        this.store.delete(this.selected);
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
      for (const className of Object.keys(this.boundGetters)) {
        const targetEl = classList.contains(className)
          ? $event.target
          : $event.target.closest(`.${className}`);

        if (targetEl) {
          this.selected = this.store.read(targetEl.getAttribute('data-annotation-id'));
          const pageNum = parseInt(pageEl.getAttribute('data-page-number') || '');
          const annotBound = this.boundGetters[className](pageNum, this.selected);
          this.showBoundary(pageNum, this.selected, annotBound);
        }
      }
    });
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pagerendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.getOrAttachAnnotLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__rect').forEach((el: any) => el.remove());
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__bound').forEach((el: any) => el.remove());
      annotsLayerEl.setAttribute('data-rotation-degree', rotation(this.pdfjs));

      // current page and only annotations with rects
      (this.store.list() as Annotation[])
        .filter(annot => annot.rects)
        .filter(annot => Object.keys(annot.rects)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(annot => this.render({ ...annot, rects: { [pageNum]: annot.rects[pageNum] } }));
    });
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/annotator.css" />`
    ));
  }

  getSelectionRects() {
    const selection = this.window.getSelection();
    if (!selection || selection.rangeCount < 1)
      return null;

    const range = selection.getRangeAt(0);
    const rects: WHRect[] = Array.from(range.getClientRects());

    const merged = mergeRects(rects)
      .map(rect => ({ ...rect, page: getRectPageNum(this.document, rect) }))
      .filter(rect => rect.page && rect.width > 0 && rect.height > 0);

    if (merged.length < 1)
      return null;

    const grouped = groupByPageNum(this.documentEl, merged);
    for (const pageNum of Object.keys(grouped)) {
      grouped[pageNum] = grouped[pageNum].map((rect: WHRect) => {
        // in case page rotation != 0, rotate it back to 0
        return rotateRect(rotation(this.pdfjs), false, rect);
      });
    }

    return grouped;
  }

  getOrAttachAnnotLayerEl(pageNum: number) {
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

    this.getOrAttachAnnotLayerEl(pageNum).appendChild(boundEl);
    boundEl.focus();
  }

  render(annot: Annotation) {
    Object.keys(annot.rects)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = this.getOrAttachAnnotLayerEl(pageNum);

        annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdfjs-annotation__rect`)
          .forEach((el: any) => el.remove());

        const degree = rotation(this.pdfjs);
        const rects: WHRect[] = annot.rects[pageNum];
        rects.forEach(rect => {
          rect = rotateRect(degree, true, rect);
          const rectEl = htmlToElements(
            `<div data-annotation-id="${annot.id}" 
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

  registerBoundGetter(className: string, getter: (pageNum: number, annot: any) => WHRect) {
    this.boundGetters[className] = getter;
  }

  unregisterBoundGetter(className: string) {
    delete this.boundGetters[className];
  }
}
