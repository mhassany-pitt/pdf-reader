import { environment } from "src/environments/environment";
import { getCurrentBrowserFingerPrint } from '@rajesh896/broprint.js';
import { ActivatedRoute } from "@angular/router";

import { v4 } from 'uuid';

// -- utils functions

export const uuid = v4;
export type Rect = { top: number, left: number, right: number, bottom: number }
export type WHRect = Rect & { width: number, height: number }
export type PageRect = WHRect & { page: number };

export const htmlToElements = (html: string) => {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  return temp.firstChild as HTMLElement;
}

export const getPageNum = (pageEl: HTMLElement) => parseInt(pageEl.getAttribute('data-page-number') || '');
export const getPageNumAtRect = (document: Document, rect: WHRect): number => {
  const pointEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  if (pointEl) {
    const pageEl = getPageEl(pointEl);
    if (pageEl) return getPageNum(pageEl);
  }
  return null as any;
}
export const getPageEl = (el: any, pageNum?: number) => {
  return pageNum
    ? el.querySelector(`.pdfViewer .page[data-page-number="${pageNum}"]`)
    : el.closest(`.pdfViewer .page`);
}

export const relativeToPageEl = (rect: PageRect, pageEl: any): PageRect => {
  let { top, left, right, bottom, width, height, ...other } = rect;

  let prect = pageEl.getBoundingClientRect();
  const b = parseFloat(getComputedStyle(pageEl).borderWidth);
  const pTop = prect.top + b;
  const pLeft = prect.left + b;
  const pBottom = prect.bottom - b;
  const pRight = prect.right - b;
  const pHeight = prect.height - b * 2;
  const pWidth = prect.width - b * 2;

  top = parseFloat(((top - pTop) / pHeight * 100).toFixed(3));
  left = parseFloat(((left - pLeft) / pWidth * 100).toFixed(3));
  bottom = parseFloat(((pBottom - bottom) / pHeight * 100).toFixed(3));
  right = parseFloat(((pRight - right) / pWidth * 100).toFixed(3));
  width = parseFloat((width / pWidth * 100).toFixed(3));
  height = parseFloat((height / pHeight * 100).toFixed(3));

  return { top, left, right, bottom, width, height, ...other };
}

export const getSelectionRects = (document: Document, pdfjs: any) => {
  const selection = document.getSelection();
  if (!selection || selection.rangeCount < 1)
    return null;

  const range = selection.getRangeAt(0);
  const rects: WHRect[] = Array.from(range.getClientRects());

  const merged = mergeRects(rects)
    .map(rect => ({ ...rect, page: getPageNumAtRect(document, rect) }))
    .filter(rect => rect.page && rect.width > 0 && rect.height > 0);

  if (merged.length < 1)
    return null;

  const relative = merged.map(rect =>
    relativeToPageEl(rect, getPageEl(document, rect.page)));

  const grouped = groupByPageNum(relative);
  for (const pageNum of Object.keys(grouped)) {
    grouped[pageNum] = grouped[pageNum].map((rect: WHRect) => {
      // in case page rotation != 0, rotate it back to 0
      return rotateRect(rotation(pdfjs), false, rect);
    });
  }

  return grouped;
}

export const mergeRects = (rects: WHRect[]): WHRect[] => {
  type IgnorableRect = WHRect & { ignore?: boolean };
  let $rects = rects.map(({ top, right, bottom, left, width, height }) =>
    ({ top, right, bottom, left, width, height })) as IgnorableRect[];
  $rects = $rects.sort((a, b) => (a.width * a.height) - (b.width * b.height));

  // merge horizontal rects
  for (var i = 1; i < $rects.length; i++)
    for (var j = 0; j < i; j++) {
      const a = $rects[i];
      const b = $rects[j];

      if (!b.ignore
        && a.top == b.top
        && a.bottom == b.bottom
        && b.right >= a.left
      ) {
        a.ignore = b.ignore = true;
        const left = Math.min(a.left, b.left);
        const right = Math.max(a.right, b.right);

        $rects.push({
          top: b.top,
          bottom: b.bottom,
          left,
          right,
          height: a.bottom - a.top,
          width: right - left,
        });
      }
    }

  $rects = $rects.filter(rect => !rect.ignore);
  // merge completely-overlapping rects
  for (let i = 1; i < $rects.length; i++)
    for (let j = 0; j < i; j++) {
      const a = $rects[i];
      const b = $rects[j];

      if (!b.ignore
        && b.left >= a.left
        && b.top >= a.top
        && b.right <= a.right
        && b.bottom <= a.bottom
      ) {
        b.ignore = true;
        break;
      }
    }

  return $rects.filter(rect => !rect.ignore).map(rect => {
    const { ignore, ...attrs } = rect;
    return attrs;
  });
}

