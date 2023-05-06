import {
  Rect, closestPageEl, createUniqueId, getBound, getPageEl, getRectPageNum,
  groupByPageNum, htmlToElements, mergeRects, rotateRect, rotation
} from './utils';

export type Annotation = {
  id: string,
  type: string,
  color?: string,
  rects: { [pageNum: number]: Rect[] },
  note?: string
}

export class Annotator {
  private window;
  private document;
  private documentEl;

  private pdfjs;
  private store;

  private selected;

  private annotBoundFinders: {
    [annotType: string]: (pageNum: number, annot: any) => Rect
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

    this.registerBoundCalculator('paws-annotation__rect', (pageNum, annot) => getBound(annot.rects[pageNum]));

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
        && $event.target.classList.contains('paws-annotation__bound')) {
        this.documentEl.querySelectorAll(`.paws-annotations [paws-annotation-id="${this.selected.id}"]`)
          .forEach((el: any) => el.remove());
        this.store.delete(this.selected);
        this.selected = null;
      }
    });
  }

  private _setupOnTextSelection() {
    let down = false, dragging = false;
    this.document.addEventListener('mousedown', ($event: any) => {
      if ($event.button === 0)
        down = true;
    });
    this.document.addEventListener('mousemove', ($event: any) => {
      if ($event.button === 0)
        dragging = down;
    });

    const handle = ($event: any) => {
      down = false;
      if (dragging && this.onTextSelection)
        this.onTextSelection($event)
    };

    this.document.addEventListener('mouseup', ($event: any) => {
      if ($event.button === 0)
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
      if (!classList.contains('paws-annotation__bound')) {
        pageEl.querySelectorAll(`.paws-annotation__bound`).forEach((el: any) => el.remove());
        this.selected = null;
      }

      // show the boundary for the clicked rect
      for (const className of Object.keys(this.annotBoundFinders)) {
        if (classList.contains(className)) {
          const annotId = $event.target.getAttribute('paws-annotation-id');
          this.selected = this.store.read(annotId);
          const pageNum = parseInt(pageEl.getAttribute('data-page-number') || '');
          const annotBound = this.annotBoundFinders[className](pageNum, this.selected);
          this.showBoundary(pageNum, this.selected, annotBound);
        }
      }
    });
  }

  private _renderOnPagerendered() {
    this.pdfjs.eventBus.on('pagerendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.getOrAttachAnnotLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.paws-annotation__rect').forEach((el: any) => el.remove());
      annotsLayerEl.querySelectorAll('.paws-annotation__bound').forEach((el: any) => el.remove());
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
    const rects: Rect[] = Array.from(range.getClientRects());

    const merged = mergeRects(rects)
      .map(rect => ({ ...rect, page: getRectPageNum(this.document, rect) }))
      .filter(rect => rect.page && rect.width > 0 && rect.height > 0);

    if (merged.length < 1)
      return null;

    const grouped = groupByPageNum(this.documentEl, merged);
    for (const pageNum of Object.keys(grouped)) {
      grouped[pageNum] = grouped[pageNum].map((rect: Rect) => {
        // in case page rotation != 0, rotate it back to 0
        return rotateRect(rotation(this.pdfjs), false, rect);
      });
    }

    return grouped;
  }

  getOrAttachAnnotLayerEl(pageNum: number) {
    const pageEl = getPageEl(this.documentEl, pageNum);
    if (!pageEl.querySelector('.paws-annotations'))
      pageEl.appendChild(htmlToElements(`<div class="paws-annotations"></div>`));
    return pageEl.querySelector('.paws-annotations');
  }

  showBoundary(pageNum: number, annot: Annotation, boundRect: Rect) {
    boundRect = rotateRect(rotation(this.pdfjs), true, boundRect);

    const boundEl = htmlToElements(
      `<div paws-annotation-id="${annot.id}"
      class="paws-annotation__bound" 
      tabindex="-1"
      style="
        top: ${boundRect.top}%;
        bottom: ${boundRect.bottom}%;
        left: ${boundRect.left}%;
        right: ${boundRect.right}%;
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

        annotsLayerEl.querySelectorAll(`[paws-annotation-id="${annot.id}"].paws-annotation__rect`)
          .forEach((el: any) => el.remove());

        const degree = rotation(this.pdfjs);
        const rects: Rect[] = annot.rects[pageNum];
        rects.forEach(rect => {
          rect = rotateRect(degree, true, rect);

          annotsLayerEl.appendChild(htmlToElements(
            `<div paws-annotation-id="${annot.id}" 
            class="paws-annotation__rect ${annot.type ? 'paws-annotation__' + annot.type : ''}" 
            style="
              top: calc(${rect.top}% + 1px);
              bottom: calc(${rect.bottom}% + 1px);
              left: ${rect.left}%;
              right: ${rect.right}%;
              --annotation-color: ${annot.color || 'rgb(255, 212, 0)'};
            ">
          </div>`
          ));
        })
      });
  }

  registerBoundCalculator(annotType: string, calculator: (pageNum: number, annot: any) => Rect) {
    this.annotBoundFinders[annotType] = calculator;
  }

  unregisterBoundCalculator(annotType: string) {
    delete this.annotBoundFinders[annotType];
  }
}

// TODO: rename annotBoundFinders to something more informative
// TODO: setting note on selected text (not annotation yet) trigger null error