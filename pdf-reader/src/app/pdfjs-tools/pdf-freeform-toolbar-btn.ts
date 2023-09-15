import { htmlToElements, isLeftClick } from './pdf-utils';
import { PdfFreeformEditor } from './pdf-freeform-editor';
import { PdfToolbarBtn } from './pdf-toolbar-btn';
import { getLabel, getValue } from './pdf-utils';

export class PdfFreeformToolbarBtn extends PdfToolbarBtn {

  protected stroke = 1;
  protected color = 'black';

  constructor({ registry }) {
    super({ registry });

    this.registry.register(`configs.default.freeform`, () => PdfFreeformToolbarBtn.defaultConfigs());

    this._addToolbarUI();
  }

  protected _configs() { return this.registry.get(`configs.freeform`); }
  static defaultConfigs() {
    return {
      delete: true,
      move: true,
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
      stroke: { min: 1, max: 10, step: 1, value: 1 }
    };
  }

  protected override getIcon() { return '<img src="data:image/png;base64,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">'; }

  protected override getClassName() { return 'freeform'; }
  protected override getTitle() { return 'Freeform'; }

  protected getColorOptions() { return this._configs()?.colors; }
  protected getStrokeOptions() { return this._configs()?.stroke; }

  private _getDocument() { return this.registry.getDocument(); }
  private _getEditor(): PdfFreeformEditor { return this.registry.get('freeform-editor'); }
  private _setFreeformEnable(enabled: boolean) { this._getEditor().setEnabled(enabled); }
  private _isFreeformEnabled() { return this._getEditor().isEnabled(); }
  private _setFreeformStroke(stroke: number) { this._getEditor().setStroke(stroke); }
  private _getFreeformStroke() { return this._getEditor().getStroke(); }
  private _setFreeformColor(color: string) { this._getEditor().setColor(color); }
  private _getFreeformColor() { return this._getEditor().getColor(); }

  protected override selected() {
    this._setFreeformEnable(true);
    this._setFreeformStroke(this.stroke);
    this._setFreeformColor(getValue(this.getColorOptions()?.[0]));
    this._getToolbarEl().showDetails(this.getToolbarDetailsEl());
  }

  protected override unselected() {
    this._setFreeformEnable(false);
    this._setFreeformStroke(1);
    this._setFreeformColor('black');
    this._getToolbarEl().showDetails(null as any);
  }

  protected override _addToolbarUI() {
    if (!this._configs())
      return;

    super._addToolbarUI();

    this.button.addEventListener('mouseover', () => {
      if (this._isFreeformEnabled() && !this._getToolbarEl().hasDetails()) {
        this._getToolbarEl().showDetails(this.getToolbarDetailsEl());
      }
    });

    this._getDocument().addEventListener('mousedown', ($event: any) => {
      if (this._isFreeformEnabled() && isLeftClick($event)) {
        if (!$event.target.closest('.pdf-toolbar')) {
          this._getToolbarEl().showDetails(null as any);
        }
      }
    });
  }

  private getToolbarDetailsEl() {
    return [this._getColorsEl(), this._getStrokesEl()];
  }

  private _getStrokesEl() {
    const className = `pdf-annotation-toolbar__freeform-stroke-options`;
    const config = this.getStrokeOptions();
    const storkesEl = htmlToElements(
      `<div class="${className}">
        <input type="range" 
          min="${config.min}" 
          max="${config.max}" 
          step="${config.step}" 
          value="${config.value}" 
          class="pdf-annotation-toolbar__freeform-stroke-option"
          />
        <span>${config.value}x</span>

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
      const value = parseInt($event.target.value);
      strokeSpanEl.innerText = `${value}x`;
      this.stroke = value;
      this._setFreeformStroke(this.stroke);
    });

    strokeInputEl.value = `${this._getFreeformStroke()}`;
    strokeSpanEl.innerText = `${strokeInputEl.value}x`;

    return storkesEl;
  }

  private _getColorsEl() {
    const className = `pdf-annotation-toolbar__freeform-color-options`;
    const colorsEl = htmlToElements(
      `<div>
        <div class="${className}">
          ${this.getColorOptions().map(color =>
        `<span data-freeform-color="${getValue(color)}" 
                     style="background-color: ${getLabel(color)}"
                     class="pdf-annotation-toolbar__freeform-color-option"
                     data-analytic="color:${getValue(color)}"       
              ></span>`).join('')}
        </div>
        <style>
          .${className} {
            display: flex; 
            align-items: center; 
            gap: 0.125rem;
          }
          .${className} > span {
            user-select: none;
            cursor: pointer; 
            width: 1rem; 
            height: 0.975rem;
            border: dashed 0.125rem transparent;
          }
          .${className} > span.selected {
            border-style: dashed;
            border-color: white;
          }
        </style>
      </div>`);

    colorsEl.querySelector(`.${className}`)?.addEventListener('click', ($event: any) => {
      const el = $event.target;
      const color = el.getAttribute('data-freeform-color');
      if (color && !el.classList.contains('selected')) {
        colorsEl.querySelectorAll(`.${className} > span.selected`).forEach(other => other.classList.remove('selected'));
        el.classList.add('selected');

        this.color = color;
        this._setFreeformColor(this.color);
      }
    });

    (colorsEl.querySelector(`[data-freeform-color="${this._getFreeformColor()}"]`) as HTMLElement)?.click();

    return colorsEl;
  }
}