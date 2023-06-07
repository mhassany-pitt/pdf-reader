import { environment } from "src/environments/environment";

export const scrollTo = (document, pdfjs, { page, top, left }) => {
  if (pdfjs.pdfViewer.scrollMode == 3)
    pdfjs.page = page; // for certain page layout, set page first
  const pageEl = document.querySelector(`.pdfViewer .page[data-page-number="${page}"]`);
  const { width, height } = pageEl.getBoundingClientRect();
  document.getElementById('viewerContainer').scrollTo({
    top: pageEl.offsetTop + (top ? top / 100 * height : -32),
    left: pageEl.offsetLeft + (left ? left / 100 * width : -32),
    behavior: 'smooth'
  });
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