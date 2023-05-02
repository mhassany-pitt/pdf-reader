import { Annotation } from "./annotator";
import { closestPageEl, createUniqueId, getBound, htmlToElements, rotateRect, rotation } from "./utils";

const annotatorPopup = ({ iframe, pdfjs, annotator, store }) => {
  const window = iframe?.contentWindow;
  const document = iframe?.contentDocument;
  const documentEl = document.documentElement;

  const state = { pending: null as any };

  const popupHtml = (annotation: Annotation) => {
    const types = {
      'highlight': '<span style="background: orange;">highlight</span>',
      'underline': '<span style="text-decoration: underline;">underline</span>',
      'linethrough': '<span style="text-decoration: line-through;">line-through</span>',
    };

    return {
      width: '15rem',
      html:
        `<div class="annotator-popup__anchor"></div>
        <div class="annotator-popup__highlight-types">
          ${Object.keys(types).map(type => (`
            <button class="annotator-popup__highlight-type-btn" 
                    onclick="window.$a2ntpop._setAnnotationAttr('${annotation.id}', 'type', '${type}')">
              ${types[type]}
            </button>
          `)).join('')}
        </div>
        <div class="annotator-popup__highlight-colors">
          ${['#ffd400', '#ff6563', '#5db221',
          '#2ba8e8', '#a28ae9', '#e66df2',
          '#f29823', '#aaaaaa', 'black'].map(color => (`
            <button class="annotator-popup__highlight-color-btn" 
                    onclick="window.$a2ntpop._setAnnotationAttr('${annotation.id}', 'color', '${color}')"
                    style="background-color: ${color}">
            </button>
          `)).join('')}
        </div>
        <div class="annotator-popup__highlight-note">
          <textarea onchange="window.$a2ntpop._setAnnotationAttr('${annotation.id}', 'note', event.target.value)"
                    rows="5">${annotation.note || ''}</textarea>
        </div>`
    };
  }

  const show = (pageEl: HTMLElement, annotation: Annotation) => {
    const dataPageNum = pageEl.getAttribute('data-page-number');
    if (!dataPageNum)
      return;

    const pageNum = parseInt(dataPageNum);
    let boundRect = getBound(annotation.rects[pageNum]);
    boundRect = rotateRect(rotation(pdfjs), true, boundRect);

    const popup = popupHtml(annotation);
    const popupEl = htmlToElements(
      `<div paws-annotation-id="${annotation.id}"
        class="paws-annotation__popup"
        style="
          top: calc(${Math.abs(100 - boundRect.bottom)}% + 10px);
          left: calc(${boundRect.left + (Math.abs(100 - boundRect.right) - boundRect.left) / 2}% - (${popup.width} / 2));
          width: ${popup.width};
        ">
          ${popup.html}
        </div>`);

    annotator.getAnnotationLayerEl(pageNum).appendChild(popupEl);
  }

  { // attach stylesheet
    documentEl.querySelector('head').appendChild(htmlToElements(
      `<link rel="stylesheet" type="text/css" href="/assets/annotator-popup.css" />`
    ));
  }

  { // show annotation popup on click
    documentEl.addEventListener('click', ($event: any) => {
      const pageEl = closestPageEl($event.target);
      if (!pageEl)
        return;

      const classList = $event.target.classList;

      // hide popup if clicked outside it
      if (!classList.contains('paws-annotation__popup')
        && !$event.target.closest('.paws-annotation__popup')) {
        state.pending = null;
        pageEl.querySelectorAll(`.paws-annotation__popup`).forEach((el: any) => el.remove())
      }

      // show popup for the clicked rect
      if (classList.contains('paws-annotation__rect')) {
        const annotId = $event.target.getAttribute('paws-annotation-id');
        show(pageEl, store.read(annotId));
      }
    });
  }

  { // attach popup event handlers
    window.$a2ntpop = window.$a2ntpop || {};
    window.$a2ntpop._setAnnotationAttr = (id: string, attr: string, value: any) => {
      const annotation = store.read(id) || state.pending;
      annotation[attr] = value;
      if (annotation == state.pending) {
        store.create(annotation);
        state.pending = null;
      } else {
        store.update(annotation);
      }
      annotator.render(annotation);
      window.getSelection().removeAllRanges();
    };
  }

  annotator.onTextSelection = ($event: any) => {
    const rects = annotator.getSelectionRects();
    if (rects) {
      setTimeout(() => {
        state.pending = { id: createUniqueId(), rects };
        const pageEl = closestPageEl($event.target);
        show(pageEl, state.pending);
      }, 0);
    }
  }

  return { show };
};

export { annotatorPopup };