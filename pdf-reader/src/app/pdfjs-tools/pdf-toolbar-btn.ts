import { htmlToElements } from './annotator-utils';
import { PdfNoteToolbarBtn } from './pdf-note-toolbar-btn';
import { PdfRegistry } from './pdf-registry';
import { PdfToolbar } from './pdf-toolbar';

export abstract class PdfToolbarBtn {

  protected button: HTMLElement = null as any;
  protected registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this._addToolbarUI();
  }

  protected _getToolbarEl(): PdfToolbar {
    return this.registry.get('toolbar');
  }

  protected _addToolbarUI() {
    // add toolbar button
    this.button = htmlToElements(
      `<span 
        class="pdf-toolbar-btn ${this.getClassName()
        /**/ ? `pdf-toolbar__${this.getClassName()}-btn`
        /**/ : ''}" 
        title="${this.getTitle()}"
       >
        ${this.getOtherEl()}
        ${this.getIcon()}
       <span>`);
    this._getToolbarEl().addItem(this.button);

    // toggle details on click
    this.button.addEventListener('click', () => {
      this.button.classList.toggle('selected');
      if (this.button.classList.contains('selected')) {
        this._getToolbarEl().deselect(this.button);
        this.selected();
      } else {
        this.unselected();
      }
    });
  }

  protected getOtherEl() { return ''; }
  protected abstract getIcon();
  protected abstract getClassName();
  protected abstract getTitle();
  protected abstract selected();
  protected abstract unselected();
}