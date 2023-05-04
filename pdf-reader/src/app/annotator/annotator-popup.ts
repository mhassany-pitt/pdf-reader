import { Annotation } from "./annotator";
import { closestPageEl, createUniqueId, getBound, htmlToElements, rotateRect, rotation } from "./utils";

const annotatorPopup = ({ iframe, pdfjs, annotator, store }) => {
  const window = iframe?.contentWindow;
  const document = iframe?.contentDocument;
  const documentEl = document.documentElement;

  const state = { pending: null as any };

  const getOrAttachPopupLayerEl = (pageEl: HTMLElement) => {
    if (!pageEl.querySelector('.paws-annotation-popup'))
      pageEl.appendChild(htmlToElements(`<div class="paws-annotation-popup"></div>`));
    return pageEl.querySelector('.paws-annotation-popup') as HTMLElement;
  }

  const html = (annotation: Annotation) => {
    const types = {
      'highlight': '<span style="background: orange;">highlight</span>',
      'underline': '<span style="text-decoration: underline;">underline</span>',
      'linethrough': '<span style="text-decoration: line-through;">line-through</span>',
    };

    return {
      width: '15rem',
      html:
        `<div class="paws-annotation-popup__anchor"></div>
        <div class="paws-annotation-popup__highlight-types">
          ${Object.keys(types).map(type => (`
            <button class="paws-annotation-popup__highlight-type-btn" 
                    onclick="window.$a2ntpop._setAnnotationAttr('${annotation.id}', 'type', '${type}')">
              ${types[type]}
            </button>
          `)).join('')}
        </div>
        <div class="paws-annotation-popup__highlight-colors">
          ${['#ffd400', '#ff6563', '#5db221',
          '#2ba8e8', '#a28ae9', '#e66df2',
          '#f29823', '#aaaaaa', 'black'].map(color => (`
            <button class="paws-annotation-popup__highlight-color-btn" 
                    onclick="window.$a2ntpop._setAnnotationAttr('${annotation.id}', 'color', '${color}')"
                    style="background-color: ${color}">
            </button>
          `)).join('')}
        </div>
        <div class="paws-annotation-popup__highlight-note">
          <textarea onchange="window.$a2ntpop._setAnnotationAttr('${annotation.id}', 'note', event.target.value)"
                    rows="5">${annotation.note || ''}</textarea>
        </div>`
    };
  }

  const hide = () => {
    const popup = document.querySelector('.paws-annotation-popup');
    popup?.remove();
  }

  const show = (pageEl: HTMLElement, annotation: Annotation) => {
    const pageNum = parseInt(pageEl.getAttribute('data-page-number') || '-1');
    if (pageNum < 0)
      return;

    let boundRect = getBound(annotation.rects[pageNum]);
    boundRect = rotateRect(rotation(pdfjs), true, boundRect);

    const popup = html(annotation);
    const popupEl = htmlToElements(
      `<div paws-annotation-id="${annotation.id}"
        class="paws-annotation-popup__container"
        style="
          top: calc(${Math.abs(100 - boundRect.bottom)}% + 10px);
          left: calc(${boundRect.left + (Math.abs(100 - boundRect.right) - boundRect.left) / 2}% - (${popup.width} / 2));
          width: ${popup.width};
        ">
          ${popup.html}
        </div>`);

    getOrAttachPopupLayerEl(pageEl).appendChild(popupEl);
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
      if (!classList.contains('paws-annotation-popup__container')
        && !$event.target.closest('.paws-annotation-popup__container')) {
        getOrAttachPopupLayerEl(pageEl).remove();
        state.pending = null;
      }

      // show popup for the clicked rect
      if (classList.contains('paws-annotation__rect')) {
        const annotId = $event.target.getAttribute('paws-annotation-id');
        show(pageEl, store.read(annotId));
      }
    });
  }

  { // delete the selected annotation on delete/backspace
    documentEl.addEventListener('keydown', ($event: any) => {
      if ($event.key == 'Delete' || $event.key == 'Backspace'
        && $event.target.classList.contains('paws-annotation__bound')) {
        hide();
      }
    });
  }

  { // attach popup event handlers
    window.$a2ntpop = window.$a2ntpop || {};
    window.$a2ntpop._setAnnotationAttr = (id: string, attr: string, value: any) => {
      const annotation = store.read(id) || state.pending;
      if (!annotation.type)
        annotation.type = 'highlight';
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
    const pageEl = closestPageEl($event.target);
    if (rects && Object.keys(rects).length && pageEl) {
      setTimeout(() => {
        state.pending = { id: createUniqueId(), rects };
        show(pageEl, state.pending);
      }, 0);
    }
  }

  return { show };
};

export { annotatorPopup };