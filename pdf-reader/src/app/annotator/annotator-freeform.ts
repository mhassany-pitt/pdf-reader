import {
  Rect, closestPageEl, createUniqueId, getPageEl, getPageNum,
  htmlToElements, relativeToPageEl, rotateRect, rotation, scale
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
    canvasLineWidth: 2,
    canvasStrokeStyle: 'black',
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

  const rotateCanvas = (canvasEl: HTMLCanvasElement, rotationAngle: number) => {
    if (rotationAngle == 0)
      return;

    let $canvasEl = document.createElement('canvas');
    const flipSides = rotationAngle % 180 !== 0;
    $canvasEl.width = flipSides ? canvasEl.height : canvasEl.width;
    $canvasEl.height = flipSides ? canvasEl.width : canvasEl.height;

    const $context = $canvasEl.getContext('2d') as CanvasRenderingContext2D;
    if (rotationAngle == 90) $context.translate($canvasEl.width, 0);
    if (rotationAngle == 180)
      $context.translate($canvasEl.width, $canvasEl.height);
    if (rotationAngle == 270) $context.translate(0, $canvasEl.height);
    $context.rotate((rotationAngle * Math.PI) / 180);
    $context.drawImage(canvasEl, 0, 0);

    const context = canvasEl.getContext('2d') as CanvasRenderingContext2D;
    context.clearRect(0, 0, canvasEl.width, canvasEl.height);
    canvasEl.width = $canvasEl.width;
    canvasEl.height = $canvasEl.height;
    context.drawImage($canvasEl, 0, 0);
  }
  const angleDiff = (angle1: number, angle2: number) => {
    const angles = [0, 90, 180, 270];
    return angles[(angles.indexOf(angle2) - angles.indexOf(angle1) + angles.length) % angles.length];
  }
  const rotateCanvasLayerEl = (canvasEl: HTMLCanvasElement, angle?: number) => {
    const newAngle = angle === undefined ? rotation(pdfjs) : angle;
    const prevAngle = parseFloat(canvasEl.getAttribute('data-rotation') || '0');
    rotateCanvas(canvasEl, angleDiff(prevAngle, newAngle));
    canvasEl.setAttribute('data-rotation', `${newAngle}`);
  }

  const enableFreeform = (canvasEl: HTMLCanvasElement) => {
    const context = canvasEl.getContext('2d') as CanvasRenderingContext2D;

    // scale width/height
    const scaleFactor = 1 / scale(pdfjs);
    const pageElStyle = getComputedStyle(canvasEl.parentElement as HTMLElement);
    const width = scaleFactor * parseFloat(pageElStyle.width.replace('px', ''));
    const height = scaleFactor * parseFloat(pageElStyle.height.replace('px', ''));

    // flip width/height
    const rotationAngle = rotation(pdfjs);
    const flipSides = rotationAngle % 180 !== 0;
    canvasEl.width = flipSides ? height : width;
    canvasEl.height = flipSides ? width : height;

    context.lineJoin = 'round';
    context.lineCap = 'round';

    rotateCanvasLayerEl(canvasEl);

    let drawing = false;
    canvasEl.onmouseup = ($event) => drawing = false;
    canvasEl.onmousedown = ($event) => {
      if ($event.button === 0) {
        drawing = true;
        context.beginPath();
        const scaleFactor = 1 / scale(pdfjs);
        context.moveTo(scaleFactor * $event.offsetX, scaleFactor * $event.offsetY);
        context.lineWidth = state.canvasLineWidth;
        context.strokeStyle = state.canvasStrokeStyle;
      }
    };
    canvasEl.onmousemove = ($event) => {
      if (drawing && $event.button === 0) {
        const scaleFactor = 1 / scale(pdfjs);
        context.lineTo(scaleFactor * $event.offsetX, scaleFactor * $event.offsetY);
        context.stroke();
      }
    };
  }

  const hideMenu = () => {
    const menu = document.querySelector('.paws-annotation-freeforms-menu');
    menu?.remove();
  }

  const showMenu = (pageEl: HTMLElement, $event: any) => {
    const pageNum = parseInt(pageEl.getAttribute('data-page-number') || '-1');
    if (pageNum < 0)
      return;

    let mouseXY = { top: $event.y, left: $event.x, page: pageNum };
    mouseXY = relativeToPageEl(mouseXY as any, pageEl);

    const contextMenuEl = htmlToElements(
      `<div class="paws-annotation-freeforms-menu__container" 
            style="top: ${mouseXY.top}%; left: ${mouseXY.left}%;"> ${state.enabled
        ? (`<button onclick="window.$a2ntfform.disable(${pageNum})">disable freeform</button>
            <div style="display: flex">
              <button style="flex-grow: 1; font-weight: 100;" onclick="window.$a2ntfform.setStrokeWidth(1)">thin</button>
              <button style="flex-grow: 1; font-weight: normal;" onclick="window.$a2ntfform.setStrokeWidth(2)">normal</button>
              <button style="flex-grow: 1; font-weight: 900;" onclick="window.$a2ntfform.setStrokeWidth(3)">thick</button>
            </div>
            <div style="display: flex">
              <button style="flex-grow: 1; background-color: black;" onclick="window.$a2ntfform.setStrokeColor('black')">&nbsp;</button>
              <button style="flex-grow: 1; background-color: gray;" onclick="window.$a2ntfform.setStrokeColor('gray')">&nbsp;</button>
              <button style="flex-grow: 1; background-color: green;" onclick="window.$a2ntfform.setStrokeColor('green')">&nbsp;</button>
              <button style="flex-grow: 1; background-color: blue;" onclick="window.$a2ntfform.setStrokeColor('blue')">&nbsp;</button>
              <button style="flex-grow: 1; background-color: red;" onclick="window.$a2ntfform.setStrokeColor('red')">&nbsp;</button>
            </div>`)
        : `<button onclick="window.$a2ntfform.enable(${pageNum})">enable freeform</button>`}
      </div>`);

    getOrAttachMenuEl(pageEl).appendChild(contextMenuEl);;
  }

  const getCroppedCanvas = (canvasEl: HTMLCanvasElement) => {
    const canvasWidth = canvasEl.width;
    const canvasHeight = canvasEl.height;
    const context = canvasEl.getContext('2d') as CanvasRenderingContext2D;
    const content = context.getImageData(0, 0, canvasWidth, canvasHeight).data;

    let left = canvasEl.width;
    let top = canvasEl.height;
    let right = 0;
    let bottom = 0;
    for (let i = 0; i < content.length; i += 4) {
      const x = (i / 4) % canvasEl.width;
      const y = Math.floor((i / 4) / canvasEl.width);
      if (content[i + 3] > 0) {
        left = Math.min(x, left);
        right = Math.max(x, right);
        top = Math.min(y, top);
        bottom = Math.max(y, bottom);
      }
    }
    const width = right - left + 1;
    const height = bottom - top + 1;

    const $canvasEl = document.createElement('canvas');
    $canvasEl.width = width;
    $canvasEl.height = height;
    const $context = $canvasEl.getContext('2d');
    $context.putImageData(context.getImageData(left, top, width, height), 0, 0);

    return {
      left: parseFloat((left / canvasWidth * 100).toFixed(3)),
      top: parseFloat((top / canvasHeight * 100).toFixed(3)),
      right: parseFloat(((canvasWidth - right - 1) / canvasWidth * 100).toFixed(3)),
      bottom: parseFloat(((canvasHeight - bottom - 1) / canvasHeight * 100).toFixed(3)),
      canvas: $canvasEl
    };
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

  const reattachCanvasEl = (pageNum: number) => {
    if (state.enabled) {
      const pageEl = getPageEl(document, pageNum);
      if (pageNum in state.canvases && !getCanvasEl(pageEl)) {
        const canvasEl = state.canvases[pageNum];
        rotateCanvasLayerEl(canvasEl);
        pageEl.appendChild(canvasEl);
      }
    }
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

      reattachCanvasEl(pageNum);
    });
  }

  { // reattach missing canvas
    pdfjs.eventBus.on('pagechanging',
      ($event: any) => reattachCanvasEl($event.pageNumber));
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
        hideMenu();
      }
    });
  }

  { // show freeforms on click
    documentEl.addEventListener('contextmenu', ($event: any) => {
      $event.preventDefault();
      const pageEl = closestPageEl($event.target);
      if (!pageEl)
        return;

      hideMenu();
      showMenu(pageEl, $event);
    });
  }

  { // attach event handlers
    window.$a2ntfform = window.$a2ntfform || {};
    window.$a2ntfform.setStrokeWidth = (width: number) => {
      state.canvasLineWidth = width;
      hideMenu();
    }
    window.$a2ntfform.setStrokeColor = (color: string) => {
      state.canvasStrokeStyle = color;
      hideMenu();
    }
    window.$a2ntfform.enable = (pageNum: number) => {
      state.enabled = true;
      hideMenu();
    };
    window.$a2ntfform.disable = (pageNum: number) => {
      state.enabled = false;
      const canvases = state.canvases;
      state.canvases = {};
      hideMenu();

      const annot = { id: createUniqueId(), type: 'freeform', freeforms: {} };

      for (const key of Object.keys(canvases)) {
        const pageNum = parseInt(key);
        const canvasEl = canvases[pageNum];
        rotateCanvasLayerEl(canvasEl, 0);
        const cropped = getCroppedCanvas(canvasEl);
        if (cropped) {
          const { canvas, ...bound } = cropped;
          annot.freeforms[pageNum] = { dataUrl: canvas.toDataURL(), bound };
        }
        canvasEl.remove();
      }

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