import {
  getPageEl, getPageNum, getSelectionRects,
  htmlToElements, isLeftClick, removeSelectorAll, getValue
} from './pdf-utils';
import { PdfRegistry } from './pdf-registry';
import { PdfHighlighter } from './pdf-highlighter';

type PendingSelection = {
  text: string;
  rects: any;
  pageNum: number;
  anchor: { top: number; left: number };
};

/**
 * Floating bar that appears after selecting PDF text (when mark tools are idle),
 * so users can apply highlight / underline / strikethrough without entering a tool mode first.
 */
export class PdfSelectionMarkupToolbar {

  private registry: PdfRegistry;
  private pending: PendingSelection | null = null;

  constructor({ registry }) {
    this.registry = registry;
    this.registry.register('selection-markup', this);
    this._attachStylesheet();
    this._listen();
  }

  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getHighlighter(): PdfHighlighter { return this.registry.get('highlighter'); }

  private _listen() {
    this._getDocument().addEventListener('mouseup', ($event: any) => {
      if (!isLeftClick($event)) return;
      if ($event.target.closest?.('.pdf-selection-markup')) return;
      if ($event.target.closest?.('.pdf-toolbar')) return;

      // Tool-first drag path owns creation while a mark mode is active.
      if (this._getHighlighter()?.enabled) {
        this.hide();
        return;
      }

      // Let the selection settle after mouseup.
      setTimeout(() => this._maybeShow($event), 10);
    });

    this._getDocument().addEventListener('mousedown', ($event: any) => {
      if ($event.target.closest?.('.pdf-selection-markup')) return;
      // Starting a new interaction clears the bar (selection may change).
      if (this.pending) this.hide();
    }, true);

    this._getDocument().addEventListener('keydown', ($event: any) => {
      if ($event.key === 'Escape') this.hide();
    });
  }

  private _maybeShow($event: any) {
    const selection = this._getDocument().getSelection();
    const text = (selection?.toString() || '').trim();
    if (!text || !selection || selection.isCollapsed) {
      this.hide();
      return;
    }

    const rects = getSelectionRects(this._getDocument(), this._getPdfJS());
    if (!rects || !Object.keys(rects).length) {
      this.hide();
      return;
    }

    const pageNum = parseInt(Object.keys(rects)[0], 10);
    const pageRects = rects[pageNum];
    const first = pageRects?.[0];
    if (!first) {
      this.hide();
      return;
    }

    // Prefer the end of the selection for anchoring (near caret).
    const range = selection.rangeCount ? selection.getRangeAt(0) : null;
    const clientRects = range?.getClientRects?.();
    const lastClient = clientRects?.length
      ? clientRects[clientRects.length - 1]
      : null;

    const pageEl = getPageEl(this._getDocument(), pageNum)
      || getPageEl($event.target);
    if (!pageEl) {
      this.hide();
      return;
    }

    let topPct = first.top;
    let leftPct = Math.min(100 - first.right, first.left + 2);
    if (lastClient) {
      const pageBox = pageEl.getBoundingClientRect();
      topPct = ((lastClient.bottom - pageBox.top) / pageBox.height) * 100;
      leftPct = ((lastClient.left - pageBox.left) / pageBox.width) * 100;
    }

    this.pending = {
      text,
      rects,
      pageNum: getPageNum(pageEl) || pageNum,
      anchor: { top: topPct, left: Math.max(2, Math.min(leftPct, 72)) },
    };
    this._renderBar();
  }

  hide() {
    this.pending = null;
    removeSelectorAll(this._getDocumentEl(), '.pdf-selection-markup');
  }

  private _defaultColor(type: string) {
    const configs = this.registry.get(`configs.${type}`);
    const colors = configs?.colors;
    if (colors?.length) return getValue(colors[0]);
    return type === 'highlight' ? '#ffd40075' : '#ffd400';
  }

  private _defaultStroke(type: string) {
    const configs = this.registry.get(`configs.${type}`);
    if (type === 'highlight') return { stroke: '0.125rem', strokeStyle: 'solid' };
    const value = configs?.stroke?.value ?? 1;
    return {
      stroke: `${value}`,
      strokeStyle: configs?.strokeStyle?.[0] || 'solid',
    };
  }

  private _apply(type: string) {
    if (!this.pending) return;
    const { text, rects } = this.pending;
    const { stroke, strokeStyle } = this._defaultStroke(type);
    const ok = this._getHighlighter().createMark({
      type,
      color: this._defaultColor(type),
      stroke,
      strokeStyle,
      text,
      rects,
      clearSelection: true,
    });
    this.hide();
    if (!ok) return;
  }

