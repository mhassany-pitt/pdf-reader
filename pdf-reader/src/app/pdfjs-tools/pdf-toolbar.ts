import { htmlToElements } from "./pdf-utils";
import { PdfRegistry } from "./pdf-registry";

export class PdfToolbar {
  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('toolbar', this);

    this._attachStylesheet();
    this._attachToolbarUI();
  }

  private _attachToolbarUI() {
    const container = htmlToElements(`<div class="pdf-toolbar"><div class="main"></div><div class="details"></div></div>`);
    this.registry.getDocumentEl().querySelector('#mainContainer').appendChild(container);
    this.toggle(false);
    this.showDetails(null as any);
  }

  toggle(show: boolean) {
    this.registry.getDocumentEl().querySelector('.pdf-toolbar').style.display = show ? 'flex' : 'none';
  }

  private _getContainerEl(className: 'main' | 'details'): HTMLElement {
    return this.registry.getDocumentEl().querySelector(`.pdf-toolbar > div.${className}`);
  }

  public addItem(element: HTMLElement) {
    this.toggle(true);
    return this._getContainerEl('main').appendChild(element);
  }

  public addSeparator() {
    this.addItem(htmlToElements('<hr style="width: 75%; border: none; border-top: 1px solid #2a2a2e;"/>'));
  }

  public showDetails(elements: HTMLElement[]) {
    const details = this._getContainerEl('details');
    if (elements?.length) {
      details.innerHTML = '';
      elements.forEach(element => details.appendChild(element));
      details.style.display = 'flex';
    } else {
      details.innerHTML = '';
      details.style.display = 'none';
    }
  }

  public hasDetails() {
    return this._getContainerEl('details').style.display != 'none';
  }

  deselect(except: HTMLElement) {
    [...this.registry
      .getDocumentEl()
      .querySelector('.pdf-toolbar')
      .querySelectorAll('.pdf-toolbar-btn.selected')
    ].filter(el => el != except)
      .forEach(el => el.click());
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-toolbar {
            position: absolute;
            top: 2.25rem;
            left: 0.25rem;
            z-index: 9999;
            border: none;
            border-radius: 0.125rem;
            display: flex;
            align-items: start;
            pointer-events: none;
          }
          .pdf-toolbar > div {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
            justify-content: start;
            padding: 0.125rem;
            pointer-events: auto;
          }
          .pdf-toolbar > div:nth-child(1) {
            background-color: #38383d;
            box-shadow: 0 0 0 1px #0c0c0d;
            align-items: center;
          }
          .pdf-toolbar > div:nth-child(2) {
            background-color: #4e4e51;
            box-shadow: 0 0 0 1px #0c0c0d;
            padding: 0.25rem;
            gap: 0.25rem;
          }
          .pdf-toolbar-btn {
            line-height: 1;
            width: 1.25rem;
            height: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #f9f9fa;
            border-radius: 0.125rem;
            position: relative;
          }
          .pdf-toolbar-btn.selected {
            background-color: gray;
          }
          .pdf-toolbar-btn img {
            width: 0.9rem;
            height: 0.9rem;
            pointer-events: none;
            user-select: none;
          }
        </style>`));
  }
}
