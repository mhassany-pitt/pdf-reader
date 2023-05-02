
import {
  Rect, closestPageEl, createUniqueId, getBound, getPageEl, getRectPageNum,
  groupByPageNum, htmlToElements, mergeRects, rotateRect, rotation
} from './utils';

type Annotation = {
  id: string,
  type: string,
  color?: string,
  rects: { [pageNum: number]: Rect[] },
  note?: string
}

const annotator = ({ iframe, pdfjs, store }) => {
  const window = iframe?.contentWindow;
  const document = iframe?.contentDocument;
  const documentEl = document.documentElement;

  const state = { selected: null as any };

  const getAnnotationLayerEl = (pageNum: number) => {
    const pageEl = getPageEl(document, pageNum);
    if (!pageEl.querySelector('.paws-annotations'))
      pageEl.appendChild(htmlToElements(`<div class="paws-annotations"></div>`));
    return pageEl.querySelector('.paws-annotations');
  }

  const render = (annot: Annotation) => {
    Object.keys(annot.rects)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = getAnnotationLayerEl(pageNum);

        annotsLayerEl.querySelectorAll(`[paws-annotation-id="${annot.id}"].paws-annotation__rect`)
          .forEach((el: any) => el.remove());

        const degree = rotation(pdfjs);
        const rects: Rect[] = annot.rects[pageNum];
        rects.forEach(rect => {
          rect = rotateRect(degree, true, rect);

          annotsLayerEl.appendChild(htmlToElements(
            `<div paws-annotation-id="${annot.id}" 
              class="paws-annotation__rect ${annot.type ? 'paws-annotation__rect-' + annot.type : ''}" 
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

  const showBoundary = (pageEl: HTMLElement, annot: Annotation) => {
    const dataPageNum = pageEl.getAttribute('data-page-number');
    if (!dataPageNum)
      return;

    const pageNum = parseInt(dataPageNum);
    let boundRect = getBound(annot.rects[pageNum]);
    boundRect = rotateRect(rotation(pdfjs), true, boundRect);

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

    getAnnotationLayerEl(pageNum).appendChild(boundEl);
    boundEl.focus();
  }

  const getSelectionRects = () => {
    const selection = window.getSelection();
    if (selection.rangeCount < 1)
      return null;

    const range = selection.getRangeAt(0);
    const rects: Rect[] = Array.from(range.getClientRects());

    const merged = mergeRects(rects)
      .map(rect => ({ ...rect, page: getRectPageNum(document, rect) }))
      .filter(rect => rect.page && rect.width > 0 && rect.height > 0);

    if (merged.length < 1)
      return null;

    const grouped = groupByPageNum(document, merged);
    for (const pageNum of Object.keys(grouped)) {
      grouped[pageNum] = grouped[pageNum].map((rect: Rect) => {
        // in case page rotation != 0, rotate it back to 0
        return rotateRect(rotation(pdfjs), false, rect);
      });
    }

    return grouped;
  }

  { // attach stylesheet
    documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/annotator.css" />`
    ));
  }

  { // on pdfjs pagerendered, render annotations
    pdfjs.eventBus.on('pagerendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = getAnnotationLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.paws-annotation__rect').forEach((el: any) => el.remove());
      annotsLayerEl.querySelectorAll('.paws-annotation__bound').forEach((el: any) => el.remove());
      annotsLayerEl.setAttribute('data-rotation-degree', rotation(pdfjs));

      // current page and only annotations with rects
      (store.annotations as Annotation[])
        .filter(annot => annot.rects)
        .filter(annot => Object.keys(annot.rects)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(annot => render({ ...annot, rects: { [pageNum]: annot.rects[pageNum] } }));
    });
  }

  { // show/hide annotation boundary on click
    documentEl.addEventListener('click', ($event: any) => {
      const pageEl = closestPageEl($event.target);
      if (!pageEl)
        return;

      const classList = $event.target.classList;

      // remove boundaries if clicked outside one
      if (!classList.contains('paws-annotation__bound')) {
        pageEl.querySelectorAll(`.paws-annotation__bound`).forEach((el: any) => el.remove());
        state.selected = null;
      }

      // show the boundary for the clicked rect
      if (classList.contains('paws-annotation__rect')) {
        const annotId = $event.target.getAttribute('paws-annotation-id');
        state.selected = store.read(annotId);
        showBoundary(pageEl, state.selected);
      }
    });
  }

  { // on text selection (mouseup/dbclick)
    let down = false, dragging = false;
    documentEl.addEventListener('mousedown', ($event: any) => {
      if ($event.button === 0)
        down = true;
    });
    documentEl.addEventListener('mousemove', ($event: any) => {
      if ($event.button === 0)
        dragging = down;
    });

    const handle = ($event: any) => {
      down = false;
      if (dragging && $.onTextSelection)
        $.onTextSelection($event);
    };

    documentEl.addEventListener('mouseup', ($event: any) => {
      if ($event.button === 0)
        handle($event);
    });
    documentEl.addEventListener('dblclick', ($event: any) => {
      dragging = true;
      handle($event);
    });
  }

  { // delete the selected annotation on delete/backspace
    documentEl.addEventListener('keydown', ($event: any) => {
      if (state.selected
        && $event.key == 'Delete' || $event.key == 'Backspace'
        && $event.target.classList.contains('paws-annotation__bound')) {
        documentEl.querySelectorAll(`.paws-annotations [paws-annotation-id="${state.selected.id}"]`)
          .forEach((el: any) => el.remove());
        store.delete(state.selected);
        state.selected = null;
      }
    });
  }

  const $ = {
    getSelectionRects, getAnnotationLayerEl, render,
    onTextSelection: ($event: any) => {
      const rects = getSelectionRects();
      if (rects) {
        const annot = { id: createUniqueId(), type: 'highlight', rects };
        store.create(annot);
        render(annot);

        window.getSelection().removeAllRanges();
      }
    }
  };
  return $;
};

export { Annotation, annotator };

// TODO: separate annotator-rect from freeform rect?!
// TODO: review to stabilize 