import { htmlToElements } from "./annotator-utils";

export class Toolbar {
  private document: any;
  private documentEl: any;

  private pdfjs: any;

  constructor({ iframe, pdfjs }) {
    this.document = iframe?.contentDocument;
    this.documentEl = this.document.documentElement;

    this.pdfjs = pdfjs;

    this._attachStylesheet();
    this._attachToolbarUI();
  }

  private _attachStylesheet() {
    this.documentEl.querySelector('head').appendChild(
      htmlToElements(
        `<style>
        #pdfjs-annotation-toolbar {
          position: absolute;
          top: 2.25rem;
          left: 0.25rem;
          z-index: 9999;
          border: none;
          border-radius: 0.125rem;
          display: flex;
          align-items: start;
        }
        #pdfjs-annotation-toolbar > div {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          align-items: center;
          justify-content: start;
          padding: 0.125rem;
        }
        #pdfjs-annotation-toolbar > div:nth-child(1) {
          background-color: #38383d;
          box-shadow: 0 0 0 1px #0c0c0d;
        }
        #pdfjs-annotation-toolbar > div:nth-child(2) {
          background-color: #4e4e51;
          box-shadow: 0 0 0 1px #0c0c0d;
        }
        .pdfjs-annotation-toolbar-btn {
          line-height: 1;
          width: 1.25rem;
          height: 1.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #f9f9fa;
          border-radius: 0.125rem;
        }
        .pdfjs-annotation-toolbar-btn--selected {
          background-color: gray;
        }
        .pdfjs-annotation-toolbar-btn img {
          width: 0.9rem;
          height: 0.9rem;
        }
        </style>`));
  }

  private _attachToolbarUI() {
    this.documentEl.querySelector('#mainContainer').appendChild(htmlToElements(`<div id="pdfjs-annotation-toolbar"><div></div><div></div></div>`));
  }

  private _getToolbarEl(nth = 1) {
    return this.documentEl.querySelector(`#pdfjs-annotation-toolbar > div:nth-child(${nth})`);
  }

  public getToolbarEl(): HTMLElement {
    return this._getToolbarEl(1);
  }

  public addItem(element: HTMLElement, nth: 1 | 2 = 1) {
    return this._getToolbarEl(nth).appendChild(element);
  }

  public clearItems(nth: 1 | 2 = 1) {
    return this._getToolbarEl(nth).innerHTML = '';
  }

  public showDetailsContainer(show: boolean) {
    this._getToolbarEl(2).style.display = show ? 'flex' : 'none';
  }
}
