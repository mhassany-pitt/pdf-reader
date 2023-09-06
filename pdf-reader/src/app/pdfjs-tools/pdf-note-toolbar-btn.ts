import { htmlToElements } from './annotator-utils';
import { PdfNoteEditor } from './pdf-note-editor';
import { PdfRegistry } from './pdf-registry';
import { PdfToolbar } from './pdf-toolbar';

export class PdfNoteToolbarBtn {

  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this._addToolbarUI();
  }

  protected getIcon() {
    return `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAACXklEQVR4Ae3dtZbVYBxFcazCShqcN8DpcHdrcKtwd3d9AtweBXepocShw8nldDh8M//ccDLZZ61djv6uW5qNXDmOjKr/DyFAACFAACFAACFACBBACBBAarVaDzVHrVUbKtJaNVt1twHRLzNEXamxy2pwGCQA0UIdUN/GMrVPtSgc5K8YbF9xIN8upjLFfr9MDS4MJOk6g12Og6RhdFNpY92LAJmj0sZmFQGyQaWNbSgCZKdKG9sJCCAMEEAAAQQQQACxGiCf1Qk1QvU2aYQ6pb5UDeSLmur6NKp+t+nqS5VATnz7nrYop6sEMqIEIKOqBNKrBCC9qgQyswQgs6sEcl21MsZopW5W7WbvBdXGEKOtuljVO4ZP1Qm1TW34z21TJ9Uz7qmbDxBAAAEEEEAAYYAAEt8rdU/dbEB31FOV4wB5pEaqFoF71X3VdUDie6465fRQRxt1H5D8X/MaQZkISGwDcgZpDwggTQpkU84gkwCJ7YXqnOOV+kNA4nusRgdv9vZXN7nZm+/eNPKO4TOVPEAYIIAwQAI7pqbXoSXqHSAN3/Q6vGSog3rAOcQAJAEDkDhIHAOQAEgA46FK2TxAYiDxc8a37Uj/3oBYYgBihgGIGQYgZhiAmGEAYoYBiBkGIGYYgJhhAGKGAYgXBiBGGIAYYQBihAGIDwYfNT7925NL8VeMxOPD+JdYYwRAuqsy7p0vRvyALpd5YZsXyGCVgeEA8g1lv7Kfwa2pQg+bt09lnDOU0YElB6nLYPgderW7mqU2qIMlaBEHJyZAACFAACFAACFACBBACBBAqPF9BRPtB7Gk2aW3AAAAAElFTkSuQmCC">`;
  }

  protected getType() {
    return { type: 'note', editor: 'note-editor', label: 'Note' };
  }

  private _getToolbarEl(): PdfToolbar { return this.registry.get('toolbar'); }
  private _getEditor(): PdfNoteEditor { return this.registry.get(this.getType().editor); }

  private _addToolbarUI() {
    // add toolbar button
    const button = htmlToElements(
      `<span class="pdf-toolbar-btn pdf-toolbar__${this.getType().type}-btn" title="${this.getType().label}">
        ${this.getIcon()}
       <span>`);
    this._getToolbarEl().addItem(button);

    // toggle details on click
    button.addEventListener('click', () => {
      button.classList.toggle('selected');
      if (button.classList.contains('selected')) {
        this._getToolbarEl().deselect(button);
        this._getEditor().setEnabled(true);
        this._getEditor().onPointDrop = () => {
          if (button.classList.contains('selected'))
            button.click();
        };
      } else {
        this._getEditor().setEnabled(false);
      }

      this._getToolbarEl().showDetails(null as any);
    });
  }
}
