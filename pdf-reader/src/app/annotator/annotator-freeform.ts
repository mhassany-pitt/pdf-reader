import {
  Rect, closestPageEl, createUniqueId, getPageEl, getPageNum,
  htmlToElements, relativeToPageEl, rotateRect, rotation
} from './utils';

type Freeform = {
  bound: Rect,
  dataUrl: string,
};

type FreeformAnnotation = {
  id: string,
  type: string,
  freeforms: {
    [pageNum: number]: Freeform
  }
};

const annotatorFreeform = ({ iframe, pdfjs, annotator, store }) => {
  const window = iframe?.contentWindow;
  const document = iframe?.contentDocument;
  const documentEl = document.documentElement;

  const state = {
    enabled: false,
    canvases: {} as { [pageNum: number]: HTMLCanvasElement },
    selected: null as any
  };

  const getOrAttachMenuEl = (pageEl: HTMLElement): HTMLElement => {
    if (!pageEl.querySelector('.paws-annotation-freeforms-menu'))
      pageEl.appendChild(htmlToElements(`<div class="paws-annotation-freeforms-menu"></div>`));
    return pageEl.querySelector('.paws-annotation-freeforms-menu') as HTMLElement;
  }

  const getCanvasEl = (pageEl: HTMLElement) =>
    pageEl.querySelector('.paws-annotation-freeform-canvas');

  const getOrAttachCanvasEl = (pageNum: number): HTMLCanvasElement => {
    const pageEl = getPageEl(document, pageNum);
    if (!pageEl.querySelector('.paws-annotation-freeform-canvas'))
      pageEl.appendChild(htmlToElements(`<canvas class="paws-annotation-freeform-canvas"></canvas>`));
    return pageEl.querySelector('.paws-annotation-freeform-canvas');
  }

  const enableFreeform = (canvasEl: HTMLCanvasElement) => {
    const parentStyle = getComputedStyle(canvasEl.parentElement as Element);
    canvasEl.width = parseFloat(parentStyle.width.replace('px', ''));
    canvasEl.height = parseFloat(parentStyle.height.replace('px', ''));

    const context = canvasEl.getContext('2d') as CanvasRenderingContext2D;
    context.lineWidth = 1;

    let drawing = false;
    canvasEl.onmouseup = ($event) => drawing = false;
    canvasEl.onmousedown = ($event) => {
      if ($event.button === 0) {
        drawing = true;
        context.beginPath();
        context.moveTo($event.offsetX, $event.offsetY);
      }
    };
    canvasEl.onmousemove = ($event) => {
      if (drawing && $event.button === 0) {
        context.lineTo($event.offsetX, $event.offsetY);
        context.stroke();
      }
    };
  }

  const hideMenu = (pageEl: HTMLElement) => getOrAttachMenuEl(pageEl).remove();
  const showMenu = (pageEl: HTMLElement, $event: any) => {
    const pageNum = parseInt(pageEl.getAttribute('data-page-number') || '-1');
    if (pageNum < 0)
      return;

    let mouseXY = { top: $event.y, left: $event.x, page: pageNum };
    mouseXY = relativeToPageEl(mouseXY as any, pageEl);

    const contextMenuEl = htmlToElements(
      `<div class="paws-annotation-freeforms-menu__container" 
            style="top: ${mouseXY.top}%; left: ${mouseXY.left}%;"> ${state.enabled
        ? `<button onclick="window.$a2ntfform.disable(${pageNum})">disable freeform</button>`
        : `<button onclick="window.$a2ntfform.enable(${pageNum})">enable freeform</button>`}
      </div>`);

    getOrAttachMenuEl(pageEl).appendChild(contextMenuEl);;
  }

  const getCroppedCanvas = (canvasEl: HTMLCanvasElement) => {
    const orgContext = canvasEl.getContext('2d') as CanvasRenderingContext2D;
    const orgContent = orgContext.getImageData(0, 0, canvasEl.width, canvasEl.height).data;
    const bound = canvasEl.getBoundingClientRect();

    let left = canvasEl.width;
    let top = canvasEl.height;
    let right = 0;
    let bottom = 0;
    for (let i = 0; i < orgContent.length; i += 4) {
      const x = (i / 4) % canvasEl.width;
      const y = Math.floor((i / 4) / canvasEl.width);
      if (orgContent[i + 3] > 0) {
        left = Math.min(x, left);
        right = Math.max(x, right);
        top = Math.min(y, top);
        bottom = Math.max(y, bottom);
      }
    }
    const width = right - left + 1;
    const height = bottom - top + 1;

    const croppedEl = document.createElement('canvas');
    croppedEl.width = width;
    croppedEl.height = height;
    const croppedContext = croppedEl.getContext('2d');
    const croppedContent = orgContext.getImageData(left, top, width, height);
    croppedContext.putImageData(croppedContent, 0, 0);

    const cropped = {
      left: bound.left + left,
      top: bound.top + top,
      right: bound.left + right,
      bottom: bound.top + bottom,
      width,
      height,
      canvas: croppedEl
    };

    return cropped.width < 1 || cropped.height < 1 ? null : cropped;
  }

  const render = (annot: FreeformAnnotation) => {
    Object.keys(annot.freeforms)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = annotator.getOrAttachAnnotLayerEl(pageNum);
        annotsLayerEl.querySelectorAll(`[paws-annotation-id="${annot.id}"].paws-annotation__freeform`)
          .forEach((el: any) => el.remove());

        const degree = rotation(pdfjs);
        const freeform = annot.freeforms[pageNum];
        const bound = rotateRect(degree, true, freeform.bound);

        const boundEl = htmlToElements(
          `<div paws-annotation-id="${annot.id}" 
          class="paws-annotation__freeform"
          tabindex="-1" 
          style="
            top: ${bound.top}%;
            bottom: ${bound.bottom}%;
            left: ${bound.left}%;
            right: ${bound.right}%;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
        </div>`);

        const image = new Image();
        image.src = freeform.dataUrl;
        image.style.position = 'relative';
        image.style.transform = `rotate(${degree}deg)`;
        image.style.pointerEvents = 'none';

        boundEl.appendChild(image);
        annotsLayerEl.appendChild(boundEl);

        const computedStyle = getComputedStyle(boundEl);
        image.style.width = degree == 90 || degree == 270 ? computedStyle.height : computedStyle.width;
        image.style.height = degree == 90 || degree == 270 ? computedStyle.width : computedStyle.height;
      });
  }

  { // on pdfjs pagerendered, render annotations
    pdfjs.eventBus.on('pagerendered', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = annotator.getOrAttachAnnotLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.paws-annotation__freeform').forEach((el: any) => el.remove());

      (store.annotations as FreeformAnnotation[])
        .filter(ant => ant.type == 'freeform')
        .filter(annot => Object.keys(annot.freeforms)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(ant => render(ant));
    });
  }

  { // reattach missing canvas
    pdfjs.eventBus.on('pagechanging', ($event: any) => {
      if (state.enabled) {
        const pageNum = $event.pageNumber;
        const pageEl = getPageEl(document, pageNum);
        if (pageNum in state.canvases && !getCanvasEl(pageEl))
          pageEl.appendChild(state.canvases[pageNum]);
      }
    });
  }

  { // attach required canvas
    documentEl.addEventListener('mousedown', ($event: any) => {
      if (state.enabled && $event.button === 0) {
        const pageEl = closestPageEl($event.target);
        if (!pageEl)
          return;

        const pageNum = getPageNum(pageEl);
        if (!(pageNum in state.canvases)) {
          const canvasEl = getOrAttachCanvasEl(pageNum);
          state.canvases[pageNum] = canvasEl;
          enableFreeform(canvasEl);
          canvasEl?.dispatchEvent(new MouseEvent($event.type, $event));
        }
      }
    });
  }

  { // attach stylesheet
    documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/annotator-freeform.css" />`
    ));
  }

  { // show freeform popup and freeform boundary on click
    documentEl.addEventListener('click', ($event: any) => {
      const pageEl = closestPageEl($event.target);
      if (!pageEl)
        return;

      const classList = $event.target.classList;

      if (!classList.contains('paws-annotation__bound')) {
        // pageEl.querySelectorAll(`.paws-annotation__bound`)
        //       .forEach((el: any) => el.remove()); --> handled by annotator
        state.selected = null;
      }

      // show the boundary for the clicked freeform
      if (classList.contains('paws-annotation__freeform')) {
        const annotId = $event.target.getAttribute('paws-annotation-id');
        state.selected = store.read(annotId);

        const pageNum = parseInt(pageEl.getAttribute('data-page-number') || '');
        annotator.showBoundary(pageNum, state.selected, state.selected.freeforms[pageNum].bound);
      }

      // hide context menu if clicked outside it
      if (!classList.contains('paws-annotation-freeforms-menu__container')
        && !$event.target.closest('.paws-annotation-freeforms-menu__container')) {
        hideMenu(pageEl);
      }
    });
  }

  { // show freeforms on click
    documentEl.addEventListener('contextmenu', ($event: any) => {
      $event.preventDefault();
      const pageEl = closestPageEl($event.target);
      if (!pageEl)
        return;

      hideMenu(pageEl);
      showMenu(pageEl, $event);
    });
  }

  { // attach event handlers
    window.$a2ntfform = window.$a2ntfform || {};
    window.$a2ntfform.enable = (pageNum: number) => {
      state.enabled = true;
      const pageEl = getPageEl(document, pageNum);
      hideMenu(pageEl);
    };
    window.$a2ntfform.disable = (pageNum: number) => {
      state.enabled = false;
      state.canvases = {};
      const pageEl = getPageEl(document, pageNum);
      hideMenu(pageEl);

      const annot = { id: createUniqueId(), type: 'freeform', freeforms: {} };
      document.querySelectorAll('.paws-annotation-freeform-canvas')
        .forEach((canvasEl: HTMLCanvasElement) => {
          const cropped = getCroppedCanvas(canvasEl);;
          if (cropped) {
            const { canvas, ...attrs } = cropped;
            const pageEl = closestPageEl(canvasEl);
            const page = getPageNum(pageEl);

            const { page: tmp, ...bound } = relativeToPageEl({ ...attrs, page }, pageEl);
            annot.freeforms[page] = { dataUrl: canvas.toDataURL(), bound };
          }

          canvasEl.remove();
        });

      if (Object.keys(annot.freeforms).length) {
        store.create(annot);
        render(annot);
      }
    };
  }

  { // on delete/backspace, delete the selected annotation
    documentEl.addEventListener('keydown', ($event: any) => {
      if (state.selected
        && ($event.key == 'Delete' || $event.key == 'Backspace')
        && $event.target.classList.contains('paws-annotation__bound')) {
        documentEl.querySelectorAll(`.paws-annotations [paws-annotation-id="${state.selected.id}"]`)
          .forEach((el: any) => el.remove());
        store.delete(state.selected);
        state.selected = null;
      }
    });
  }

  return {};
};

export default annotatorFreeform;
