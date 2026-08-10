import { htmlToElements } from './pdf-utils';
import { PdfRegistry } from './pdf-registry';

type TourStep = {
  id: string;
  title: string;
  body: string;
  /** CSS selectors inside the PDF iframe; spotlight covers their combined bounds. */
  selectors: string[];
  /** Center the card; use a full-page dim instead of a cutout (overview steps). */
  overview?: boolean;
};

const STORAGE_KEY = 'pdf-annotation-ui-tour-v2';

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the PDF reader',
    body: 'This short tour covers the full interface: the top viewer bar for reading, and the floating annotation toolbar for marking up the document.',
    selectors: [],
    overview: true,
  },
  {
    id: 'viewer-nav',
    title: 'Pages & find',
    body: 'Jump pages with Previous / Next or the page number. Use Find to search the document text.',
    selectors: ['#toolbarViewerLeft'],
  },
  {
    id: 'viewer-zoom',
    title: 'Zoom',
    body: 'Zoom in or out, or pick a preset (fit page, fit width, percent). The page scales while your annotations stay aligned.',
    selectors: ['#toolbarViewerMiddle'],
  },
  {
    id: 'viewer-tools',
    title: 'More viewer tools',
    body: 'Open the tools menu for rotation, presentation mode, and other PDF.js options.',
    selectors: ['#secondaryToolbarToggle'],
  },
  {
    id: 'viewer-page',
    title: 'The document',
    body: 'Scroll the page to read. Select text to mark it, or use the annotation toolbar to place notes, drawings, and embeds.',
    selectors: [],
    overview: true,
  },
  {
    id: 'toolbar',
    title: 'Annotation toolbar',
    body: 'This floating bar is how you annotate. Click a tool to enter its mode (options appear beside it), click again to leave.',
    selectors: ['.pdf-toolbar__main'],
  },
  {
    id: 'outline',
    title: 'Document outline',
    body: 'Browse and search sections, then jump to them. The active section stays highlighted as you scroll.',
    selectors: ['.pdf-toolbar__outline-btn'],
  },
  {
    id: 'select-mark',
    title: 'Select, then mark',
    body: 'When no mark tool is active, select text on the page — a compact Highlight / Underline / Strike bar appears so you can mark without entering a tool mode first.',
    selectors: [],
    overview: true,
  },
  {
    id: 'highlight',
    title: 'Highlight',
    body: 'Enter Highlight mode and drag over text, or use the select-to-mark bar. Click an existing highlight to add a note or change its color.',
    selectors: ['.pdf-toolbar__highlight-btn'],
  },
  {
    id: 'underline',
    title: 'Underline',
    body: 'Underline important phrases. Same workflow as highlight: tool mode, or select text then choose Underline.',
    selectors: ['.pdf-toolbar__underline-btn'],
  },
  {
    id: 'strike',
    title: 'Strikethrough',
    body: 'Strike through text you want to call out as removed or contested. Notes and colors work the same way.',
    selectors: ['.pdf-toolbar__strikethrough-btn'],
  },
  {
    id: 'note',
    title: 'Sticky notes',
    body: 'Click the page to drop a sticky note, then type. Hover a note to peek; click to edit. Author name shows on hover and in the popup.',
    selectors: ['.pdf-toolbar__note-btn'],
  },
  {
    id: 'text',
    title: 'Text boxes',
    body: 'Place free text on the page — useful for captions or short comments that stay visible without opening a note.',
    selectors: ['.pdf-toolbar__text-btn'],
  },
  {
    id: 'draw',
    title: 'Pen / Draw',
    body: 'Sketch freehand on the page. Pick a color and stroke width, draw, then tap Done to save.',
    selectors: ['.pdf-toolbar__freeform-btn'],
  },
  {
    id: 'embed',
    title: 'Embed',
    body: 'Attach a link or iframe (video, app, page). Choose how it opens: inline on the page, in a popup, or in a new tab.',
    selectors: ['.pdf-toolbar__embed-btn'],
  },
  {
    id: 'delete',
    title: 'Delete annotations',
    body: 'Enter delete mode and click an annotation to remove it. You can also select one and press Delete or Backspace.',
    selectors: ['.pdf-toolbar__delete-btn'],
  },
  {
    id: 'prefs',
    title: 'Preferences',
    body: 'Set your display name and privacy for new annotations, and choose whose marks you see (only you, everyone, nobody, or specific people). Replay this tour from Help anytime.',
    selectors: ['.pdf-toolbar__config-btn'],
  },
  {
    id: 'finish',
    title: 'You\'re ready',
    body: 'That’s the full interface. Hover any annotation to see who wrote it. Open Preferences whenever you want to change visibility or replay this tour.',
    selectors: [],
    overview: true,
  },
];

