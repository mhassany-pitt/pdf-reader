import { v4 as uuid } from 'uuid';

const annotator = (iframe: any, pdfjs: any) => {
  const window = iframe?.contentWindow;
  const document = iframe?.contentDocument;
  const documentEl = document.documentElement;

  const state = {
    annotations: [] as any[],
    selected: null as any,
  };

  // --- annotation create/update/delete/list
  const saveAnnotations = () => localStorage.setItem('paws--annotations', JSON.stringify(state.annotations));
  const loadAnnotations = () => state.annotations = JSON.parse(localStorage.getItem('paws--annotations') || '[]');

  const findAnnotationById = (id: string) => state.annotations.filter(a => a.id == id)[0];
  const addAnnotation = (annotation) => {
    state.annotations.push(annotation);
    render(annotation);
    clearSelection();
    saveAnnotations();
  }
  const removeAnnotation = (annotation) => {
    state.annotations.splice(state.annotations.indexOf(annotation), 1);
    documentEl.querySelectorAll(`.paws__annotations [paws-annotation-id="${annotation.id}"]`).forEach(el => el.remove());
    saveAnnotations();
  }

  // --- renderers
  const render = (annotation) => {
    // for each page, show annotation rects
    Object.keys(annotation.rects).map(parseInt).forEach(pageNum => {
      const annotationsEl = getAnnotationLayerEl(pageNum);
      annotationsEl.setAttribute('data-rotation-degree', rotationDegree());
      annotationsEl.querySelectorAll(
        `.paws__annotation-${annotation.id}.paws__annotation-rect`
      ).forEach(el => el.remove());

      annotation.rects[pageNum]
        .map(rect => rotateRectBound(rotationDegree(), true, rect))
        .forEach(rect => {
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
  }
  const hideAnnotationBoundaries = (pageEl) => pageEl.querySelectorAll(`.paws__annotation-bound`).forEach(el => el.remove());
  const showAnnotationBoundary = (pageEl, annotation) => {
    const pageNum = parseInt(pageEl.getAttribute('data-page-number'));
    const bound = rotateRectBound(rotationDegree(), true, calcRectsBound(annotation.rects[pageNum]));
    getAnnotationLayerEl(pageNum).insertAdjacentHTML('beforeend', `
      <div paws-annotation-id="${annotation.id}"
        class="paws__annotation-${annotation.id} paws__annotation-bound" 
        style="
          top: ${bound.top}%;
          bottom: ${bound.bottom}%;
          left: ${bound.left}%;
          right: ${bound.right}%;
        ">
      </div>
    `);
  }

  // rect helpers
  const clearSelection = () => window.getSelection().removeAllRanges();
  const getSelectionRects = () => {
    const selection = window.getSelection();
    if (window.getSelection().rangeCount < 1)
      return null;

    const range = selection.getRangeAt(0);
    let rects: any[] = Array.from(range.getClientRects());

    rects = attachPageNum(rects);
    rects = rects.filter(rect => rect.page && rect.width > 0 && rect.height > 0);
    rects = mergeRects(rects);
    if (rects.length < 1)
      return null;

    rects = groupRectsByPageNum(rects);
    for (const page of Object.keys(rects))
      rects[page] = rects[page].map(rect => rotateRectBound(rotationDegree(), false, rect));

    return rects;
  }
  const rotateRectBound = (degree, clockwise, rect) => {
    let values = [rect.top, rect.left, rect.bottom, rect.right];
    const steps = (degree % 360) / 90;

    values = clockwise
      ? values.slice(steps).concat(values.slice(0, steps))
      : values.slice(4 - steps).concat(values.slice(0, 4 - steps));

    return {
      top: values[0],
      left: values[1],
      bottom: values[2],
      right: values[3],
    }
  }
  const calcRectsBound = (rects: any[]) => {
    return {
      left: Math.min(...rects.map(rect => rect.left)),
      right: Math.min(...rects.map(rect => rect.right)),
      top: Math.min(...rects.map(rect => rect.top)),
      bottom: Math.min(...rects.map(rect => rect.bottom)),
    };
  }
  const toRelativeRect = ({ top, left, right, bottom, width, height, page }) => {
    const pageEl = getPageEl(page);

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
  }
  const groupRectsByPageNum = (rects) => {
    return attachPageNum(rects)
      .map(rect => toRelativeRect(rect))
      .reduce((groups, { left, top, bottom, right, width, height, page }) => {
        if (!groups[page])
          groups[page] = [];
        groups[page].push({ left, top, bottom, right, width, height });
        return groups;
      }, {});
  }
  const attachPageNum = (rects) => {
    return rects.map(({ left, top, right, bottom, width, height }) => {
      let pointEl = document.elementFromPoint(left, top);
      let page: any = null;
      // as PDF.js (3.4.112): everything is markedContent
      if (pointEl && pointEl.closest('.markedContent')) {
        pointEl = pointEl.closest('.pdfViewer .page');
        page = parseInt(pointEl.getAttribute('data-page-number'));
      }
      return { left, top, right, bottom, width, height, page };
    });
  }
  const mergeRects = (rects) => {
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

    return rects.filter(rect => !rect.ignore);
  }

  // --- page/annotation-layer helpers
  const rotationDegree = () => pdfjs.pdfViewer.pagesRotation;
  const closestPageEl = (child: any) => child.closest(`.pdfViewer .page`);
  const getPageEl = (pageNum: number) => documentEl.querySelector(`.pdfViewer .page[data-page-number="${pageNum}"]`);
  const getAnnotationLayerEl = (pageNum: number) => {
    const pageEl = getPageEl(pageNum);
    if (!pageEl.querySelector('.paws__annotations'))
      pageEl.insertAdjacentHTML('beforeend', `<div class="paws__annotations"></div>`);
    return pageEl.querySelector('.paws__annotations');
  }

  { // attach annotator stylesheet
    documentEl.querySelector('head').insertAdjacentHTML('beforeend',
      `<link rel="stylesheet" type="text/css" href="/assets/annotator.css" />`);
  }

  { // on pdfjs pagerendered, render annotations
    pdfjs.eventBus.on('pagerendered', $event => {
      const pageNum = $event.pageNumber;
      getAnnotationLayerEl(pageNum).replaceChildren();

      state.annotations.filter(annotation => // filter for current page
        Object.keys(annotation.rects).map(parseInt).indexOf(pageNum) > -1
      ).forEach(annotation => render(
        { ...annotation, rects: { [pageNum]: annotation.rects[pageNum] } }
      ));
    });
  }

  { // show annotation boundary and controls on click
    documentEl.addEventListener('click', $event => {
      const pageEl = closestPageEl($event.target);
      if (!pageEl)
        return;

      if (
        !$event.target.classList.contains('paws__annotation-bound') &&
        !$event.target.classList.contains('paws__annotation-controls') &&
        !$event.target.closest('.paws__annotation-controls')
      ) {
        state.selected = null;
        hideAnnotationBoundaries(pageEl);
      }

      if ($event.target.classList.contains('paws__annotation-rect')) {
        const id = $event.target.getAttribute('paws-annotation-id');

        state.selected = findAnnotationById(id);
        showAnnotationBoundary(pageEl, state.selected);
      }
    });
  }

  { // on text selection, add annotation or show controls
    let down = false, dragged = false;
    documentEl.addEventListener('mousedown', $event => down = true);
    documentEl.addEventListener('mousemove', $event => dragged = down);
    documentEl.addEventListener('mouseup', $event => {
      down = false;
      if (!dragged)
        return

      if (!$.onTextSelection)
        return;

      $.onTextSelection($event);
    });
  }

  { // on delete/backspace, delete the selected annotation
    documentEl.addEventListener('keydown', $event => {
      if ((
        state.selected &&
        $event.key == 'Delete' || $event.key == 'Backspace') &&
        !$event.target.closest('.paws__annotation-controls')
      ) {
        removeAnnotation(state.selected);
        state.selected = null;
      }
    });
  }

  const $ = {
    saveAnnotations,
    loadAnnotations,
    addAnnotation,
    removeAnnotation,
    findAnnotationById,
    rotationDegree,
    rotateRectBound,
    calcRectsBound,
    getSelectionRects,
    closestPageEl,
    getPageEl,
    getAnnotationLayerEl,
    render,
    onTextSelection: ($event) => {
      const rects = getSelectionRects();
      if (!rects)
        return;

      addAnnotation({ id: uuid(), type: 'highlight', rects });
    }
  }

  loadAnnotations();

  return $;
};

export default annotator;