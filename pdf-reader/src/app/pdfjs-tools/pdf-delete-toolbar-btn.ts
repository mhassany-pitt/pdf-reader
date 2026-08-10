import { PdfDelete } from './pdf-delete';
import { PdfToolbarBtn } from './pdf-toolbar-btn';
import { htmlToElements } from './pdf-utils';

const DELETE_ICON_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAQAAABKfvVzAAAAPElEQVR42mNgGADwv+E/DHTgU3b0Pz5wGFPDYbwaDjEMiGfxgFENoxpoq+ExTvWPsGvwxKHl0X8PeuYaAMKt6lyRETd/AAAAAElFTkSuQmCC';

export class PdfDeleteToolbarBtn extends PdfToolbarBtn {

  constructor({ registry }) {
    super({ registry });

    this.registry.register(`configs.default.delete`, () => PdfDeleteToolbarBtn.defaultConfigs());

    this._addToolbarUI();
  }

  protected _configs() { return this.registry.get(`configs.delete`); }
  static defaultConfigs() {
    return true;
  }

  private _getEditor(): PdfDelete { return this.registry.get('delete'); }

  protected getIcon() {
    // Mask keeps the original PNG shape while allowing a solid red fill.
    return `<span class="pdf-toolbar__delete-icon" aria-hidden="true"></span>`;
  }
  protected override getClassName() { return 'delete'; }
  protected override getTitle() { return 'Delete'; }

  protected override _addToolbarUI() {
    if (!this._configs())
      return;

    super._addToolbarUI();
    this._attachStylesheet();
  }

  protected override selected() {
    this._getEditor().setEnabled(true);
    this._getToolbarEl().setActiveMode('delete');
    this._getToolbarEl().showDetails([
      this._getToolbarEl().makeModePanel({
        title: 'Delete Annotations',
        hint: 'Click an annotation to remove it. You can also select one and press Delete or Backspace.',
        danger: true,
      })
    ]);
  }

  protected override unselected() {
    this._getEditor().setEnabled(false);
    this._getToolbarEl().setActiveMode(null);
    this._getToolbarEl().showDetails(null as any);
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-toolbar__delete-btn {
            color: #d32f2f;
          }
          .pdf-toolbar__delete-icon {
            display: block;
            width: 0.95rem;
            height: 0.95rem;
            background-color: #d32f2f;
            -webkit-mask: url(${DELETE_ICON_PNG}) center / contain no-repeat;
            mask: url(${DELETE_ICON_PNG}) center / contain no-repeat;
            pointer-events: none;
            user-select: none;
          }
          .pdf-toolbar__delete-btn:hover {
            background-color: rgba(211, 47, 47, 0.12);
          }
          .pdf-toolbar__delete-btn:hover .pdf-toolbar__delete-icon {
            background-color: #b71c1c;
          }
          .pdf-toolbar__delete-btn.selected {
            background-color: rgba(211, 47, 47, 0.16);
            box-shadow: inset 0 0 0 1.5px rgba(211, 47, 47, 0.7);
          }
          .pdf-toolbar__delete-btn.selected .pdf-toolbar__delete-icon {
            background-color: #b71c1c;
          }
          .pdf-toolbar__delete-btn.selected:hover {
            background-color: rgba(211, 47, 47, 0.24);
          }
          @media (prefers-color-scheme: dark) {
            .pdf-toolbar__delete-icon {
              background-color: #ff6b6b;
            }
            .pdf-toolbar__delete-btn:hover {
              background-color: rgba(255, 107, 107, 0.16);
            }
            .pdf-toolbar__delete-btn:hover .pdf-toolbar__delete-icon,
            .pdf-toolbar__delete-btn.selected .pdf-toolbar__delete-icon {
              background-color: #ff8a8a;
            }
            .pdf-toolbar__delete-btn.selected {
              background-color: rgba(255, 107, 107, 0.22);
              box-shadow: inset 0 0 0 1.5px rgba(255, 107, 107, 0.75);
            }
            .pdf-toolbar__delete-btn.selected:hover {
              background-color: rgba(255, 107, 107, 0.3);
            }
          }
        </style>`));
  }
}
