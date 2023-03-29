const $ = {
  window: null as any,
  annotator: null as any,
  init(window, annotator) {
    $.window = window;
    $.annotator = annotator;

    $._addStyleSheet();

    $.annotator.popup = $._uiHtml;
    $._regPopupEventsHandlers();
  },
  _regPopupEventsHandlers() {
    $.window.$a2ntpop = $.window.$a2ntpop || {};
    $.window.$a2ntpop._setAnnotationAttr = $._setAnnotationAttr;
  },
  _setAnnotationAttr(id, attr, value) {
    const annotation = $.annotator._findAnnotation(id);
    annotation[attr] = value;
    $.annotator._renderAnnotations(annotation);
    $.annotator._persistAnnotations();
  },
  _uiHtml(annotation) {
    const types = {
      'highlight': '<span style="background: orange;">high</span>light',
      'underline': '<span style="text-decoration: underline;">underline</span>',
      'linethrough': '<span style="text-decoration: line-through;">line-through</span>',
    };
    console.log(annotation.note);
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
                    rows="5">${annotation.note}</textarea>
        </div>
      `
    };
  },
  _addStyleSheet() {
    $.annotator.document
      .querySelector('head')
      .insertAdjacentHTML('beforeend',
        `<style typs="text/css">
          .annotator-popup__anchor {
            position: absolute;
            width: 1rem;
            height: 1rem;
            background: white;
            border-radius: 0.25rem;
            left: calc(50% - 0.5rem);
            top: -0.25rem;
            transform: rotate(45deg);
            z-index: 0;
          }
          .annotator-popup__highlight-types {
            display: flex;
            align-item: center;
            justify-content: center;
            column-gap: 0.125rem;
            z-index: 1;
          }
          .annotator-popup__highlight-colors {
            display: flex; 
            align-items: center;
            justify-content: space-evenly;
            column-gap: 0.125rem;
            z-index: 1;
          }
          .annotator-popup__highlight-color-btn {
            position: relative;
            height: 0.75rem;
            width: 100%;
            border-width: 1px;
          }
          .paws__annotation-rect-highlight {
            background-color: var(--annotation-color);
            opacity: 0.5;
          }
          .paws__annotation-rect-underline::after {
            content: "";
            display: block;
            position: absolute;
            width: 100%;
            top: 100%;
            border-top: 2px solid var(--annotation-color);
          }
          .paws__annotation-rect-linethrough::before {
            content: "";
            display: block;
            position: absolute;
            width: 100%;
            top: 50%;
            border-top: 2px solid var(--annotation-color);
          }

          .annotator-popup__highlight-note textarea {
            width: 100%;
          }
        </style>`);
  }
}

const annotatorPopup = $;
export default annotatorPopup;