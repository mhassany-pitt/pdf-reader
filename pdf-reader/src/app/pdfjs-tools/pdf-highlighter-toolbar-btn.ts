import { htmlToElements, isLeftClick } from './annotator-utils';
import { PdfHighlighter } from './pdf-highlighter';
import { PdfRegistry } from './pdf-registry';
import { PdfToolbar } from './pdf-toolbar';

export class PdfHighlighterToolbarBtn {

  private registry: PdfRegistry;
  private dot: HTMLElement = null as any;

  constructor({ registry }) {
    this.registry = registry;

    this._addToolbarUI();
    this._hideDetailsOnOutsideMouseDown();
    this._attachStylesheet();
  }

  private _getColors() {
    return ['#ffd400', '#ff6563', '#5db221', '#2ba8e8', '#a28ae9', '#e66df2', '#f29823', '#aaaaaa', 'black'];
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getToolbarEl(): PdfToolbar { return this.registry.get('toolbar'); }
  private _getHighlighter(): PdfHighlighter { return this.registry.get('highlighter'); }

  private _isHighlighting() { return this._getHighlighter().highlighting; }
  private _setHighlighting(value: boolean) { this._getHighlighter().highlighting = value; }
  private _getColor() { return this._getHighlighter().color; }
  private _setColor(value: string) { this._getHighlighter().color = value; }

  private _addToolbarUI() {
    const highlightBtn = this._getButtonEl();
    this._getToolbarEl().addItem(highlightBtn);
    this.dot = highlightBtn.querySelector('.highlighting-color-dot') as HTMLElement;
    this.dot.style.display = 'none';

    highlightBtn.addEventListener('click', () => {
      highlightBtn.classList.toggle('selected');
      if (highlightBtn.classList.contains('selected')) {
        this._setHighlighting(true);
        this._getToolbarEl().showDetails(this._getToolbarDetailsEl());
      } else {
        this._setHighlighting(false);
        this.dot.style.display = 'none';
        this.dot.style.backgroundColor = '';
        this._setColor('')
        this._getToolbarEl().showDetails(null as any);
      }
    });

    highlightBtn.addEventListener('mouseover', () => {
      if (this._isHighlighting() && !this._getToolbarEl().hasDetails()) {
        const details = this._getToolbarDetailsEl();
        this._getToolbarEl().showDetails(details);
        (details.querySelector(`[data-highlight-color="${this._getColor()}"]`) as HTMLElement)?.click();
      }
    });
  }

  private _getButtonEl() {
    return htmlToElements(`<span class="pdf-toolbar-btn pdf-toolbar__highlight-btn" title="Highlight">
        <span class="highlighting-color-dot"></span>
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAFEElEQVR4AWJwL/ABtHdOYbAjQRT+7l3btm3btm3br2vbtm3btm3b3pw9D7VO1yQ9k57qbJ3v+9+6+uKf7kpmAkM4kYWOC3EhjgtxXIgLcVwIgEHIABfSfxEjk3PIt+RLchQZyoX0R8Zo5Gn8N0e5ECMyJF+RgS7EgAzJ92QQF2JAhuQ837LsyHiOjOpCbMh4kYzlh70uoxYuw4W4DI2cZTyDzrmeDOFCUq8MPTeQIV2IARk5SslJxijkGcTn2hy2r1xkDEZuh54XyCdppLiQfSucgY9BZshdSg4yxibfVT20BTC9SGmop7iQ/RHO82SMkpoGV4oLeQ7l+YCMo9RlKcX+kVU4W+j1TUhxITMgnDFlXEIpLmQBhDOIjEsoxYXsgXAmkXGtkmJZxrDkM4Szt4xNJMWF7Ao9P5C52ibFqowhyHvonC/JHNXnjj15dCFbQU9rpViUMSh5nSB/Ke0Qsj70tFqKNRkDyfMoz4/kOuj5gsyec6O3JmQVhHMSGYSc1+aVYk3IIyjPr2QyGdNqKZZkLIlwzpVxpN1SLAm5G+UpyHQyrvVSrMiYF+Fc2eEQ+ZIcGj2ABcnl5HayGxnMspDrEYp8wnOWAmBbUuCfucCkEAAzkQLluUWvNyxFlyHBZPaE6P+RC8u4DKXoMiQLmhICYEryG8rzgF5vW0oFGV+TkawJORPhLCfjcpSyUwcZBdnAVA8BMB75CeV5Kv5GfwOHxHoKsp3MZ0rIcQhnTaU2Vym6DKFfMsYg36M8r5JBZWz+UnQZZoQciXA2UWqb6ilf9qqnKDK2MXmmDmBnhPM2GVzG5iLloDgZBoQA2Al6tlfqzW1fADYnRdQ2FcDEypB8RIYO1VtbKfp5hr4yNKzIKMgqoXprUgBsFyfDgBAAm1WQsbmMJ2akfEu2IUP+rW5MckJczzAgBMCs5GcTMiKkSL4jT5EXyW/xMmwIubXDX34zrd6MFEmjMoSmvxoplL/81oaex3heD2RsK3OaFbIOwtnS0E/Hc5HrEJ+fyMbmf8JVLpZ+1oiIRcnt6C5vkflkTvNCtkV5PiMj9UnCALICeQjd5RWySzYXOQCYkLyJcB4gwyfuE2tHPgniNXIQ2Y2sS6bK6kI5AONXvFj6UTJSwyIGJ+uTF1E/z0rtoClXcXoZCaQAGIbsQN5B/TxB1u/Xk0vTyUggBcBwIuID1M+9+s/GaWheRgIpAEYje5IvUD+3kLlbc5+6NPA3oOchvcnHNXoAQ5PDyPeol9/IhWQGmcsMKWQ8SEYgE/ZSCoCRyeMRJ3Gnkclb9zQg2aZeq7IVRdcEADAieQTV8yM5iYwnc5glmYzua6NkfE2OImNLvXmSyoidI0LGJ2RPSH1ONNYzejOX9JTqPeN9siMZJgsBJSSXETHny+SwSuNka8qZNNtU93Ojggx5mFnLhQAYPX5l9HSl2FgZBoQchc7Zr9tPKIAd7cuwIeRuVMuv5CayDhm6pow1yC+ol6d0Ge0Vcgbq52tyOlmADOilDBl7Ahk2fwFxQqYgnyM+b5C9yWSRMm6WlXcO2YlM+L9/0yeAickp5Ct0l/vIFmTEijL28Vev6mKGImuTG8iviM8PLqP3Xy6ORXYgj6P3OchfTtwFAKYhB5IPXYat39QHIYuSs8l3LsPWdVkjkvXJLaRwGbbuD5mC7Elecxk6/XiE3yLkDPICuZes5iIqCHFciONCXIjjQlyI40JciONCXIjjQpzfAYn3DrhYdJOXAAAAAElFTkSuQmCC">
      <span>`);
  }

  private _getToolbarDetailsEl() {
    const className = 'pdfjs-annotation-toolbar__color-options';
    const colorsEl = htmlToElements(
      `<div>
        <div class="${className}">
          ${this._getColors().map(color => `<span data-highlight-color="${color}" style="background-color: ${color}"></span>`).join('')}
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
        </style>
      </div>`);

    colorsEl.querySelector(`.${className}`)?.addEventListener('click', ($event: any) => {
      const el = $event.target;
      const color = el.getAttribute('data-highlight-color');
      if (!color)
        return;

      if (!el.classList.contains('selected')) {
        this._setColor(color);
        const otherColorEls = colorsEl.querySelectorAll(`.${className} > span`);
        otherColorEls.forEach((other: any) => {
          other.classList.remove('selected');
          other.style.borderColor = 'transparent';
        });
        el.classList.add('selected');
        el.style.borderColor = 'white';
        this.dot.style.backgroundColor = this._getColor();
      }
    });

    return colorsEl;
  };

  private _hideDetailsOnOutsideMouseDown() {
    this._getDocument().addEventListener('mousedown', ($event: any) => {
      if (this._isHighlighting() && isLeftClick($event)) {
        if (!$event.target.closest('.pdf-toolbar')) {
          this.dot.style.display = 'block';
          this._getToolbarEl().showDetails(null as any);
        }
      }
    });
  }

  private _attachStylesheet() {
    this.registry.getDocumentEl().querySelector('head').appendChild(htmlToElements(
      `<style>
        .pdf-toolbar__highlight-btn .highlighting-color-dot {
          background-color: red;
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
