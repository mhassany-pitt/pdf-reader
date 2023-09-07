import { htmlToElements } from './annotator-utils';
import { PdfNoteEditor } from './pdf-note-editor';
import { PdfRegistry } from './pdf-registry';
import { PdfToolbar } from './pdf-toolbar';
import { PdfToolbarBtn } from './pdf-toolbar-btn';

export class PdfNoteToolbarBtn extends PdfToolbarBtn {

  constructor({ registry }) {
    super({ registry })
  }

  private _getEditor(): PdfNoteEditor { return this.registry.get(this.getType().editor); }

  protected getType() {
    return {
      type: 'note',
      editor: 'note-editor',
      label: 'Note'
    };
  }

  protected getIcon() { return `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAACXklEQVR4Ae3dtZbVYBxFcazCShqcN8DpcHdrcKtwd3d9AtweBXepocShw8nldDh8M//ccDLZZ61djv6uW5qNXDmOjKr/DyFAACFAACFAACFACBBACBBAarVaDzVHrVUbKtJaNVt1twHRLzNEXamxy2pwGCQA0UIdUN/GMrVPtSgc5K8YbF9xIN8upjLFfr9MDS4MJOk6g12Og6RhdFNpY92LAJmj0sZmFQGyQaWNbSgCZKdKG9sJCCAMEEAAAQQQQACxGiCf1Qk1QvU2aYQ6pb5UDeSLmur6NKp+t+nqS5VATnz7nrYop6sEMqIEIKOqBNKrBCC9qgQyswQgs6sEcl21MsZopW5W7WbvBdXGEKOtuljVO4ZP1Qm1TW34z21TJ9Uz7qmbDxBAAAEEEEAAYYAAEt8rdU/dbEB31FOV4wB5pEaqFoF71X3VdUDie6465fRQRxt1H5D8X/MaQZkISGwDcgZpDwggTQpkU84gkwCJ7YXqnOOV+kNA4nusRgdv9vZXN7nZm+/eNPKO4TOVPEAYIIAwQAI7pqbXoSXqHSAN3/Q6vGSog3rAOcQAJAEDkDhIHAOQAEgA46FK2TxAYiDxc8a37Uj/3oBYYgBihgGIGQYgZhiAmGEAYoYBiBkGIGYYgJhhAGKGAYgXBiBGGIAYYQBihAGIDwYfNT7925NL8VeMxOPD+JdYYwRAuqsy7p0vRvyALpd5YZsXyGCVgeEA8g1lv7Kfwa2pQg+bt09lnDOU0YElB6nLYPgderW7mqU2qIMlaBEHJyZAACFAACFAACFACBBACBBAqPF9BRPtB7Gk2aW3AAAAAElFTkSuQmCC">`; }
  protected override getClassName() { return this.getType().type; }
  protected override getTitle() { return this.getType().label; }

  protected override selected() {
    this._getEditor().setEnabled(true);
    this._getEditor().onPointDrop = () => {
      if (this.button.classList.contains('selected'))
        this.button.click();
    };
    this._getToolbarEl().showDetails(null as any);
  }

  protected override unselected() {
    this._getEditor().setEnabled(false);
    this._getToolbarEl().showDetails(null as any);
  }
}
