import { htmlToElements, isLeftClick } from './pdf-utils';
import { PdfHighlighter } from './pdf-highlighter';
import { PdfToolbarBtn } from './pdf-toolbar-btn';
import { getLabel, getValue } from './pdf-utils';

export class PdfHighlighterToolbarBtn extends PdfToolbarBtn {

  protected color = 'transparent';
  protected stroke = '0.125rem';
  protected strokeStyle = 'solid';

  constructor({ registry }) {
    super({ registry });

    this.registry.register(`configs.default.${this.getType().type}`, () => PdfHighlighterToolbarBtn.defaultConfigs());

    this._attachStylesheet();
    this._addToolbarUI();
  }

  protected _configs() { return this.registry.get(`configs.${this.getType().type}`); }
  static defaultConfigs() {
    return {
      deletable: true,
      colors: [
        '#ffd40075:#ffd400',
        '#ff656375:#ff6563',
        '#5db22175:#5db221',
        '#2ba8e875:#2ba8e8',
        '#a28ae975:#a28ae9',
        '#e66df275:#e66df2',
        '#f2982375:#f29823',
        '#aaaaaa75:#aaaaaa',
        'black'
      ]
    };
  }

  protected getType() { return { type: 'highlight', label: 'Highlight' }; }

  protected _getDocument() { return this.registry.getDocument(); }
  protected _getHighlighter(): PdfHighlighter { return this.registry.get('highlighter'); }

  protected _setHighlighterType(value: string) { this._getHighlighter().type = value; }
  protected _getHighlighterType() { return this._getHighlighter().type; }
  protected _isHighlighterEnabled() { return this._getHighlighter().enabled; }
  protected _setHighlighterEnable(value: boolean) { this._getHighlighter().enabled = value; }
  protected _getHighlighterColor() { return this._getHighlighter().color; }
  protected _setHighlighterColor(value: string) { this._getHighlighter().color = value; }
  protected _getHighlighterStroke() { return this._getHighlighter().stroke; }
  protected _setHighlighterStroke(value: string) { this._getHighlighter().stroke = value; }
  protected _getHighlighterStrokeStyle() { return this._getHighlighter().strokeStyle; }
  protected _setHighlighterStrokeStyle(value: string) { this._getHighlighter().strokeStyle = value; }

  private get _colorDotEl() { return this.button.querySelector(`.color-dot`) as HTMLElement; }
  protected getColorOptions() { return this._configs()?.colors; }

  protected override getOtherEl() { return `<span class="color-dot"></span>`; }
  protected override getIcon() { return `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAFEElEQVR4AWJwL/ABtHdOYbAjQRT+7l3btm3btm3br2vbtm3btm3b3pw9D7VO1yQ9k57qbJ3v+9+6+uKf7kpmAkM4kYWOC3EhjgtxXIgLcVwIgEHIABfSfxEjk3PIt+RLchQZyoX0R8Zo5Gn8N0e5ECMyJF+RgS7EgAzJ92QQF2JAhuQ837LsyHiOjOpCbMh4kYzlh70uoxYuw4W4DI2cZTyDzrmeDOFCUq8MPTeQIV2IARk5SslJxijkGcTn2hy2r1xkDEZuh54XyCdppLiQfSucgY9BZshdSg4yxibfVT20BTC9SGmop7iQ/RHO82SMkpoGV4oLeQ7l+YCMo9RlKcX+kVU4W+j1TUhxITMgnDFlXEIpLmQBhDOIjEsoxYXsgXAmkXGtkmJZxrDkM4Szt4xNJMWF7Ao9P5C52ibFqowhyHvonC/JHNXnjj15dCFbQU9rpViUMSh5nSB/Ke0Qsj70tFqKNRkDyfMoz4/kOuj5gsyec6O3JmQVhHMSGYSc1+aVYk3IIyjPr2QyGdNqKZZkLIlwzpVxpN1SLAm5G+UpyHQyrvVSrMiYF+Fc2eEQ+ZIcGj2ABcnl5HayGxnMspDrEYp8wnOWAmBbUuCfucCkEAAzkQLluUWvNyxFlyHBZPaE6P+RC8u4DKXoMiQLmhICYEryG8rzgF5vW0oFGV+TkawJORPhLCfjcpSyUwcZBdnAVA8BMB75CeV5Kv5GfwOHxHoKsp3MZ0rIcQhnTaU2Vym6DKFfMsYg36M8r5JBZWz+UnQZZoQciXA2UWqb6ilf9qqnKDK2MXmmDmBnhPM2GVzG5iLloDgZBoQA2Al6tlfqzW1fADYnRdQ2FcDEypB8RIYO1VtbKfp5hr4yNKzIKMgqoXprUgBsFyfDgBAAm1WQsbmMJ2akfEu2IUP+rW5MckJczzAgBMCs5GcTMiKkSL4jT5EXyW/xMmwIubXDX34zrd6MFEmjMoSmvxoplL/81oaex3heD2RsK3OaFbIOwtnS0E/Hc5HrEJ+fyMbmf8JVLpZ+1oiIRcnt6C5vkflkTvNCtkV5PiMj9UnCALICeQjd5RWySzYXOQCYkLyJcB4gwyfuE2tHPgniNXIQ2Y2sS6bK6kI5AONXvFj6UTJSwyIGJ+uTF1E/z0rtoClXcXoZCaQAGIbsQN5B/TxB1u/Xk0vTyUggBcBwIuID1M+9+s/GaWheRgIpAEYje5IvUD+3kLlbc5+6NPA3oOchvcnHNXoAQ5PDyPeol9/IhWQGmcsMKWQ8SEYgE/ZSCoCRyeMRJ3Gnkclb9zQg2aZeq7IVRdcEADAieQTV8yM5iYwnc5glmYzua6NkfE2OImNLvXmSyoidI0LGJ2RPSH1ONNYzejOX9JTqPeN9siMZJgsBJSSXETHny+SwSuNka8qZNNtU93Ojggx5mFnLhQAYPX5l9HSl2FgZBoQchc7Zr9tPKIAd7cuwIeRuVMuv5CayDhm6pow1yC+ol6d0Ge0Vcgbq52tyOlmADOilDBl7Ahk2fwFxQqYgnyM+b5C9yWSRMm6WlXcO2YlM+L9/0yeAickp5Ct0l/vIFmTEijL28Vev6mKGImuTG8iviM8PLqP3Xy6ORXYgj6P3OchfTtwFAKYhB5IPXYat39QHIYuSs8l3LsPWdVkjkvXJLaRwGbbuD5mC7Elecxk6/XiE3yLkDPICuZes5iIqCHFciONCXIjjQlyI40JciONCXIjjQpzfAYn3DrhYdJOXAAAAAElFTkSuQmCC">`; }
  protected override getClassName() { return this.getType().type; }
  protected override getTitle() { return this.getType().label; }