export const groupByPageNum = (rects: PageRect[]) => {
  const grouped: { [pageNum: number]: WHRect[] } = {};

  rects.filter(rect => (rect.left + rect.right) < 99.99 && (rect.top + rect.bottom) < 99.99)
    .forEach((rect) => {
      if (!grouped[rect.page])
        grouped[rect.page] = [];
      const { page, ...attrs } = rect;
      grouped[rect.page].push(attrs);
    });

  return grouped;
}

export const rotateRect = (degree: 0 | 90 | 180 | 270, clockwise: boolean, rect: WHRect) => {
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
    width: degree == 90 || degree == 180 ? rect.height : rect.width,
    height: degree == 90 || degree == 180 ? rect.width : rect.height,
  }
}

export const getBound = (rects: WHRect[]): WHRect => {
  return {
    left: Math.min(...rects.map(rect => rect.left)),
    right: Math.min(...rects.map(rect => rect.right)),
    top: Math.min(...rects.map(rect => rect.top)),
    bottom: Math.min(...rects.map(rect => rect.bottom)),
    width: 0,
    height: 0,
  };
}

export const scale = (pdfjs: any) => pdfjs.pdfViewer.currentScale;
export const rotation = (pdfjs: any) => pdfjs.pdfViewer.pagesRotation;

export const isLeftClick = ($event: any, checkType = false) => (!checkType || $event.type == 'click') && $event.button === 0;
export const isRightClick = ($event: any, checkType = false) => (!checkType || $event.type == 'contextmenu') && $event.button === 2;

export const getOrParent = ($event: any, selector: string) => {
  return $event.target.classList.contains(selector) ? $event.target : $event.target.closest(selector);
}

export const getAnnotEl = (el: HTMLElement): HTMLElement => {
  return (el.getAttribute('data-annotation-id') ? el : el.closest('[data-annotation-id]')) as any;
}

export const getAnnotBound = ($event: any): WHRect => {
  return getAnnotElBound(getAnnotEl($event.target));
}

export const getAnnotElBound = (el: any): WHRect => {
  if (!el) return null as any;
  const annotId = el.getAttribute('data-annotation-id');
  const annotLayerEl = el.closest('.pdf-annotations');
  const annotEls = Array.from(annotLayerEl.querySelectorAll(`[data-annotation-id="${annotId}"]`));
  const pageEl = getPageEl(el);
  const annotElsBound = annotEls.map((el: any) => {
    const { left, right, top, bottom, width, height } = relativeToPageEl(el.getBoundingClientRect(), pageEl);
    return { left, right, top, bottom, width, height };
  });
  return getBound(annotElsBound);
}

export const removeSelectorAll = (el: HTMLElement, selector: string) =>
  el?.querySelectorAll(selector).forEach((el: any) => el.remove());

export const scrollTo = async (document, pdfjs, { page, top, left, dest }: any) => {
  if (dest)
    pdfjs.pdfViewer.scrollPageIntoView({ pageNumber: page, destArray: dest });
  else {
    if (pdfjs.pdfViewer.scrollMode == 3)
      pdfjs.page = page; // for certain page layout, set page first
    const pageEl = document.querySelector(`.pdfViewer .page[data-page-number="${page}"]`);
    const { width, height } = pageEl.getBoundingClientRect();
    const container = document.getElementById('viewerContainer');
    container.scrollTop = pageEl.offsetTop + (top / 100 - 0.075) * height;
    container.scrollLeft = pageEl.offsetLeft + (left / 100) * width;
  }
}

export const isSameOrigin = (api: string) => {
  return api.startsWith(window.location.origin) || api.startsWith(environment.apiUrl);
}

export const loadPlugin = ({ url, registry, loaded, failed }) => {
  const funcName = url.split('/').reverse()[0].replace('.js', '').replaceAll('-', '_');
  var script = registry.getDocument().createElement('script');
  script.src = url;
  script.onload = () => {
    registry.getWindow()[funcName]({ registry });
    loaded?.();
  };
  script.onerror = () => failed?.();
  registry.getDocument().head.appendChild(script);
}

export const num2Base62 = (num: number, pad?: number) => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const base62 = (chars[(num / chars.length) | 0] + chars[num % chars.length])
  return pad ? base62.padStart(pad, '0') : base62;
}

export const assignNumbering = (outline) => {
  const numbering = [0];
  for (const entry of outline) {
    if (entry.level == numbering.length) {
      numbering.push(1);
    } else if (entry.level == numbering.length - 2) {
      numbering.pop();
      numbering[numbering.length - 1]++;
    } else {
      numbering[numbering.length - 1]++;
    }
    entry.numbering = [...numbering];
  }
}

export const getUserId = async (route: ActivatedRoute) => {
  const user_id = route.snapshot.queryParamMap.get('user_id');
  return user_id || `guest:${await getCurrentBrowserFingerPrint()}`;
}

export const qparamsToString = (qparams?: any) => {
  return qparams ? Object.keys(qparams).map(k => `${k}=${qparams[k]}`).join('&') : '';
}

export const getValue = (str: string) => str.includes(':') ? str.split(':')[0] : str;
export const getLabel = (str: string) => str.includes(':') ? str.split(':')[1] : str;
