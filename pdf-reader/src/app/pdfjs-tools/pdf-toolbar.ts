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
    const container = htmlToElements(`<div class="pdf-toolbar"><div class="pdf-toolbar__main"></div><div class="pdf-toolbar__details"></div></div>`);
    this.registry.getDocumentEl().querySelector('#mainContainer').appendChild(container);
    this.toggle(false);
    this.showDetails(null as any);
  }

  toggle(show: boolean) {
    this.registry.getDocumentEl().querySelector('.pdf-toolbar').style.display = show ? 'flex' : 'none';
  }

  private _getContainerEl(className: 'main' | 'details'): HTMLElement {
    return this.registry.getDocumentEl().querySelector(`.pdf-toolbar > div.pdf-toolbar__${className}`);
  }

  public addItem(element: HTMLElement) {
    this.toggle(true);
    return this._getContainerEl('main').appendChild(element);
  }

  public addSeparator() {
    this.addItem(htmlToElements('<hr class="pdf-toolbar__separator"/>'));
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

  private _getModeHost(): HTMLElement {
    return this.registry.getDocumentEl().querySelector('#mainContainer')
      || this.registry.getDocumentEl().body;
  }

  public setActiveMode(mode: string | null) {
    const host = this._getModeHost();
    if (mode) host.setAttribute('data-pdf-annot-mode', mode);
    else host.removeAttribute('data-pdf-annot-mode');
  }

  public makeModePanel(opts: { title: string; hint: string; danger?: boolean }): HTMLElement {
    return htmlToElements(
      `<div class="pdf-annotation-panel ${opts.danger ? 'pdf-annotation-panel--danger' : ''}">
        <div class="pdf-annotation-panel__header">${opts.title}</div>
        <div class="pdf-annotation-panel__hint">${opts.hint}</div>
      </div>`);
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          :root, #mainContainer {
            --pdf-annot-surface: var(--toolbar-bg-color, rgba(249, 249, 250, 1));
            --pdf-annot-border: var(--toolbar-border-color, rgba(184, 184, 184, 1));
            --pdf-annot-text: var(--toolbar-icon-color, #2c2c2c);
            --pdf-annot-muted: color-mix(in srgb, var(--pdf-annot-text) 62%, transparent);
            --pdf-annot-field-bg: var(--field-bg-color, #ffffff);
            --pdf-annot-field-text: var(--field-color, #2c2c2c);
            --pdf-annot-accent: #3d6df0;
            --pdf-annot-danger: #c62828;
            --pdf-annot-radius: 0.5rem;
            --pdf-annot-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--pdf-annot-border);
            --pdf-annot-shadow-lg: 0 8px 28px rgba(0, 0, 0, 0.16), 0 0 0 1px var(--pdf-annot-border);
          }
          .pdf-toolbar {
            position: absolute;
            top: 2.35rem;
            left: 0.35rem;
            z-index: 9999;
            border: none;
            display: flex;
            align-items: flex-start;
            pointer-events: none;
            transition: left 0.2s ease;
            gap: 0.35rem;
          }
          .sidebarOpen .pdf-toolbar {
            left: calc(var(--sidebar-width) + 0.35rem);
          }
          .pdf-toolbar > div {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
            justify-content: flex-start;
            pointer-events: auto;
          }
          .pdf-toolbar__main {
            background-color: var(--pdf-annot-surface);
            box-shadow: var(--pdf-annot-shadow);
            border-radius: var(--pdf-annot-radius);
            align-items: center;
            padding: 0.3rem 0.2rem;
            min-width: 2rem;
          }
          .pdf-toolbar__details {
            background-color: var(--pdf-annot-surface);
            box-shadow: var(--pdf-annot-shadow-lg);
            color: var(--pdf-annot-text);
            border-radius: var(--pdf-annot-radius);
            padding: 0.65rem 0.75rem;
            gap: 0.55rem;
            font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
            font-size: 0.8125rem;
            min-width: 12.5rem;
            max-width: 19rem;
          }
          .pdf-toolbar__separator {
            width: 60%;
            height: 0;
            margin: 0.15rem 0;
            border: none;
            border-top: 1px solid color-mix(in srgb, var(--pdf-annot-border) 85%, transparent);
          }
          .pdf-toolbar-btn {
            line-height: 1;
            width: 1.55rem;
            height: 1.55rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--pdf-annot-text);
            border-radius: 0.35rem;
            position: relative;
            user-select: none;
            transition: background-color 0.12s ease, box-shadow 0.12s ease;
          }
          .pdf-toolbar-btn:hover {
            background-color: rgba(0, 0, 0, 0.07);
          }
          .pdf-toolbar-btn.selected {
            background-color: rgba(61, 109, 240, 0.14);
            box-shadow: inset 0 0 0 1.5px rgba(61, 109, 240, 0.55);
          }
          .pdf-toolbar-btn.selected:hover {
            background-color: rgba(61, 109, 240, 0.2);
          }
          .pdf-toolbar-btn img {
            width: 0.95rem;
            height: 0.95rem;
            pointer-events: none;
            user-select: none;
            filter: invert(0.82);
          }

          /* Shared details panel */
          .pdf-annotation-panel {
            display: flex;
            flex-direction: column;
            gap: 0.55rem;
            width: 100%;
          }
          .pdf-annotation-panel__header {
            font-size: 0.6875rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--pdf-annot-muted);
            padding-bottom: 0.35rem;
            border-bottom: 1px solid color-mix(in srgb, var(--pdf-annot-border) 80%, transparent);
            margin-bottom: 0.05rem;
          }
          .pdf-annotation-panel__section {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
          }
          .pdf-annotation-panel__section-label {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--pdf-annot-text);
          }
          .pdf-annotation-panel__hint {
            font-size: 0.6875rem;
            line-height: 1.35;
            color: var(--pdf-annot-muted);
          }

          /* Quiet authorship — shown in popups / titles, not as page chrome */
          .pdf-annotation__author {
            display: block;
            margin-top: 0.12rem;
            font-size: 0.68rem;
            font-weight: 500;
            line-height: 1.25;
            color: var(--note-muted, var(--popup-muted, var(--pdf-annot-muted, #6b7280)));
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
          }
          .pdf-annotation__author::before {
            content: "By ";
            font-weight: 450;
            opacity: 0.85;
          }

          /* Color swatches */
          .pdf-annotation-swatches {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            flex-wrap: wrap;
          }
          .pdf-annotation-swatches > span {
            user-select: none;
            cursor: pointer;
            width: 1.15rem;
            height: 1.15rem;
            border-radius: 50%;
            border: 2px solid transparent;
            box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.12);
            transition: transform 0.1s ease, box-shadow 0.1s ease;
          }
          .pdf-annotation-swatches > span:hover {
            transform: scale(1.12);
          }
          .pdf-annotation-swatches > span.selected {
            border-color: var(--pdf-annot-text);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35), 0 0 0 1.5px var(--pdf-annot-surface), 0 1px 3px rgba(0, 0, 0, 0.2);
            transform: scale(1.15);
          }

          /* Segmented options (line styles) */
          .pdf-annotation-segments {
            display: flex;
            gap: 0.25rem;
          }
          .pdf-annotation-segments > span {
            user-select: none;
            cursor: pointer;
            flex: 1;
            text-align: center;
            padding: 0.28rem 0.35rem;
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--pdf-annot-text);
            background-color: rgba(0, 0, 0, 0.045);
            border: 1px solid var(--pdf-annot-border);
            border-radius: 0.35rem;
            transition: background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease;
          }
          .pdf-annotation-segments > span:hover {
            background-color: rgba(0, 0, 0, 0.08);
          }
          .pdf-annotation-segments > span.selected {
            background-color: var(--pdf-annot-accent);
            border-color: var(--pdf-annot-accent);
            color: #ffffff;
          }

          /* Range row */
          .pdf-annotation-range {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .pdf-annotation-range > input[type="range"] {
            flex: 1;
            min-width: 0;
            accent-color: var(--pdf-annot-accent);
            cursor: pointer;
          }
          .pdf-annotation-range__value {
            min-width: 2.25rem;
            text-align: right;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--pdf-annot-text);
            font-variant-numeric: tabular-nums;
          }

          /* Form controls */
          .pdf-annotation-field {
            width: 100%;
            box-sizing: border-box;
            padding: 0.35rem 0.45rem;
            font-size: 0.8rem;
            border-radius: 0.35rem;
            border: 1px solid var(--pdf-annot-border);
            background-color: var(--pdf-annot-field-bg);
            color: var(--pdf-annot-field-text);
            outline: none;
            transition: border-color 0.12s ease, box-shadow 0.12s ease;
          }
          .pdf-annotation-field:focus {
            border-color: var(--pdf-annot-accent);
            box-shadow: 0 0 0 2px rgba(61, 109, 240, 0.18);
          }
          .pdf-annotation-btn {
            padding: 0.3rem 0.55rem;
            font-size: 0.75rem;
            font-weight: 600;
            border-radius: 0.35rem;
            background-color: rgba(0, 0, 0, 0.05);
            color: var(--pdf-annot-text);
            border: 1px solid var(--pdf-annot-border);
            cursor: pointer;
            white-space: nowrap;
            transition: background-color 0.12s ease;
          }
          .pdf-annotation-btn:hover {
            background-color: rgba(0, 0, 0, 0.1);
          }
          .pdf-annotation-btn:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }
          .pdf-annotation-btn--primary {
            background-color: var(--pdf-annot-accent);
            border-color: var(--pdf-annot-accent);
            color: #ffffff;
          }
          .pdf-annotation-btn--primary:hover {
            background-color: #2f5ad4;
          }
          .pdf-annotation-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 0.3rem;
          }
          .pdf-annotation-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.725rem;
            padding: 0.2rem 0.4rem 0.2rem 0.5rem;
            background-color: rgba(61, 109, 240, 0.08);
            color: var(--pdf-annot-text);
            border: 1px solid color-mix(in srgb, var(--pdf-annot-accent) 28%, var(--pdf-annot-border));
            border-radius: 999px;
            max-width: 100%;
          }
          .pdf-annotation-chip > span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .pdf-annotation-chip > button {
            background: none;
            border: none;
            color: inherit;
            cursor: pointer;
            font-weight: 700;
            font-size: 0.7rem;
            line-height: 1;
            padding: 0.1rem;
            opacity: 0.55;
            border-radius: 50%;
          }
          .pdf-annotation-chip > button:hover {
            opacity: 1;
            color: var(--pdf-annot-danger);
          }
          .pdf-annotation-check {
            display: flex;
            align-items: flex-start;
            gap: 0.4rem;
            cursor: pointer;
            font-size: 0.8rem;
            color: var(--pdf-annot-text);
            line-height: 1.35;
          }
          .pdf-annotation-check > input {
            margin-top: 0.1rem;
            accent-color: var(--pdf-annot-accent);
          }
          .pdf-annotation-panel--danger .pdf-annotation-panel__header {
            color: var(--pdf-annot-danger);
            opacity: 0.9;
          }
          .pdf-annotation-panel__actions {
            display: flex;
            gap: 0.35rem;
            margin-top: 0.15rem;
          }
          .pdf-annotation-panel__actions .pdf-annotation-btn {
            flex: 1;
            justify-content: center;
            display: inline-flex;
            align-items: center;
          }

          /* Active tool mode cursors / page feedback */
          #mainContainer[data-pdf-annot-mode="note"] .page,
          #mainContainer[data-pdf-annot-mode="text"] .page,
          #mainContainer[data-pdf-annot-mode="embed"] .page,
          #mainContainer[data-pdf-annot-mode="freeform"] .page {
            cursor: crosshair;
          }
          #mainContainer[data-pdf-annot-mode="highlight"] .textLayer,
          #mainContainer[data-pdf-annot-mode="underline"] .textLayer,
          #mainContainer[data-pdf-annot-mode="strikethrough"] .textLayer {
            cursor: text;
          }
          #mainContainer[data-pdf-annot-mode="delete"] .page {
            cursor: pointer;
          }
          #mainContainer[data-pdf-annot-mode="delete"] .pdf-annotation--deletable {
            transition: box-shadow 0.12s ease, outline-color 0.12s ease;
          }
          #mainContainer[data-pdf-annot-mode="delete"] .pdf-annotation--deletable:hover {
            outline: 2px solid #c62828;
            outline-offset: 2px;
            box-shadow: 0 0 0 4px rgba(198, 40, 40, 0.16);
            cursor: pointer;
          }
          #mainContainer[data-pdf-annot-mode="freeform"] .pdf-annotation__freeform-canvas {
            cursor: crosshair;
          }

          /* Selection + hover feedback */
          .pdf-annotation--selected {
            outline: 2px solid #3d6df0;
            outline-offset: 2px;
            z-index: 7 !important;
          }
          .pdf-annotation__rect:hover,
          .pdf-annotation__note:hover,
          .pdf-annotation__freeform:hover,
          .pdf-annotation__embed:hover,
          .pdf-annotation__text:hover {
            filter: brightness(0.97);
          }
          .pdf-annotation__bound {
            pointer-events: none;
          }

          @media (prefers-color-scheme: dark) {
            .pdf-toolbar {
              --pdf-annot-accent: #7ea2ff;
              --pdf-annot-shadow: 0 2px 10px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08);
              --pdf-annot-shadow-lg: 0 10px 28px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1);
            }
            .pdf-toolbar-btn:hover {
              background-color: rgba(255, 255, 255, 0.1);
            }
            .pdf-toolbar-btn.selected {
              background-color: rgba(126, 162, 255, 0.22);
              box-shadow: inset 0 0 0 1.5px rgba(126, 162, 255, 0.7);
            }
            .pdf-toolbar-btn.selected:hover {
              background-color: rgba(126, 162, 255, 0.3);
            }
            .pdf-toolbar-btn img {
              filter: none;
            }
            .pdf-annotation-segments > span {
              background-color: rgba(255, 255, 255, 0.06);
            }
            .pdf-annotation-segments > span:hover {
              background-color: rgba(255, 255, 255, 0.1);
            }
            .pdf-annotation-btn {
              background-color: rgba(255, 255, 255, 0.08);
            }
            .pdf-annotation-btn:hover {
              background-color: rgba(255, 255, 255, 0.14);
            }
            .pdf-annotation-chip {
              background-color: rgba(126, 162, 255, 0.14);
            }
            .pdf-annotation--selected {
              outline-color: #7ea2ff;
            }
          }
        </style>`));
  }
}
