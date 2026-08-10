import { PdfToolbarBtn } from './pdf-toolbar-btn';
import { htmlToElements } from './pdf-utils';

const OUTLINE_ICON = `<svg class="pdf-toolbar__outline-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M4 5h16v2H4V5Zm0 6h16v2H4v-2Zm0 6h10v2H4v-2Z"/>
</svg>`;

export class PdfOutlineToolbarBtn extends PdfToolbarBtn {

  private _activeEntry: any = null;
  private _filter = '';
  private _listEl: HTMLElement | null = null;

  constructor({ registry }) {
    super({ registry });

    this.registry.register('outline-toolbar', this);
    this.registry.register(`configs.default.outline`, () => PdfOutlineToolbarBtn.defaultConfigs());

    this._addToolbarUI();
  }

  protected _configs() { return this.registry.get(`configs.outline`); }
  static defaultConfigs() { return true; }

  private _getOutline(): any[] {
    return this.registry.get('pdfDoc')?.outline || [];
  }

  private _getReader() { return this.registry.get('reader'); }

  protected override getIcon() { return OUTLINE_ICON; }
  protected override getClassName() { return 'outline'; }
  protected override getTitle() { return 'Document outline'; }

  protected override _addToolbarUI() {
    if (this._configs() === false)
      return;

    super._addToolbarUI();
    this._attachStylesheet();
  }

  setVisible(show: boolean) {
    if (!this.button) return;
    this.button.style.display = show ? '' : 'none';
    if (!show && this.button.classList.contains('selected')) {
      this.button.classList.remove('selected');
      this.unselected();
    }
  }

  setActiveEntry(entry: any) {
    this._activeEntry = entry;
    this._paintActive();
  }

  protected override selected() {
    this._getToolbarEl().setActiveMode('outline');
    this._getToolbarEl().showDetails(this._buildPanel());
  }

  protected override unselected() {
    this._getToolbarEl().setActiveMode(null);
    this._getToolbarEl().showDetails(null as any);
    this._listEl = null;
  }

  private _buildPanel(): HTMLElement[] {
    const outline = this._getOutline();
    const panel = htmlToElements(
      `<div class="pdf-annotation-panel pdf-annotation-outline">
        <div class="pdf-annotation-panel__header">Document outline</div>
        <div class="pdf-annotation-panel__hint">Jump to a section in this PDF.</div>
        <div class="pdf-annotation-outline__search">
          <input type="search" class="pdf-annotation-field pdf-annotation-outline__filter"
            placeholder="Search sections…" value="${this._escape(this._filter)}"
            aria-label="Search outline"/>
        </div>
        <div class="pdf-annotation-outline__list" role="listbox" aria-label="Outline"></div>
        <div class="pdf-annotation-outline__empty" style="display: none;">No matching sections</div>
      </div>`);

    this._listEl = panel.querySelector('.pdf-annotation-outline__list') as HTMLElement;
    const emptyEl = panel.querySelector('.pdf-annotation-outline__empty') as HTMLElement;
    const filterEl = panel.querySelector('.pdf-annotation-outline__filter') as HTMLInputElement;

    const render = () => {
      const q = this._filter.trim().toLowerCase();
      const items = outline.filter((e: any) =>
        !q || String(e.title || '').toLowerCase().includes(q));

      if (!outline.length) {
        this._listEl!.innerHTML = '';
        emptyEl.style.display = 'block';
        emptyEl.textContent = 'Outline is empty';
        return;
      }

      if (!items.length) {
        this._listEl!.innerHTML = '';
        emptyEl.style.display = 'block';
        emptyEl.textContent = 'No matching sections';
        return;
      }

      emptyEl.style.display = 'none';
      this._listEl!.innerHTML = items.map((entry: any, i: number) => {
        const level = Math.max(0, Number(entry.level) || 0);
        const active = this._isActive(entry) ? 'is-active' : '';
        return `<button type="button" class="pdf-annotation-outline__item ${active}"
            data-outline-index="${outline.indexOf(entry)}"
            role="option" aria-selected="${active ? 'true' : 'false'}"
            style="padding-left: calc(0.55rem + ${level} * 0.65rem)">
            <span class="pdf-annotation-outline__title">${this._escape(entry.title || 'Untitled')}</span>
            <span class="pdf-annotation-outline__page">p${entry.page ?? '?'}</span>
          </button>`;
      }).join('');
    };

    filterEl.addEventListener('input', () => {
      this._filter = filterEl.value;
      render();
    });

    this._listEl.addEventListener('click', ($event: any) => {
      const btn = $event.target.closest('.pdf-annotation-outline__item');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-outline-index'), 10);
      const entry = outline[idx];
      if (!entry) return;
      this._activeEntry = entry;
      this._paintActive();
      this._getReader()?.scrollToEntry?.(entry);
    });

    render();
    // Keep focus in search for quick jump
    setTimeout(() => filterEl.focus(), 0);
    return [panel];
  }

  private _isActive(entry: any) {
    if (!this._activeEntry || !entry) return false;
    return this._activeEntry === entry
      || (this._activeEntry.title === entry.title && this._activeEntry.page === entry.page);
  }

  private _paintActive() {
    if (!this._listEl) return;
    this._listEl.querySelectorAll('.pdf-annotation-outline__item').forEach((el: Element) => {
      const idx = parseInt(el.getAttribute('data-outline-index') || '-1', 10);
      const entry = this._getOutline()[idx];
      const on = this._isActive(entry);
      el.classList.toggle('is-active', on);
      el.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  private _escape(value: string) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private _attachStylesheet() {
    this.registry.getDocumentEl().querySelector('head')?.appendChild(htmlToElements(
      `<style>
        .pdf-toolbar__outline-icon {
          width: 0.95rem;
          height: 0.95rem;
          display: block;
          color: var(--pdf-annot-text, #2c2c2c);
          pointer-events: none;
        }
        .pdf-annotation-outline {
          min-width: 15.5rem;
          max-width: 18rem;
        }
        .pdf-annotation-outline__search {
          display: flex;
        }
        .pdf-annotation-outline__filter {
          width: 100%;
        }
        .pdf-annotation-outline__list {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          max-height: 16rem;
          overflow-y: auto;
          margin: 0 -0.15rem;
          padding: 0.1rem 0.15rem;
        }
        .pdf-annotation-outline__item {
          appearance: none;
          border: none;
          background: transparent;
          color: var(--pdf-annot-text, #1f2937);
          font: inherit;
          font-size: 0.775rem;
          font-weight: 500;
          line-height: 1.3;
          text-align: left;
          display: flex;
          align-items: baseline;
          gap: 0.45rem;
          width: 100%;
          padding: 0.4rem 0.55rem;
          border-radius: 0.4rem;
          cursor: pointer;
        }
        .pdf-annotation-outline__item:hover {
          background: color-mix(in srgb, var(--pdf-annot-accent, #3d6df0) 8%, transparent);
        }
        .pdf-annotation-outline__item.is-active {
          background: color-mix(in srgb, var(--pdf-annot-accent, #3d6df0) 14%, transparent);
          box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--pdf-annot-accent, #3d6df0) 45%, transparent);
        }
        .pdf-annotation-outline__title {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pdf-annotation-outline__page {
          flex-shrink: 0;
          font-size: 0.68rem;
          font-weight: 650;
          color: var(--pdf-annot-muted, #6b7280);
        }
        .pdf-annotation-outline__empty {
          font-size: 0.75rem;
          color: var(--pdf-annot-muted, #6b7280);
          padding: 0.5rem 0.15rem;
        }
      </style>`));
  }
}
