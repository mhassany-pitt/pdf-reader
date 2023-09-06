import { htmlToElements, isLeftClick } from './annotator-utils';
import { PdfHighlighter } from './pdf-highlighter';
import { PdfRegistry } from './pdf-registry';
import { PdfToolbar } from './pdf-toolbar';

export class PdfHighlighterToolbarBtn {

  protected registry: PdfRegistry;
  private colorDotEl: HTMLElement = null as any;

  protected getType() { return 'highlight'; }
  protected color = 'transparent';
  protected stroke = '0.125rem';
  protected strokeStyle = 'solid';

  constructor({ registry }) {
    this.registry = registry;

    this._addToolbarUI();
    this._attachStylesheet();
  }

  protected _getDocument() { return this.registry.getDocument(); }
  protected _getToolbarEl(): PdfToolbar { return this.registry.get('toolbar'); }
  protected _getHighlighter(): PdfHighlighter { return this.registry.get('highlighter'); }

  protected _setType(value: string) { this._getHighlighter().type = value; }
  protected _getType() { return this._getHighlighter().type; }
  protected _isEnabled() { return this._getHighlighter().enabled; }
  protected _setEnable(value: boolean) { this._getHighlighter().enabled = value; }
  protected _getColor() { return this._getHighlighter().color; }
  protected _setColor(value: string) { this._getHighlighter().color = value; }
  protected _getStroke() { return this._getHighlighter().stroke; }
  protected _setStroke(value: string) { this._getHighlighter().stroke = value; }
  protected _getStrokeStyle() { return this._getHighlighter().strokeStyle; }
  protected _setStrokeStyle(value: string) { this._getHighlighter().strokeStyle = value; }

  protected getIcon() {
    return `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAFEElEQVR4AWJwL/ABtHdOYbAjQRT+7l3btm3btm3br2vbtm3btm3b3pw9D7VO1yQ9k57qbJ3v+9+6+uKf7kpmAkM4kYWOC3EhjgtxXIgLcVwIgEHIABfSfxEjk3PIt+RLchQZyoX0R8Zo5Gn8N0e5ECMyJF+RgS7EgAzJ92QQF2JAhuQ837LsyHiOjOpCbMh4kYzlh70uoxYuw4W4DI2cZTyDzrmeDOFCUq8MPTeQIV2IARk5SslJxijkGcTn2hy2r1xkDEZuh54XyCdppLiQfSucgY9BZshdSg4yxibfVT20BTC9SGmop7iQ/RHO82SMkpoGV4oLeQ7l+YCMo9RlKcX+kVU4W+j1TUhxITMgnDFlXEIpLmQBhDOIjEsoxYXsgXAmkXGtkmJZxrDkM4Szt4xNJMWF7Ao9P5C52ibFqowhyHvonC/JHNXnjj15dCFbQU9rpViUMSh5nSB/Ke0Qsj70tFqKNRkDyfMoz4/kOuj5gsyec6O3JmQVhHMSGYSc1+aVYk3IIyjPr2QyGdNqKZZkLIlwzpVxpN1SLAm5G+UpyHQyrvVSrMiYF+Fc2eEQ+ZIcGj2ABcnl5HayGxnMspDrEYp8wnOWAmBbUuCfucCkEAAzkQLluUWvNyxFlyHBZPaE6P+RC8u4DKXoMiQLmhICYEryG8rzgF5vW0oFGV+TkawJORPhLCfjcpSyUwcZBdnAVA8BMB75CeV5Kv5GfwOHxHoKsp3MZ0rIcQhnTaU2Vym6DKFfMsYg36M8r5JBZWz+UnQZZoQciXA2UWqb6ilf9qqnKDK2MXmmDmBnhPM2GVzG5iLloDgZBoQA2Al6tlfqzW1fADYnRdQ2FcDEypB8RIYO1VtbKfp5hr4yNKzIKMgqoXprUgBsFyfDgBAAm1WQsbmMJ2akfEu2IUP+rW5MckJczzAgBMCs5GcTMiKkSL4jT5EXyW/xMmwIubXDX34zrd6MFEmjMoSmvxoplL/81oaex3heD2RsK3OaFbIOwtnS0E/Hc5HrEJ+fyMbmf8JVLpZ+1oiIRcnt6C5vkflkTvNCtkV5PiMj9UnCALICeQjd5RWySzYXOQCYkLyJcB4gwyfuE2tHPgniNXIQ2Y2sS6bK6kI5AONXvFj6UTJSwyIGJ+uTF1E/z0rtoClXcXoZCaQAGIbsQN5B/TxB1u/Xk0vTyUggBcBwIuID1M+9+s/GaWheRgIpAEYje5IvUD+3kLlbc5+6NPA3oOchvcnHNXoAQ5PDyPeol9/IhWQGmcsMKWQ8SEYgE/ZSCoCRyeMRJ3Gnkclb9zQg2aZeq7IVRdcEADAieQTV8yM5iYwnc5glmYzua6NkfE2OImNLvXmSyoidI0LGJ2RPSH1ONNYzejOX9JTqPeN9siMZJgsBJSSXETHny+SwSuNka8qZNNtU93Ojggx5mFnLhQAYPX5l9HSl2FgZBoQchc7Zr9tPKIAd7cuwIeRuVMuv5CayDhm6pow1yC+ol6d0Ge0Vcgbq52tyOlmADOilDBl7Ahk2fwFxQqYgnyM+b5C9yWSRMm6WlXcO2YlM+L9/0yeAickp5Ct0l/vIFmTEijL28Vev6mKGImuTG8iviM8PLqP3Xy6ORXYgj6P3OchfTtwFAKYhB5IPXYat39QHIYuSs8l3LsPWdVkjkvXJLaRwGbbuD5mC7Elecxk6/XiE3yLkDPICuZes5iIqCHFciONCXIjjQlyI40JciONCXIjjQpzfAYn3DrhYdJOXAAAAAElFTkSuQmCC">`;
  }

