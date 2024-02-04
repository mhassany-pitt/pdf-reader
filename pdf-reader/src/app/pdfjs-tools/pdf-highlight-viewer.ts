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
    const editor = this.registry.get('highlighter');
    const configs = this._configs(annot.type);
    const scaleFactor = scale(this._getPdfJS());

    Object.keys(annot.rects)
      .map(pageNum => parseInt(pageNum))
      .forEach(pageNum => {
        const annotsLayerEl = this.registry.get('annotation-layer').getOrAttachLayerEl(pageNum);

        removeSelectorAll(annotsLayerEl, `[data-annotation-id="${annot.id}"].pdf-annotation__rect`);

        const degree = rotation(this._getPdfJS());
        const rects: WHRect[] = annot.rects[pageNum];
        rects.sort((r1, r2) => r1.top - r2.top || r1.left - r2.left)
          .forEach((rect, i) => {
            rect = rotateRect(degree, true, rect);
            const rectEl = htmlToElements(
              `<div 
                data-annotation-id="${annot.id}"
                data-annotation-type="${annot.type}"
                data-analytic="${annot.type}:${annot.id}"
                tabindex="-1"
                class="
                  pdf-annotation__rect 
                  ${annot.type ? 'pdf-annotation__' + annot.type : ''}
                  ${annot.note?.length && i == 0 ? 'pdf-annotation--has-note' : ''}
                  ${editor && configs?.delete ? 'pdf-annotation--deletable' : ''}"
                style="
                  top: calc(${rect.top}% + 1px);
                  bottom: calc(${rect.bottom}% + 1px);
                  left: ${rect.left}%;
                  right: ${rect.right}%;
                  --annotation-scale: ${scaleFactor};
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

          .pdf-annotation--has-note::after {
            content: "";
            background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFHElEQVR4AbWWA7AjTRSFk6xt27Zt27Zt27Zt27a9+7S2zedMzt+nKz315v2pvGSRqq+m+zbumdv3TsdUqXd1A+JnsT8TC6YJngkg8BfsE5QPMdfM558gNxGEF4QTRKIxcmRL3nAW85fIES2wmE0/hf2S4KEAdkbbF4dXa91GrQutqEEDOfg6QZwIyJI+5vT5o0pFV2MZUscoFCNquEcCJEscpR5tf4oKQ6Y8GWOVq1A0Qe440cxj6EDYNqlJuTLELFg0b6JSdaumTpUpdYxJyRJGQsokke+ULJK4AO1F8iQu6Q5cwyirI2gezmLyU+FVzB1VfjUwq9Lh1Y1Hib4WYixQ9f8QW9SI5nmm8BaTDw0rRxezHV1UCYPbZgcdXN3TFvg1GXg2AkfWNsbW+XWwY1E9ybaFdbFnWYPfYu/yBtixuB6K5EkEKSRKRLMHG1/PtgjE8+7Bu2eX09i/tLMV8GYM8HyEFe/HBuLrxGB8E3ydaMXHccCrUcDbscFu807wcmRwkxqZAmU0I1hMt+nw9bEmGu53wbZpZcD+hR0thYDRVuvjYcDLUXh5uae0XdvbFt88BwCvR0N7Mhx4OgI2lxkuIxr4cCgaVs0oj8EUObzZkw7fHm9qVQIMEXgxEic3NqNNp3aFdHh+oQeFUcSfCAAFeOgCHnTB9ulloUfgwzi8u95Hd3xldxuZA2wP7lIIeD6SG7oF1wS5IuD8NiHg8wR4H+sk+/PHVJR9//tDkC1DbBTKlZBtRojHwEg4Bc8YAccCPJ0J8DgiBWD6kDLA2zH46TMImdPGQrkiyeF3TwpgaHlcHGfesE3Ypo1tOnc/Asx2Jh/7LENu9t1rINKmiIYyhZMzAqwSmQu3D3XAhP4lMXtkecwcXo6wTRtfglXDSIQdgdBJSOXMei6iI0aAR1CqYFJGgG/FimBtc51DWP/cyyUBO2aUA/tntrQA3o2BKkM6YrgpgONVS6dmNuuJyGOg0G8eBmjjS7iQAydkGeL2zsaGLOc58knnPBIeDcenDC7NsNIxk1DNdYxeLU4EvD/ZzArP9tDu9sHg7sX1xGMZBjwYgh/egwzfgyfnuquPkdqY85gXBmiDHiVnAk41t+JOe+DRAOlsUKeCujOWnGrHjRUB1/e1k2+mibcnFML7guMlCiRBgRwJCNu0UbgS67gKlAAVAbweI0PLC4n137ddfoztU0JeJJ9u9ZPVoNe2XQCPpnW9bOjXvgB6t8lHZLt1/Wy4uKO1LsB5BDzaw3avLzSGihuzhl/pCcg+E5IbcDMDdODwy0gbx1w5AgqATy9OInTOxXRMQveNKPs7B8iPlUtJ2AHanU76JF44j89212HiPRU8cQjndPsfj850wy9RutyTx+VcgFdHWK+3EYqHqU/w34AXWNgfIiVAuyEE+HTH5zsDsGtJfexcXE893YXr+AlndJg7rkXAdqsdbDfbAo/6AR/GGy4Vt+Had2yHeRkZBeB2exkJmZDP7AlJ9QrX7386DlGybgggjITNqxtsj4bAJoQQ9c/GHUBU+/mIsI+AznVutQXu2Mvz0SBuZI8KGeUiIyV8AZakFFAtkzEC8jLy6ADrjXZ6HvCp2jwSPlmmmkdXaF7dfwt490DA7a5oWDElBdj0v+WfzzTXcK8z+C2Ad0cJI2JoSzo4xtOJzVPRnn1GVReg/y0f0SFH8Iy++TG1dz5M+0fIvfvkw+QeebVsaaJQADGVD2cxBdg7Nj7/McqHf5yYkZv8BwXaapr58XIuAAAAAElFTkSuQmCC');
            --note-icon-dimension: 0.35rem;
            background-size: calc(var(--annotation-scale) * var(--note-icon-dimension));
            width: calc(var(--annotation-scale) * var(--note-icon-dimension));
            height: calc(var(--annotation-scale) * var(--note-icon-dimension));
            position: absolute;
            left: calc(var(--annotation-scale) * -1 * var(--note-icon-dimension) * 0.5);
            top: calc(var(--annotation-scale) * -1 * var(--note-icon-dimension) * 0.5);
            font-size: calc(var(--annotation-scale) * var(--note-icon-dimension));
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
