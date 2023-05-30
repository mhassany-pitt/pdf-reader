export const scrollTo = (document, pdfjs, { page, top, left }) => {
  if (pdfjs.pdfViewer.scrollMode == 3)
    pdfjs.page = page; // for certain page layout, set page first
  const pageEl = document.querySelector(`.pdfViewer .page[data-page-number="${page}"]`);
  document.getElementById('viewerContainer').scrollTo({
    top: pageEl.offsetTop + (top * pageEl.offsetHeight) - 32,
    left: pageEl.offsetLeft + (left * pageEl.offsetWidth) - 32,
    behavior: 'smooth'
  });
}