  protected getColorOptions() {
    return ['#ffd40075', '#ff656375', '#5db22175', '#2ba8e875', '#a28ae975', '#e66df275', '#f2982375', '#aaaaaa75', 'black'];
  }

  private _addToolbarUI() {
    // add toolbar button
    const button = htmlToElements(
      `<span class="pdf-toolbar-btn pdf-toolbar__${this.getType()}-btn" title="Highlight">
        <span class="color-dot"></span>
        ${this.getIcon()}    
       <span>`);
    this.colorDotEl = button.querySelector(`.color-dot`) as HTMLElement;
    this.colorDotEl.style.display = 'none';
    this._getToolbarEl().addItem(button);

    // toggle details on click
    button.addEventListener('click', () => {
      button.classList.toggle('selected');
      if (button.classList.contains('selected')) {
        this._getToolbarEl().deselect(button);
        this._setEnable(true);
        this._setType(this.getType());
        this._setColor(this.getColorOptions()[0]);
        this._getToolbarEl().showDetails(this.getToolbarDetailsEl());
      } else {
        this._setEnable(false);
        this._hideColorDot();
        this._setColor('transparent');
        this._setStroke('0.125rem');
        this._setStrokeStyle('solid');
        this._getToolbarEl().showDetails(null as any);
      }
    });

    // show details on hover
    button.addEventListener('mouseover', () => {
      if (this._isEnabled() && this._getType() == this.getType() && !this._getToolbarEl().hasDetails()) {
        this._getToolbarEl().showDetails(this.getToolbarDetailsEl());
      }
    });

    this._getDocument().addEventListener('mousedown', ($event: any) => {
      if (this._isEnabled() && this._getType() == this.getType() && isLeftClick($event)) {
        if (!$event.target.closest('.pdf-toolbar')) {
          this.colorDotEl.style.display = 'block';
          this._getToolbarEl().showDetails(null as any);
        }
      }
    });
  }

  private _hideColorDot() {
    this.colorDotEl.style.display = 'none';
    this.colorDotEl.style.backgroundColor = '';
  }

  protected getToolbarDetailsEl() {
    const className = 'pdfjs-annotation-toolbar__color-options';
    const colorsEl = htmlToElements(
      `<div>
        <div class="${className}">
          ${this.getColorOptions().map(color =>
        `<span data-highlight-color="${color}" style="background-color: ${color.startsWith('#') && color.length == 9 ? color.substring(0, 7) : color}"></span>`).join('')}
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
        this._setColor(this.color);
        this.colorDotEl.style.backgroundColor = el.style.backgroundColor;
      }
    });

    (colorsEl.querySelector(`[data-highlight-color="${this._getColor()}"]`) as HTMLElement)?.click();

    return [colorsEl];
  }

  private _attachStylesheet() {
    this.registry.getDocumentEl().querySelector('head').appendChild(htmlToElements(
      `<style>
        .pdf-toolbar__${this.getType()}-btn.selected .color-dot {
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