  protected override selected() {
    this._setHighlighterEnable(true);
    this._setHighlighterType(this.getType().type);
    this._setHighlighterColor(getValue(this.getColorOptions()?.[0]));
    this._getToolbarEl().showDetails(this.getToolbarDetailsEl());
  }

  protected override unselected() {
    this._setHighlighterEnable(false);
    this._hideColorDotEl();
    this._setHighlighterColor('transparent');
    this._setHighlighterStroke('0.125rem');
    this._setHighlighterStrokeStyle('solid');
    this._getToolbarEl().showDetails(null as any);
  }

  protected override _addToolbarUI() {
    if (!this._configs())
      return;

    super._addToolbarUI();

    this._colorDotEl.style.display = 'none';

    // show details on hover
    this.button.addEventListener('mouseover', () => {
      if (this._isHighlighterEnabled() && this._getHighlighterType() == this.getType().type && !this._getToolbarEl().hasDetails()) {
        this._getToolbarEl().showDetails(this.getToolbarDetailsEl());
      }
    });

    this._getDocument().addEventListener('mousedown', ($event: any) => {
      if (this._isHighlighterEnabled() && this._getHighlighterType() == this.getType().type && isLeftClick($event)) {
        if (!$event.target.closest('.pdf-toolbar')) {
          this._colorDotEl.style.display = 'block';
          this._getToolbarEl().showDetails(null as any);
        }
      }
    });
  }

  private _hideColorDotEl() {
    this._colorDotEl.style.display = 'none';
    this._colorDotEl.style.backgroundColor = '';
  }

  protected getToolbarDetailsEl() {
    const className = 'pdfjs-annotation-toolbar__color-options';
    const colorsEl = htmlToElements(
      `<div>
        <div class="${className}">
          ${this.getColorOptions()?.map(color =>
        `<span data-highlight-color="${getValue(color)}" style="background-color: ${getLabel(color)}"></span>`).join('')}
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
      const color = el.getAttribute('data-highlight-color');
      if (color && !el.classList.contains('selected')) {
        colorsEl.querySelectorAll(`.${className} > span.selected`).forEach(other => other.classList.remove('selected'));
        el.classList.add('selected');

        this.color = color;
        this._setHighlighterColor(this.color);
        this._colorDotEl.style.backgroundColor = el.style.backgroundColor;
      }
    });

    (colorsEl.querySelector(`[data-highlight-color="${this._getHighlighterColor()}"]`) as HTMLElement)?.click();

    return [colorsEl];
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-toolbar__${this.getType().type}-btn.selected .color-dot {
            background-color: transparent;
            position: absolute;
            bottom: 0;
            right: 0;
            width: 0.25rem;
            height: 0.25rem;
            border: 1px solid white;
            border-radius: 0.125rem;
          }
        </style>`));
  }
}
