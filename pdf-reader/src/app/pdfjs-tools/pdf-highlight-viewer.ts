import {
  WHRect, htmlToElements,
  rotateRect, rotation, removeSelectorAll
} from './annotator-utils';
import { Highlight } from './highlight.type';
import { PdfRegistry } from './pdf-registry';

export class PdfHighlightViewer {

  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('highlight-viewer', this);

    this._attachStylesheet();
    this._renderOnPagerendered();
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getStorage() { return this.registry.get('storage'); }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(pageNum);
      removeSelectorAll(annotsLayerEl, '.pdfjs-annotation__rect');

      // current page and only annotations with rects
      const annots: Highlight[] = this._getStorage().list();
      annots.filter(annot => ['highlight', 'underline', 'strikethrough'].includes(annot.type))
        .filter(annot => Object.keys(annot.rects)
          .map(pageNum => parseInt(pageNum))
          .indexOf(pageNum) > -1)
        .forEach(annot => this.render({ ...annot, rects: { [pageNum]: annot.rects[pageNum] } }));
    });
  }

  render(annot: Highlight) {
    Object.keys(annot.rects)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(pageNum);

        removeSelectorAll(annotsLayerEl, `[data-annotation-id="${annot.id}"].pdfjs-annotation__rect`);

        const degree = rotation(this._getPdfJS());
        const rects: WHRect[] = annot.rects[pageNum];
        rects.forEach(rect => {
          rect = rotateRect(degree, true, rect);
          const rectEl = htmlToElements(
            `<div data-annotation-id="${annot.id}" 
              data-analytic-id="${annot.type ? '-' + annot.type : ''}-${annot.id}"
              class="pdfjs-annotation__rect ${annot.type ? 'pdfjs-annotation__' + annot.type : ''}" 
              style="
                top: calc(${rect.top}% + 1px);
                bottom: calc(${rect.bottom}% + 1px);
                left: ${rect.left}%;
                right: ${rect.right}%;
                --annotation-color: ${annot.color || 'rgb(255, 212, 0)'};
                --annotation-stroke: ${annot.stroke || '0.125rem'};
                --annotation-stroke-style: ${annot.strokeStyle || 'solid'};
              "></div>`
          );

          annotsLayerEl.appendChild(rectEl);
        })
      });
  }

  private _attachStylesheet() {
    const styles =
      `<style>
        .pdfjs-annotation__rect {
          position: absolute;
          pointer-events: auto;
          border-radius: 0.125rem;
          z-index: 5;
        }

        /* highlight */
        .pdfjs-annotation__highlight {
          background-color: var(--annotation-color);
        }

        /* underline */
        .pdfjs-annotation__underline {
          border-radius: 0;
        }
        
        [data-rotation-degree="0"] .pdfjs-annotation__underline {
          border-bottom: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
        }
        
        [data-rotation-degree="180"] .pdfjs-annotation__underline {
          border-top: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
        }
        
        [data-rotation-degree="90"] .pdfjs-annotation__underline {
          border-left: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
        }
        
        [data-rotation-degree="270"] .pdfjs-annotation__underline {
          border-right: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
        }

        /* strikethrough */
        .pdfjs-annotation__strikethrough::before {
          content: "";
          display: block;
          position: absolute;
        }
        
        [data-rotation-degree="0"] .pdfjs-annotation__strikethrough::before,
        [data-rotation-degree="180"] .pdfjs-annotation__strikethrough::before {
          top: calc(50%);
          width: 100%;
          border-top: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
        }
        
        [data-rotation-degree="90"] .pdfjs-annotation__strikethrough::before,
        [data-rotation-degree="270"] .pdfjs-annotation__strikethrough::before {
          left: calc(50%);
          height: 100%;
          border-right: var(--annotation-stroke) var(--annotation-stroke-style) var(--annotation-color);
        }
      </style>`;
    this.registry.getDocumentEl().querySelector('head').appendChild(htmlToElements(styles));
  }
}
