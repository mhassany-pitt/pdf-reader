import {
  WHRect, htmlToElements,
  rotateRect, rotation, removeSelectorAll, scale
} from './pdf-utils';
import { PdfRegistry } from './pdf-registry';

export class PdfHighlightViewer {

  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('highlight-viewer', this);

    this._attachStylesheet();
    this._renderOnPagerendered();
  }

  private _configs(type: string) { return this.registry.get(`configs.${type}`); }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getStorage() { return this.registry.get('storage'); }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(pageNum);
      removeSelectorAll(annotsLayerEl, '.pdf-annotation__rect');

      this._getStorage().list()
        .filter(annot => ['highlight', 'underline', 'strikethrough'].includes(annot.type))
        .filter(annot => Object.keys(annot.rects)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(annot => this.render({ ...annot, rects: { [pageNum]: annot.rects[pageNum] } }));
    });
  }

  render(annot: any) {
    const configs = this._configs(annot.type);
    const scaleFactor = scale(this._getPdfJS());

    Object.keys(annot.rects)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(pageNum);

        removeSelectorAll(annotsLayerEl, `[data-annotation-id="${annot.id}"].pdf-annotation__rect`);

        const degree = rotation(this._getPdfJS());
        const rects: WHRect[] = annot.rects[pageNum];
        rects.forEach(rect => {
          rect = rotateRect(degree, true, rect);
          const rectEl = htmlToElements(
            `<div 
              data-annotation-id="${annot.id}"
              data-annotation-type="${annot.type}"
              data-analytic-id="${annot.type}-${annot.id}"
              tabindex="-1"
              class="
                pdf-annotation__rect 
                ${annot.type ? 'pdf-annotation__' + annot.type : ''}
                ${configs?.deletable ? 'pdf-annotation--deletable' : ''}"
              style="
                top: calc(${rect.top}% + 1px);
                bottom: calc(${rect.bottom}% + 1px);
                left: ${rect.left}%;
                right: ${rect.right}%;
                --annotation-color: ${annot.color || 'rgb(255, 212, 0)'};
                --annotation-stroke: calc(${scaleFactor} * ${annot.stroke || '0.125rem'});
                --annotation-stroke-style: ${annot.strokeStyle || 'solid'};">
            </div>`);

          annotsLayerEl.appendChild(rectEl);
        })
      });
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-annotation__rect {
            position: absolute;
            pointer-events: auto;
            border-radius: 0.125rem;
            cursor: pointer;
            z-index: 5;
          }

          /* highlight */
          .pdf-annotation__highlight {
            background-color: var(--annotation-color);
          }

          /* underline */
          .pdf-annotation__underline {
            border-radius: 0;
          }
          
          [data-rotation-degree="0"] .pdf-annotation__underline {
            border-bottom: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
          }
          
          [data-rotation-degree="180"] .pdf-annotation__underline {
            border-top: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
          }
          
          [data-rotation-degree="90"] .pdf-annotation__underline {
            border-left: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
          }
          
          [data-rotation-degree="270"] .pdf-annotation__underline {
            border-right: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
          }

          /* strikethrough */
          .pdf-annotation__strikethrough::before {
            content: "";
            display: block;
            position: absolute;
          }
          
          [data-rotation-degree="0"] .pdf-annotation__strikethrough::before,
          [data-rotation-degree="180"] .pdf-annotation__strikethrough::before {
            top: calc(50%);
            width: 100%;
            border-top: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
          }
          
          [data-rotation-degree="90"] .pdf-annotation__strikethrough::before,
          [data-rotation-degree="270"] .pdf-annotation__strikethrough::before {
            left: calc(50%);
            height: 100%;
            border-right: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
          }
        </style>`
      ));
  }
}
