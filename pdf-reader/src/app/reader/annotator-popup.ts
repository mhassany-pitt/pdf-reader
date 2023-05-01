import { v4 as uuid } from 'uuid';

const annotatorPopup = (iframe, annotator) => {
  const window = iframe?.contentWindow;
  const document = iframe?.contentDocument;
  const documentEl = document.documentElement;

  const state = { pending: null as any };

  // --- renderers
  const render = (annotation) => {
    const types = {
      'highlight': '<span style="background: orange;">highlight</span>',
      'underline': '<span style="text-decoration: underline;">underline</span>',
      'linethrough': '<span style="text-decoration: line-through;">line-through</span>',
    };

    return {
      width: '15rem',
      html: `
          <div class="annotator-popup__anchor"></div>
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
          </div>
        `
    };
  }
  const hideControls = (pageEl) => pageEl.querySelectorAll(`.paws__annotation-controls`).forEach(el => el.remove());
  const showControls = (pageEl, annotation) => {
    const popup = render(annotation);
    const pageNum = parseInt(pageEl.getAttribute('data-page-number'));
    const bound = annotator.rotateRectBound(annotator.rotationDegree(), true, annotator.calcRectsBound(annotation.rects[pageNum]));
    annotator.getAnnotationLayerEl(pageNum).insertAdjacentHTML('beforeend', `
      <div paws-annotation-id="${annotation.id}"
        class="paws__annotation-${annotation.id} paws__annotation-controls"
        style="
          top: calc(${Math.abs(100 - bound.bottom)}% + 10px);
          left: calc(${bound.left + (Math.abs(100 - bound.right) - bound.left) / 2}% - (${popup.width} / 2));
          width: ${popup.width};
        ">
          ${popup.html}
        </div>
    `);
  }

  { // attach annotator-popup stylesheet
    documentEl.querySelector('head').insertAdjacentHTML('beforeend',
      `<link rel="stylesheet" type="text/css" href="/assets/annotator-popup.css" />`);
  }

  { // show annotation controls on click
    documentEl.addEventListener('click', $event => {
      const pageEl = annotator.closestPageEl($event.target);
      if (!pageEl)
        return;

      if (
        !$event.target.classList.contains('paws__annotation-controls') &&
        !$event.target.closest('.paws__annotation-controls')
      ) {
        state.pending = null;
        hideControls(pageEl);
      }

      if ($event.target.classList.contains('paws__annotation-rect')) {
        const id = $event.target.getAttribute('paws-annotation-id');
        showControls(pageEl, annotator.findAnnotationById(id));
      }
    });
  }

  { // attach event handlers
    window.$a2ntpop = window.$a2ntpop || {};
    window.$a2ntpop._setAnnotationAttr = (id, attr, value) => {
      const annotation = annotator.findAnnotationById(id) || state.pending;
      annotation[attr] = value;
      if (annotation == state.pending) {
        annotator.addAnnotation(annotation);
        state.pending = null;
      } else {
        annotator.render(annotation);
        annotator.saveAnnotations();
      }
    };
  }

  annotator.onTextSelection = ($event) => {
    const rects = annotator.getSelectionRects();
    if (!rects)
      return;

    setTimeout(() => {
      state.pending = { id: uuid(), rects };
      const pageEl = annotator.closestPageEl($event.target);
      showControls(pageEl, state.pending);
    }, 0);
  }

  return {};
};

export default annotatorPopup;