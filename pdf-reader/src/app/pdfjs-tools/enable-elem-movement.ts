import {
  closestPageEl, relativeToPageEl,
  WHRect, isLeftClick, getOrParent, getPageNum
} from './annotator-utils';

export class EnableElemMovement {
  constructor({ iframe, embedLinkViewer, freeformViewer, storage }) {
    const documentEl = iframe?.contentDocument.documentElement;

    let embedEl: HTMLElement;
    let freeformEl: HTMLElement;
    let el: HTMLElement;

    let isResizing: boolean;
    let startBound: DOMRect;
    let offsetBound: { left: number, top: number };
    documentEl.addEventListener("mousedown", ($event: any) => {
      if (!isLeftClick($event) || $event.ctrlKey)
        return;

      embedEl = getOrParent($event, 'pdfjs-annotation__embed');
      freeformEl = getOrParent($event, 'pdfjs-annotation__freeform');
      el = embedEl || freeformEl;

      startBound = el?.getBoundingClientRect();
      offsetBound = el ? {
        top: $event.clientY - startBound.top,
        left: $event.clientX - startBound.left
      } : null as any;

      isResizing = el
        && (el.offsetHeight - offsetBound.top) <= 16
        && (el.offsetWidth - offsetBound.left) <= 16;
    });

    let lastBound: WHRect;
    let timeout: any;
    documentEl.addEventListener("mousemove", ($event: any) => {
      if (!isLeftClick($event) || !el)
        return;

      const pageEl = closestPageEl(el);
      if (isResizing) {
        lastBound = relativeToPageEl({
          top: startBound.top,
          left: startBound.left,
          right: $event.clientX,
          bottom: $event.clientY,
          width: parseFloat((el.style.width).replace('px', '')),
          height: parseFloat((el.style.height).replace('px', '')),
        } as any, pageEl);
      } else { // isMoving
        const top = $event.clientY - offsetBound.top;
        const left = $event.clientX - offsetBound.left;
        lastBound = relativeToPageEl({
          top, left,
          right: left + startBound.width,
          bottom: top + startBound.height,
          height: startBound.height,
          width: startBound.width,
        } as any, pageEl);
      }

      if (lastBound) {
        el.style.top = `${lastBound.top}%`;
        el.style.left = `${lastBound.left}%`;
        el.style.right = `${lastBound.right}%`;
        el.style.bottom = `${lastBound.bottom}%`;
      }

      const target = embedEl ? 'embed' :
        (freeformEl ? 'freeform' : null);

      if (timeout)
        clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (target == 'embed')
          embedLinkViewer.fitIframeToParent($event.target);
        else if (target == 'freeform')
          freeformViewer.fitImageToParent($event.target);
      }, 300);
    });

    documentEl.addEventListener("mouseup", ($event: any) => {
      if (isLeftClick($event) && el && lastBound) {
        const annotId = el.getAttribute('data-annotation-id') as string;
        const annot = storage.read(annotId);
        const pageEl = closestPageEl(el);
        const pageNum = getPageNum(pageEl);

        if (embedEl)
          annot.bound = lastBound;
        else if (freeformEl) {
          const { dataUrl, ...bound } = annot.freeforms[pageNum];
          annot.freeforms[pageNum] = { dataUrl, ...lastBound };
        }

        storage.update(annot);
      }

      el = null as any;
      embedEl = null as any;
      freeformEl = null as any;
    });
  }
}