export class PdfTour {

  private registry: PdfRegistry;
  private root: HTMLElement | null = null;
  private steps: TourStep[] = [];
  private index = 0;
  private onResize: (() => void) | null = null;
  private onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private _launched = false;

  constructor({ registry }) {
    this.registry = registry;
    this.registry.register('tour', this);

    if (this._hasCompleted()) return;

    const start = () => {
      if (this._launched || this._hasCompleted()) return;
      this._launched = true;
      setTimeout(() => this.start(), 500);
    };

    const bus = this.registry.getPdfJS()?.eventBus;
    if (bus?.on) {
      bus.on('pagesloaded', start);
      // Fallback if the document was already opened before this listener attached.
      setTimeout(start, 2000);
    } else {
      setTimeout(start, 1200);
    }
  }

  /** Public so prefs / debug can re-run later if desired. */
  start(force = false) {
    if (!force && this._hasCompleted()) return;
    if (this.root) this._teardown();

    this.steps = TOUR_STEPS.filter(step =>
      step.overview
      || !step.selectors.length
      || step.selectors.some(sel => !!this._doc().querySelector(sel)));
    if (!this.steps.length) return;

    this.index = 0;
    this._mount();
    this._renderStep();
  }

  skip() { this._finish(); }
  finish() { this._finish(); }

  private _doc(): Document { return this.registry.getDocument(); }
  private _docEl(): HTMLElement { return this.registry.getDocumentEl(); }

