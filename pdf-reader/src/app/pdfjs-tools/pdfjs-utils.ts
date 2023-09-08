import { environment } from "src/environments/environment";

export const scrollTo = async (document, pdfjs, { page, top, left, dest }: any) => {
  if (dest)
    pdfjs.pdfViewer.scrollPageIntoView({ pageNumber: page, destArray: dest });
  else {
    if (pdfjs.pdfViewer.scrollMode == 3)
      pdfjs.page = page; // for certain page layout, set page first
    const pageEl = document.querySelector(`.pdfViewer .page[data-page-number="${page}"]`);
    const { width, height } = pageEl.getBoundingClientRect();
    const container = document.getElementById('viewerContainer');
    container.scrollTop = pageEl.offsetTop + (top * height - 0.075);
    container.scrollLeft = pageEl.offsetLeft + (left * width);
  }
}

export const inSameOrigin = (api: string) => {
  return api.startsWith(window.location.origin) || api.startsWith(environment.apiUrl);
}

export const loadPlugin = ({ url, iframe, pdfjs, storage, annotator, loaded, failed }) => {
  const funcName = url.split('/').reverse()[0].replace('.js', '').replaceAll('-', '_');
  var script = iframe.contentDocument.createElement('script');
  script.src = url;
  script.onload = () => {
    iframe.contentWindow[funcName]({ iframe, pdfjs, storage, annotator });
    loaded?.();
  }
  script.onerror = () => failed?.();
  iframe.contentDocument.head.appendChild(script);
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

