import { htmlToElements } from './annotator-utils';
import { PdfHighlighterToolbarBtn } from './pdf-highlighter-toolbar-btn';
import { getLabel, getValue } from './pdfjs-utils';

export class PdfUnderlineToolbarBtn extends PdfHighlighterToolbarBtn {

  protected override _defaultConfigs() {
    return {
      deletable: true,
      colors: [
        '#ffd400',
        '#ff6563',
        '#5db221',
        '#2ba8e8',
        '#a28ae9',
        '#e66df2',
        '#f29823',
        '#aaaaaa',
        'black'
      ],
      strokeStyle: ['solid', 'dashed', 'dotted'],
      stroke: { min: 1, max: 4, step: 0.1, value: 1 }
    };
  }

  protected override getType() { return { type: 'underline', label: 'Underline' }; }
  protected override getIcon() { return `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAC/klEQVR4AezR0QmAMAyGQbcTxWGc2bpH7Aa2UImFC3zP4eeW9Tz0o75/IiBABASIgAAREAEBIiBAImKvlXi/UtvyxzftuYftSQAp0X7XBCAZe4aCdN0EIF0HZGhAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIECBAgAABAgQIkKe9ewDVOwrjON61jTDmmpHtZocx14w028qcbWVNafZys/UizHvxrU5u231ePuf/f771iVen37XOT0iqVDxGFST90DhIBJJaFQ/SDkmfNQ7yApL6Kh6kPyQ90zjIHUiaoHiQSZB0S+MgxyBpo+JBtkDSYY2DrIKk64oHuQVJKzQOMhGSEuiucIyeSEDSeI2DdCAJSUsUDrIMkhJoUzeIO8wjSHqNKmVff7yBpHvu8VUOshPSZikaZB6kbdU8yFBIi6BDwRht+AJpA9QO4g72GNJOKhjkNKQ9dI+vepBFyKTZPr2rci3wYZA6fIa0P5hQhDFG4TekfUG9+kHcIVcik75hdAHHGI1vyKSl7ul4MUgzPiCTfmNOgd5N/UYmvUODN4O4A89ANp1CRx5erk6cRjZNcU/Pq0FKcBXZFMFcVOXg5anGPESRTZe8va6CF743osi2t1iGHhl+b2o53iLbIuipYJCsRhmHJHJRAjexGZPQH62odFoxAJOwBbeQQC5KYnQgLnThIJvge+sFZ1Y/SAn2wNcOo0T3IPJRynEBvnUe5YG8g4qDlWE3fOkgKgJ9KZh797UZSWgtifUoCc0tbRx2DCLQVhyTQnltnvs65Qq0dAk9Q3+Pofsm32sUq/eYgRK7WBJulEYsx2cUqk9Yhga76fPfP09ZiEfIVw+xAHV29apsnEHYhvtIINMSuIetGGh34ebuN9LHYwWO4jaeIoKfTgRPcRtHsALj0WaXExsbxAYxNogNEmY2iCnmTf2+9xojfBjkNcLSKxtEnA0yHK/CMAaGKxvEBHwQkwZZt6MzH89vawAAAABJRU5ErkJggg==">`; }

  protected override getColorOptions() { return this.registry.get(`configs.${this.getType().type}`)?.colors; }
  protected getStrokeStyleOptions() { return this.registry.get(`configs.${this.getType().type}`)?.strokeStyle; }
  protected getStrokeOptions() { return this.registry.get(`configs.${this.getType().type}`)?.stroke; }

  private _getStrokeStylesEl() {
    const className = 'pdfjs-annotation-toolbar__stroke-style-options';
    const strokeStylesEl = htmlToElements(
      `<div>
          <div class="${className}">
            ${this.getStrokeStyleOptions()?.map(style => `<span data-highlight-storke-style="${getValue(style)}" style="text-decoration-style: ${getValue(style)}">${getLabel(style)}</span>`).join('')}
          </div>
          <style>
            .${className} {
              display: flex; 
              gap: 0.125rem;
            }
            .${className} > span {
              user-select: none;
              cursor: pointer; 
              background-color: #38383d;
              color: white;
              text-decoration: ${this.getType().type == 'strikethrough' ? 'line-through' : this.getType().type};
              text-decoration-thickness: from-font;
              padding: 0 0.25rem;
              flex-grow: 1;
              text-align: center;
            }
            .${className} > span.selected {
              background-color: white;
              color: #38383d;
            }
          </style>
        </div>`);

    strokeStylesEl.querySelector(`.${className}`)?.addEventListener('click', ($event: any) => {
      const el = $event.target;
      const strokeStyle = el.getAttribute('data-highlight-storke-style');
      if (strokeStyle && !el.classList.contains('selected')) {
        strokeStylesEl.querySelectorAll(`.${className} > span.selected`).forEach(other => other.classList.remove('selected'));
        el.classList.add('selected');

        this.strokeStyle = strokeStyle;
        this._setHighlighterStrokeStyle(this.strokeStyle);
      }
    });

    (strokeStylesEl.querySelector(`[data-highlight-storke-style="${this._getHighlighterStrokeStyle()}"]`) as HTMLElement)?.click();

    return strokeStylesEl;
  }

  private _getStrokesEl() {
    const className = 'pdfjs-annotation-toolbar__stroke-options';
    const config = this.getStrokeOptions();
    const storkesEl = htmlToElements(
      `<div class="${className}">
        <input type="range" 
               min="${config?.min}" 
               max="${config?.max}" 
               step="${config?.step}" 
               value="${config?.value}" />
        <span>${config?.value}x</span>

        <style>
          .${className} {
            display: flex;
            gap: 0.125rem;
            align-items: center;
          }

          .${className} > input {
            flex-grow: 1;
          }

          .${className} > span {
            color: white;
          }
        </style>
       </div>`);

    const strokeInputEl = storkesEl.querySelector('input') as HTMLInputElement;
    const strokeSpanEl = storkesEl.querySelector('span') as HTMLInputElement;
    strokeInputEl.addEventListener('input', ($event: any) => {
      const value = $event.target.value;
      strokeSpanEl.innerText = `${parseFloat(value).toFixed(1)}x`;
      this.stroke = `${parseInt(value) * 0.125}rem`;
      this._setHighlighterStroke(this.stroke);
    });

    strokeInputEl.value = `${parseFloat(this._getHighlighterStroke().replace('rem', '')) / 0.125}`;
    strokeSpanEl.innerText = `${strokeInputEl.value}x`;

    return storkesEl;
  }

  protected override getToolbarDetailsEl() {
    return [...super.getToolbarDetailsEl(), this._getStrokeStylesEl(), this._getStrokesEl()];
  }
}