  private _hasCompleted() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch { return false; }
  }

  private _markCompleted() {
    try { localStorage.setItem(STORAGE_KEY, '1'); }
    catch { /* ignore private mode */ }
  }

  private _finish() {
    this._markCompleted();
    this._teardown();
  }

  private _mount() {
    this._attachStyles();
    this.root = htmlToElements(
      `<div class="pdf-annot-tour" role="dialog" aria-modal="true" aria-labelledby="pdf-annot-tour-title">
        <div class="pdf-annot-tour__backdrop"></div>
        <div class="pdf-annot-tour__spotlight" aria-hidden="true"></div>
        <div class="pdf-annot-tour__card">
          <div class="pdf-annot-tour__eyebrow">Interface tour</div>
          <div class="pdf-annot-tour__title" id="pdf-annot-tour-title"></div>
          <div class="pdf-annot-tour__body"></div>
          <div class="pdf-annot-tour__progress" aria-hidden="true"></div>
          <div class="pdf-annot-tour__actions">
            <button type="button" class="pdf-annot-tour__btn pdf-annot-tour__btn--ghost" data-action="skip">Skip</button>
            <div class="pdf-annot-tour__nav">
              <button type="button" class="pdf-annot-tour__btn pdf-annot-tour__btn--secondary" data-action="back" title="Back (←)">Back</button>
              <button type="button" class="pdf-annot-tour__btn pdf-annot-tour__btn--primary" data-action="next" title="Next (→)">Next</button>
            </div>
          </div>
        </div>
      </div>`);

    this._docEl().querySelector('body')?.appendChild(this.root);

    this.root.addEventListener('click', ($event: any) => {
      const action = $event.target?.closest?.('[data-action]')?.getAttribute('data-action');
      if (action === 'skip') this.skip();
      else if (action === 'back') this._prev();
      else if (action === 'next') this._next();
    });

    this.onKeyDown = ($event: KeyboardEvent) => {
      if (!this.root) return;
      const key = $event.key;
      if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'Enter') {
        $event.preventDefault();
        $event.stopPropagation();
        this._next();
      } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
        $event.preventDefault();
        $event.stopPropagation();
        this._prev();
      } else if (key === 'Escape') {
        $event.preventDefault();
        $event.stopPropagation();
        this.skip();
      }
    };
    this._doc().addEventListener('keydown', this.onKeyDown, true);

    this.onResize = () => this._position();
    this._doc().defaultView?.addEventListener('resize', this.onResize);
    this._doc().defaultView?.addEventListener('scroll', this.onResize, true);
  }

  private _teardown() {
    if (this.onResize) {
      this._doc().defaultView?.removeEventListener('resize', this.onResize);
      this._doc().defaultView?.removeEventListener('scroll', this.onResize, true);
      this.onResize = null;
    }
    if (this.onKeyDown) {
      this._doc().removeEventListener('keydown', this.onKeyDown, true);
      this.onKeyDown = null;
    }
    this.root?.remove();
    this.root = null;
    this._doc().querySelectorAll('.pdf-annot-tour-target')
      .forEach(el => el.classList.remove('pdf-annot-tour-target'));
  }

  private _next() {
    if (this.index >= this.steps.length - 1) {
      this.finish();
      return;
    }
    this.index += 1;
    this._renderStep();
  }

  private _prev() {
    if (this.index <= 0) return;
    this.index -= 1;
    this._renderStep();
  }

  private _renderStep() {
    if (!this.root) return;
    const step = this.steps[this.index];
    const isLast = this.index === this.steps.length - 1;

    (this.root.querySelector('.pdf-annot-tour__title') as HTMLElement).textContent = step.title;
    (this.root.querySelector('.pdf-annot-tour__body') as HTMLElement).textContent = step.body;

    const progress = this.root.querySelector('.pdf-annot-tour__progress') as HTMLElement;
    progress.innerHTML = this.steps.map((_, i) =>
      `<span class="pdf-annot-tour__dot ${i === this.index ? 'is-active' : i < this.index ? 'is-done' : ''}"></span>`
    ).join('');

    const backBtn = this.root.querySelector('[data-action="back"]') as HTMLButtonElement;
    const nextBtn = this.root.querySelector('[data-action="next"]') as HTMLButtonElement;
    backBtn.disabled = this.index === 0;
    nextBtn.textContent = isLast ? 'Got it' : 'Next';

    this._doc().querySelectorAll('.pdf-annot-tour-target')
      .forEach(el => el.classList.remove('pdf-annot-tour-target'));
    step.selectors.forEach(sel => {
      this._doc().querySelectorAll(sel).forEach(el => el.classList.add('pdf-annot-tour-target'));
    });

    this._position();
  }

  private _position() {
    if (!this.root) return;
    const step = this.steps[this.index];
    const spotlight = this.root.querySelector('.pdf-annot-tour__spotlight') as HTMLElement;
    const backdrop = this.root.querySelector('.pdf-annot-tour__backdrop') as HTMLElement;
    const card = this.root.querySelector('.pdf-annot-tour__card') as HTMLElement;

    const els = step.selectors
      .flatMap(sel => Array.from(this._doc().querySelectorAll(sel)))
      .filter((el: Element) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }) as HTMLElement[];

    const view = this._doc().defaultView!;
    const cardW = Math.min(320, view.innerWidth - 24);
    const cardH = card.offsetHeight || 180;

    // Overview steps: full dim, centered card — never a giant cutout.
    if (step.overview || !els.length) {
      spotlight.style.display = 'none';
      backdrop.classList.add('is-dimmed');
      card.style.top = `${Math.max(16, Math.min(view.innerHeight * 0.28, view.innerHeight - cardH - 16))}px`;
      card.style.left = '50%';
      card.style.transform = 'translateX(-50%)';
      card.style.width = `${cardW}px`;
      return;
    }

    backdrop.classList.remove('is-dimmed');
    const bounds = this._unionBounds(els);
    // If targets are too far apart / huge, fall back to overview styling.
    if (
      bounds.width > view.innerWidth * 0.7
      || bounds.height > view.innerHeight * 0.45
      || this._targetsAreScattered(els)
    ) {
      // Keep spotlight on the first target only so something is clearly pointed at.
      this._placeSpotlight(spotlight, [els[0]]);
    } else {
      this._placeSpotlight(spotlight, els);
    }

    const pad = 8;
    const { top, left, right, bottom } = this._unionBounds(
      this._targetsAreScattered(els) || bounds.width > view.innerWidth * 0.7
        ? [els[0]]
        : els
    );

    let cardLeft = right + 14;
    let cardTop = top;

    if (cardLeft + cardW > view.innerWidth - 12) {
      cardLeft = Math.max(12, left - cardW - 14);
    }
    if (cardLeft < 12) cardLeft = 12;
    if (cardTop + cardH > view.innerHeight - 12) {
      cardTop = Math.max(12, view.innerHeight - cardH - 12);
    }
    if (cardTop < 12) cardTop = 12;

    // Prefer placing below wide top-bar targets.
    if (right - left > view.innerWidth * 0.35 && top < 96) {
      cardLeft = Math.max(12, Math.min(left, view.innerWidth - cardW - 12));
      cardTop = Math.min(view.innerHeight - cardH - 12, bottom + 14);
    }

    card.style.transform = 'none';
    card.style.left = `${cardLeft}px`;
    card.style.top = `${cardTop}px`;
    card.style.width = `${cardW}px`;
  }

  private _unionBounds(els: HTMLElement[]) {
    let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity;
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      top = Math.min(top, r.top);
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    });
    return { top, left, right, bottom, width: right - left, height: bottom - top };
  }

  private _targetsAreScattered(els: HTMLElement[]) {
    if (els.length < 2) return false;
    const b = this._unionBounds(els);
    let area = 0;
    els.forEach(el => {
      const r = el.getBoundingClientRect();
      area += r.width * r.height;
    });
    // Combined box much larger than the sum of parts → targets are far apart.
    return b.width * b.height > area * 4;
  }

  private _placeSpotlight(spotlight: HTMLElement, els: HTMLElement[], pad = 8) {
    const { top, left, right, bottom } = this._unionBounds(els);
    spotlight.style.display = 'block';
    spotlight.style.top = `${top - pad}px`;
    spotlight.style.left = `${left - pad}px`;
    spotlight.style.width = `${right - left + pad * 2}px`;
    spotlight.style.height = `${bottom - top + pad * 2}px`;
  }

  private _attachStyles() {
    if (this._doc().getElementById('pdf-annot-tour-styles')) return;
    this._doc().head.appendChild(htmlToElements(
      `<style id="pdf-annot-tour-styles">
        .pdf-annot-tour {
          position: fixed;
          inset: 0;
          z-index: 100000;
          pointer-events: none;
          font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
          letter-spacing: -0.011em;
        }
        .pdf-annot-tour__backdrop {
          position: absolute;
          inset: 0;
          background: transparent;
          pointer-events: auto;
          transition: background 0.2s ease;
        }
        .pdf-annot-tour__backdrop.is-dimmed {
          background: rgba(15, 23, 42, 0.5);
        }
        .pdf-annot-tour__spotlight {
          position: absolute;
          border-radius: 0.65rem;
          box-shadow:
            0 0 0 9999px rgba(15, 23, 42, 0.45),
            0 0 0 3px #3d6df0,
            0 8px 24px rgba(61, 109, 240, 0.35);
          background: transparent;
          pointer-events: none;
          transition: top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease;
        }
        .pdf-annot-tour-target {
          position: relative;
          z-index: 100001 !important;
        }
        .pdf-annot-tour__card {
          position: absolute;
          z-index: 100002;
          pointer-events: auto;
          background: #f8f9fb;
          color: #111827;
          border-radius: 0.85rem;
          padding: 0.85rem 0.95rem 0.8rem;
          box-shadow:
            0 18px 40px rgba(16, 24, 40, 0.22),
            0 0 0 1px rgba(16, 24, 40, 0.08);
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          max-width: 20rem;
        }
        .pdf-annot-tour__eyebrow {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #3d6df0;
        }
        .pdf-annot-tour__title {
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.25;
        }
        .pdf-annot-tour__body {
          font-size: 0.8rem;
          line-height: 1.45;
          color: #4b5563;
        }
        .pdf-annot-tour__progress {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          padding: 0.15rem 0 0.1rem;
        }
        .pdf-annot-tour__dot {
          width: 0.4rem;
          height: 0.4rem;
          border-radius: 999px;
          background: rgba(16, 24, 40, 0.15);
        }
        .pdf-annot-tour__dot.is-done { background: rgba(61, 109, 240, 0.45); }
        .pdf-annot-tour__dot.is-active {
          background: #3d6df0;
          width: 1rem;
        }
        .pdf-annot-tour__actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding-top: 0.25rem;
        }
        .pdf-annot-tour__nav {
          display: flex;
          gap: 0.35rem;
        }
        .pdf-annot-tour__btn {
          appearance: none;
          border: 1px solid transparent;
          border-radius: 0.45rem;
          font: inherit;
          font-size: 0.75rem;
          font-weight: 650;
          padding: 0.4rem 0.7rem;
          cursor: pointer;
          line-height: 1.2;
        }
        .pdf-annot-tour__btn:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .pdf-annot-tour__btn--ghost {
          background: transparent;
          color: #6b7280;
          padding-left: 0.2rem;
        }
        .pdf-annot-tour__btn--ghost:hover:not(:disabled) { color: #111827; }
        .pdf-annot-tour__btn--secondary {
          background: #ffffff;
          border-color: rgba(16, 24, 40, 0.12);
          color: #374151;
        }
        .pdf-annot-tour__btn--secondary:hover:not(:disabled) {
          background: #f3f4f6;
        }
        .pdf-annot-tour__btn--primary {
          background: #3d6df0;
          color: #ffffff;
        }
        .pdf-annot-tour__btn--primary:hover:not(:disabled) {
          background: #3158d0;
        }
        @media (prefers-color-scheme: dark) {
          .pdf-annot-tour__card {
            background: #1f2430;
            color: #f3f4f6;
          }
          .pdf-annot-tour__body { color: #9ca3af; }
          .pdf-annot-tour__btn--secondary {
            background: #2a3140;
            border-color: rgba(255, 255, 255, 0.12);
            color: #e5e7eb;
          }
          .pdf-annot-tour__btn--ghost { color: #9ca3af; }
          .pdf-annot-tour__dot { background: rgba(255, 255, 255, 0.15); }
        }
      </style>`));
  }
}