  private _renderBar() {
    removeSelectorAll(this._getDocumentEl(), '.pdf-selection-markup');
    if (!this.pending) return;

    const { pageNum, anchor } = this.pending;
    const layer = this.registry.get('annotation-layer')?.getOrAttachLayerEl?.(pageNum);
    if (!layer) return;

    const bar = htmlToElements(
      `<div class="pdf-selection-markup" style="top: calc(${anchor.top}% + 0.35rem); left: ${anchor.left}%;" role="toolbar" aria-label="Mark selection">
        <div class="pdf-selection-markup__segments">
          <button type="button" class="pdf-selection-markup__segment" data-mark="highlight" title="Highlight">
            <span class="pdf-selection-markup__swatch pdf-selection-markup__swatch--highlight" aria-hidden="true"></span>
            <span class="pdf-selection-markup__text">Highlight</span>
          </button>
          <button type="button" class="pdf-selection-markup__segment" data-mark="underline" title="Underline">
            <span class="pdf-selection-markup__swatch pdf-selection-markup__swatch--underline" aria-hidden="true"></span>
            <span class="pdf-selection-markup__text">Underline</span>
          </button>
          <button type="button" class="pdf-selection-markup__segment" data-mark="strikethrough" title="Strikethrough">
            <span class="pdf-selection-markup__swatch pdf-selection-markup__swatch--strike" aria-hidden="true"></span>
            <span class="pdf-selection-markup__text">Strike</span>
          </button>
        </div>
      </div>`);

    bar.addEventListener('mousedown', ($event: any) => {
      // Keep selection snapshot; don't let this clear pending via document mousedown.
      $event.preventDefault();
      $event.stopPropagation();
    });

    bar.addEventListener('click', ($event: any) => {
      const btn = $event.target.closest('[data-mark]');
      if (!btn) return;
      $event.preventDefault();
      $event.stopPropagation();
      this._apply(btn.getAttribute('data-mark'));
    });

    layer.appendChild(bar);
  }

  private _attachStylesheet() {
    this._getDocumentEl().querySelector('head')?.appendChild(htmlToElements(
      `<style>
        .pdf-selection-markup {
          position: absolute;
          z-index: 12;
          pointer-events: auto;
          padding: 0.2rem;
          border-radius: 0.55rem;
          background: #f3f4f7;
          color: #111827;
          box-shadow:
            0 10px 24px rgba(16, 24, 40, 0.16),
            0 0 0 1px rgba(16, 24, 40, 0.08);
          font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
          letter-spacing: -0.011em;
        }
        .pdf-selection-markup__segments {
          display: flex;
          align-items: stretch;
          gap: 0.15rem;
        }
        .pdf-selection-markup__segment {
          appearance: none;
          border: none;
          background: transparent;
          color: #4b5563;
          font: inherit;
          font-size: 0.72rem;
          font-weight: 650;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.4rem 0.55rem;
          border-radius: 0.4rem;
          cursor: pointer;
          line-height: 1.15;
          white-space: nowrap;
          transition: background 0.12s ease, color 0.12s ease, box-shadow 0.12s ease;
        }
        .pdf-selection-markup__segment:hover {
          color: #111827;
          background: rgba(255, 255, 255, 0.7);
        }
        .pdf-selection-markup__segment:focus-visible {
          outline: 2px solid #3d6df0;
          outline-offset: 1px;
        }
        .pdf-selection-markup__text {
          pointer-events: none;
        }
        .pdf-selection-markup__swatch {
          width: 0.8rem;
          height: 0.8rem;
          border-radius: 0.18rem;
          flex-shrink: 0;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
          pointer-events: none;
        }
        .pdf-selection-markup__swatch--highlight {
          background: #ffd400;
        }
        .pdf-selection-markup__swatch--underline {
          background: linear-gradient(to bottom, transparent 70%, #2ba8e8 70%);
          box-shadow: inset 0 0 0 1px rgba(43, 168, 232, 0.35);
        }
        .pdf-selection-markup__swatch--strike {
          background: linear-gradient(to bottom, transparent 45%, #ff6563 45%, #ff6563 58%, transparent 58%);
          box-shadow: inset 0 0 0 1px rgba(255, 101, 99, 0.35);
        }
        @media (prefers-color-scheme: dark) {
          .pdf-selection-markup {
            background: #2a3140;
            color: #f3f4f6;
            box-shadow:
              0 10px 24px rgba(0, 0, 0, 0.45),
              0 0 0 1px rgba(255, 255, 255, 0.08);
          }
          .pdf-selection-markup__segment {
            color: #c5cad3;
          }
          .pdf-selection-markup__segment:hover {
            color: #f3f4f6;
            background: rgba(255, 255, 255, 0.1);
          }
        }
      </style>`));
  }
}
