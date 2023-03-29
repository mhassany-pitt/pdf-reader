import { v4 as uuid } from 'uuid';

const $ = {
  iframe: null as any,
  pdfjs: null as any,
  window: null as any,
  document: null as any,
  annotations: [] as any[],
  selected: null as any,
  init(iframe, pdfjs) {
    $.iframe = iframe;
    $.pdfjs = pdfjs;
    $.window = $.iframe?.contentWindow;
    $.document = $.iframe?.contentDocument.documentElement;

    $._addStyleSheet();

    $._loadAnnotations();

    $._onPageRendered();
    $._onAnnotationClick();
    $._createAnnotationOnHighlight();
    $._removeAnnotationOnDelete();
  },
  popup(annotation) {
    return { html: '', width: '0px' }
  },
  _loadAnnotations() {
    $.annotations = JSON.parse(localStorage.getItem('paws--annotations') || '[]')
  },
  _persistAnnotations() {
    localStorage.setItem('paws--annotations', JSON.stringify($.annotations))
  },
  _findAnnotation(id: string) {
    return $.annotations.filter(a => a.id == id)[0];
  },
  _closestPageEl(child) {
    return child.closest(`.pdfViewer .page`);
  },
  _pageEl(pageNum) {
    return $.document.querySelector(`.pdfViewer .page[data-page-number="${pageNum}"]`);
  },
  _pageNum(child) {
    return parseInt($._closestPageEl(child).getAttribute('data-page-number'));
  },
  _onPageRendered() {
    $.pdfjs.eventBus.on('pagerendered', ($event) => {
      const pageNum = $event.pageNumber;
      // clear the annotations layer
      $._annotationsLayer(pageNum).replaceChildren();

      // render annoations
      $.annotations.filter(annotation =>
        Object.keys(annotation.rects).map(parseInt).indexOf(pageNum) > -1
      ).forEach(annotation => $._renderAnnotations(
        { ...annotation, rects: { [pageNum]: annotation.rects[pageNum] } }
      ));
    });
  },
  _removeAnnotation(annotation) {
    $.annotations.splice($.annotations.indexOf(annotation), 1);
    $._persistAnnotations();
  },

  _removeAnnotationOnDelete() {
    $.document.addEventListener('keydown', $event => {
      if ($.selected && ($event.key == 'Delete' || $event.key == 'Backspace')) {
        $._removeAnnotation($.selected)
        $.document.querySelectorAll(`.pdfViewer .page .paws__annotations [paws-annotation-id="${$.selected.id}"]`)
          .forEach(el => el.remove());
        $.selected = null;
      }
    });
  },
  _annotationsLayer(pageNum) {
    const pageEl = $._pageEl(pageNum);
    if (!pageEl.querySelector('.paws__annotations'))
      pageEl.insertAdjacentHTML('beforeend', `<div class="paws__annotations"></div>`);

    return pageEl.querySelector('.paws__annotations');
  },
  _onAnnotationClick() {
    $.document.addEventListener('click', $event => {
      const pageEl = $._closestPageEl($event.target);
      if (!pageEl)
        return;

      if (
        !$event.target.classList.contains('paws__annotation-bound') &&
        !$event.target.classList.contains('paws__annotation-controls') &&
        !$event.target.closest('.paws__annotation-controls')
      ) {
        $.selected = null;
        $._clearAnnotationBoundaries(pageEl);
        $._clearAnnotationControls(pageEl);
      }

      if ($event.target.classList.contains('paws__annotation-rect')) {
        const id = $event.target.getAttribute('paws-annotation-id');

        $.selected = $._findAnnotation(id);
        $._showAnnotationBoundary(pageEl, $.selected);
        $._showAnnotationContorls(pageEl, $.selected);
      }
    });
  },
  _showAnnotationBoundary(pageEl, annotation) {
    const pageNum = parseInt(pageEl.getAttribute('data-page-number'));
    const bound = $._bound(annotation.rects[pageNum]);
    $._annotationsLayer(pageNum).insertAdjacentHTML('beforeend', `
      <div paws-annotation-id="${annotation.id}"
        class="paws__annotation-${annotation.id} paws__annotation-bound" 
        style="
          top: ${bound.top}%;
          bottom: ${bound.bottom}%;
          left: ${bound.left}%;
          right: ${bound.right}%;
        "></div>
    `);
  },
  _showAnnotationContorls(pageEl, annotation) {
    const popup = $.popup(annotation);
    if (!popup.html)
      return;

    const pageNum = parseInt(pageEl.getAttribute('data-page-number'));
    const bound = $._bound(annotation.rects[pageNum]);
    $._annotationsLayer(pageNum).insertAdjacentHTML('beforeend', `
      <div paws-annotation-id="${annotation.id}"
        class="paws__annotation-${annotation.id} paws__annotation-controls"
        style="
          top: calc(${Math.abs(100 - bound.bottom)}% + 10px);
          left: calc(${bound.left + (Math.abs(100 - bound.right) - bound.left) / 2}% - (${popup.width} / 2));
          width: ${popup.width};
        ">
          ${popup.html}
        </div>
    `);
  },
  _clearAnnotationBoundaries(pageEl) {
    pageEl.querySelectorAll(`.paws__annotations .paws__annotation-bound`)
      .forEach(boundEl => boundEl.remove());
  },
  _clearAnnotationControls(pageEl) {
    pageEl.querySelectorAll(`.paws__annotations .paws__annotation-controls`)
      .forEach(boundEl => boundEl.remove());
  },
  _renderAnnotations(annotation) {
    // for each page
    Object.keys(annotation.rects).map(parseInt).forEach(pageNum => {
      const annotationsEl = $._annotationsLayer(pageNum);
      annotationsEl.querySelectorAll(
        `.paws__annotation-${annotation.id}.paws__annotation-rect`
      ).forEach(rect => rect.remove());

      // show hightlight rects
      annotation.rects[pageNum].forEach(rect => {
        annotationsEl.insertAdjacentHTML('beforeend', `
          <div class="
              paws__annotation-${annotation.id} 
              paws__annotation-rect 
              ${annotation.type ? 'paws__annotation-rect-' + annotation.type : ''}
            " paws-annotation-id="${annotation.id}" style="
              top: calc(${rect.top}% + 1px);
              bottom: calc(${rect.bottom}% + 1px);
              left: ${rect.left}%;
              right: ${rect.right}%;
              --annotation-color: ${annotation.color || 'rgb(255, 212, 0)'};
            "></div>
        `);
      })
    });
  },
  _bound(rects) {
    return {
      left: Math.min(...rects.map(rect => rect.left)),
      right: Math.min(...rects.map(rect => rect.right)),
      top: Math.min(...rects.map(rect => rect.top)),
      bottom: Math.min(...rects.map(rect => rect.bottom)),
    };
  },
  _selection() {
    return $.window.getSelection();
  },
  _createAnnotationOnHighlight() {
    let down = false, dragged = false;
    $.document.addEventListener('mousedown', $event => down = true);
    $.document.addEventListener('mousemove', $event => dragged = down);
    $.document.addEventListener('mouseup', $event => {
      down = false;
      if (!dragged)
        return

      const selection = $._selection();
      if (selection.rangeCount < 1)
        return;

      const range = selection.getRangeAt(0);
      let rects: any[] = Array.from(range.getClientRects());
      selection.removeAllRanges();

      rects = $._attachPageNum(rects);
      rects = $._filterRects(rects);
      rects = $._mergeRects(rects);
      if (rects.length < 1)
        return;

      rects = $._groupByPageNum(rects);
      const annotation = { id: uuid(), type: 'highlight', rects };
      $._addAnnotation(annotation);

      // const pageEl = $._pageEl($._pageNum($event.target));
      $._renderAnnotations(annotation);
    })
  },
  _addAnnotation(annotation) {
    $.annotations.push(annotation);
    localStorage.setItem('paws--annotations', JSON.stringify($.annotations));
  },
  _relativeRect({ top, left, right, bottom, width, height, page }) {
    const pageEl = $._pageEl(page);

    let pRect = pageEl.getBoundingClientRect();
    const b = parseFloat(getComputedStyle(pageEl).borderWidth);
    const pTop = pRect.top + b;
    const pLeft = pRect.left + b;
    const pBottom = pRect.bottom - b;
    const pRight = pRect.right - b;
    const pHeight = pRect.height - b * 2;
    const pWidth = pRect.width - b * 2;

    top = (top - pTop) / pHeight * 100;
    left = (left - pLeft) / pWidth * 100;
    bottom = (pBottom - bottom) / pHeight * 100;
    right = (pRight - right) / pWidth * 100;
    width = width / pWidth * 100;
    height = height / pHeight * 100;

    return { top, left, right, bottom, width, height, page };
  },
  _groupByPageNum(rects) {
    return $._attachPageNum(rects)
      .map(rect => $._relativeRect(rect))
      .reduce((groups, { left, top, bottom, right, width, height, page }) => {
        if (!groups[page])
          groups[page] = [];
        groups[page].push({ left, top, bottom, right, width, height });
        return groups;
      }, {});
  },
  _attachPageNum(rects) {
    return rects.map(({ left, top, right, bottom, width, height }) => {
      let pointEl = $.iframe.contentDocument.elementFromPoint(left, top);
      let page: any = null;
      // as PDF.js (3.4.112): everything is markedContent
      if (pointEl && pointEl.closest('.markedContent')) {
        pointEl = pointEl.closest('.pdfViewer .page');
        page = parseInt(pointEl.getAttribute('data-page-number'));
      }
      return { left, top, right, bottom, width, height, page };
    });
  },
  _filterRects(rects) {
    return rects.filter(rect => rect.page && rect.width > 0 && rect.height > 0);
  },
  _mergeRects(rects) {
    rects = rects.sort((a, b) => (a.width * a.height) - (b.width * b.height));

    // TODO: using 'ignore' may not be efficient

    // merge horizontal rects
    for (var i = 1; i < rects.length; i++)
      for (var j = 0; j < i; j++) {
        const a = rects[i], b = rects[j];
        if (!b.ignore && a.top == b.top && a.bottom == b.bottom && b.right >= a.left) {
          a.ignore = b.ignore = true;
          const left = Math.min(a.left, b.left),
            right = Math.max(a.right, b.right);
          rects.push({
            top: b.top,
            bottom: b.bottom,
            left,
            right,
            height: a.bottom - a.top,
            width: right - left
          });
        }
      }

    rects = rects.filter(rect => !rect.ignore);
    // merge completely-overlapping rects
    for (let i = 1; i < rects.length; i++)
      for (let j = 0; j < i; j++) {
        const a = rects[i], b = rects[j];
        if (!b.ignore && b.left >= a.left && b.top >= a.top && b.right <= a.right && b.bottom <= a.bottom) {
          b.ignore = true;
          break;
        }
      }

    rects = rects.filter(rect => !rect.ignore);
    return rects;
  },
  _addStyleSheet() {
    $.document.querySelector('head').insertAdjacentHTML('beforeend',
      `<style typs="text/css">
        .paws__annotations {
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          line-height: 1;
          overflow: hidden;
          pointer-events: none; 
          text-size-adjust: none;
          forced-color-adjust: none;
          transform-origin: 0 0;
          z-index: 5;
        }

        .paws__annotation-bound { 
          position: absolute;
          pointer-events: auto; 
          border-radius: 5px;
          border: 1px dashed blue;
        }

        .paws__annotation-controls {
          position: absolute;
          pointer-events: auto; 
          border-radius: 5px;
          padding: 0.3rem 0.5rem;
          box-shadow: rgba(0, 0, 0, 0.5) 0px 5px 15px;
          background: white;
          display: flex;
          flex-direction: column;
          row-gap: 0.25rem;
        }

        .paws__annotation-rect {
          position: absolute;
          pointer-events: auto; 
          border-radius: 5px;
        }
      </style>`);
  }
}

const annotator = $;
export default annotator;