import {
  WHRect, getAnnotEl, getAnnotElBound,
  getOrParent, getPageEl, getPageNum,
  htmlToElements, isLeftClick,
  relativeToPageEl, removeSelectorAll, uuid, annotIsMine
} from './pdf-utils';
import { PdfStorage } from './pdf-storage';
import { PdfRegistry } from './pdf-registry';
import { PdfEmbedViewer } from './pdf-embed-viewer';

export class PdfEmbedEditor {

  protected registry: PdfRegistry;

  enabled: boolean = false;
  onPointDrop: any;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('embed-editor', this);
    this.registry.register(`embed-move-elements`,
      ($event, action, payload) => this._handleMoveEvents($event, action, payload));

    this.registry.register(`storage.deleted.${Math.random()}`, (annot) => {
      if (annot.type == 'embed') {
        removeSelectorAll(this._getDocumentEl(),
          `.pdf-annotation__embed-editor-popup[data-embed-id="${annot.id}"]`);
      }
    });

    this.onAnnotClick();
    this._manageDroppingZone();
    this._attachStylesheet();
  }

  protected _configs() { return this.registry.get(`configs.embed`); }

  protected _getStorage(): PdfStorage { return this.registry.get('storage'); }
  protected _getDocument() { return this.registry.getDocument(); }
  protected _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getViewer(): PdfEmbedViewer { return this.registry.get('embed-viewer'); }

  setEnabled(enable: boolean) {
    this.enabled = enable;
    if (!this.enabled)
      this._removeDropzones();
  }

  private _handleMoveEvents($event, action: string, payload: any) {
    if (action == 'moving-completed') {
      const { top, left, right, bottom } = payload.rect;
      const annot = this._getStorage().read(payload.id);
      if (!annot || !this._getStorage().isMine(annot)) return;
      annot.rects = { [annot.pages[0]]: [{ top, left, right, bottom }] };
      this._getStorage().update(annot);
      const annotEl = this._getDocumentEl().querySelector(`[data-annotation-id="${annot.id}"]`);
      this._getViewer().fitIframeToParent(annotEl);
    } else if (action == 'moving-started') {
      this._getDocumentEl().querySelector('.pdfViewer')?.
        querySelectorAll('.pdf-annotation__embed-viewer-popup').forEach(el => el.remove());
    }
  }

  protected pointDropped(pageEl, $event) {
    this.onPointDrop?.();
    const { left, top } = relativeToPageEl({ left: $event.clientX, top: $event.clientY } as any, pageEl);
    const page = getPageNum(pageEl);
    const pageRect = pageEl.getBoundingClientRect();
    // Default chip size (~136×40 CSS px) so the placeholder reads clearly on first place.
    const widthPct = Math.min(36, (136 / pageRect.width) * 100);
    const heightPct = Math.min(12, (40 / pageRect.height) * 100);
    const annot = {
      id: uuid(),
      type: 'embed',
      rects: {
        [page]: [{
          left,
          top,
          right: Math.max(0, 100 - left - widthPct),
          bottom: Math.max(0, 100 - top - heightPct),
        }]
      },
      pages: [page],
      resource: this._configs()?.resource,
      thumbnail: this._configs()?.thumbnail,
      target: 'popup-iframe',
    };
    this._getStorage().create(annot, () => {
      this._getViewer().render(annot);
      const annotEl = this._getDocumentEl().querySelector(`[data-annotation-id="${annot.id}"]`);
      if (annotEl) {
        const bound = getAnnotElBound(annotEl);
        this._showEditorPopup(annot, page, bound);
      }
    });
  }

  private _manageDroppingZone() {
    this._getDocument().addEventListener("mousemove", ($event: any) => {
      if (this.enabled)
        getPageEl($event.target)?.classList.add(`pdf-embed-editor__dropping-zone`);
    });

    this._getDocument().addEventListener("click", ($event: any) => {
      const pageEl = getPageEl($event.target);
      if (this.enabled && pageEl) {
        this.setEnabled(false);
        this.pointDropped(pageEl, $event);
      }
    });
  }

  private _removeDropzones() {
    [...this._getDocument().querySelectorAll(`.pdf-embed-editor__dropping-zone`)].forEach(el => {
      el.classList.remove(`pdf-embed-editor__dropping-zone`);
    });
  }

  protected onAnnotClick() {
    this._getDocument().addEventListener('click', async ($event: any) => {
      const editBtnEl = getOrParent($event, '.pdf-annotation__embed-edit-btn');
      if (isLeftClick($event) && editBtnEl) {
        const annotEl = getAnnotEl($event.target),
        /* */  pageEl = getPageEl($event.target);
        this.removePopups();

        const annotId: any = annotEl.getAttribute('data-annotation-id');
        const annot = this._getStorage().read(annotId);
        if (!annot || !annotIsMine(annot)) return;
        if (!pageEl.querySelector(`.pdf-annotation__embed-editor-popup[data-embed-id="${annotId}"]`)) {
          const bound = getAnnotElBound(pageEl.querySelector(`[data-annotation-id="${annotId}"]`));
          this._showEditorPopup(annot, getPageNum(pageEl), bound);
        }
      } else if (!getOrParent($event, '.pdf-annotation__embed-editor-popup')) {
        this.removePopups(true);
      }
    });
  }

  removePopups(editorOnly?: boolean) {
    if (!editorOnly)
      this._getViewer().removePopups();
    this._getDocumentEl()
      .querySelectorAll('.pdf-annotation__embed-editor-popup')
      .forEach(el => el.remove());
  }

  /** Place the editor on the side of the annot that faces page center. */
  private _placementStyle(bound: WHRect) {
    const annotLeft = bound.left;
    const annotRight = 100 - bound.right;
    const annotMidX = (annotLeft + annotRight) / 2;
    const annotMidY = (bound.top + (100 - bound.bottom)) / 2;
    const placeRight = annotMidX <= 50;
    const placeAbove = annotMidY > 62;

    const top = placeAbove
      ? `auto`
      : `${Math.max(1, bound.top)}%`;
    const bottom = placeAbove
      ? `calc(${bound.bottom}% + 0.5rem)`
      : 'auto';

    if (placeRight) {
      return `
        top: ${top};
        bottom: ${bottom};
        left: calc(${annotRight}% + 0.5rem);
        right: auto;
      `;
    }
    return `
      top: ${top};
      bottom: ${bottom};
      left: auto;
      right: calc(${100 - annotLeft}% + 0.5rem);
    `;
  }

  private _showEditorPopup(annot: any, pageNum: number, bound: WHRect) {
    if (!this._configs())
      return;

    const popupEl = htmlToElements(
      `<form class="pdf-annotation__embed-editor-popup" data-embed-id="${annot.id}" autocomplete="off">
        ${this._getContainerEl(annot)}
        <style>
          .pdf-annotation__embed-editor-popup {
            ${this._placementStyle(bound)}
          }
        </style>
      </form>`);

    popupEl.onsubmit = () => false;

    this.registry.get('annotation-layer')
      .getOrAttachLayerEl(pageNum)
      .appendChild(popupEl);

    this._bindTabs(popupEl);
    this._bindControls(popupEl, annot);
  }

  private _bindTabs(popupEl: HTMLElement) {
    const tabs = popupEl.querySelectorAll('.pdf-annotation__embed-editor-tab');
    const panels = popupEl.querySelectorAll('.pdf-annotation__embed-editor-panel');
    tabs.forEach((tab) => {
      tab.addEventListener('click', ($event: any) => {
        $event.preventDefault();
        $event.stopPropagation();
        const name = tab.getAttribute('data-tab');
        tabs.forEach(t => {
          const active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        panels.forEach(p => p.classList.toggle('is-active', p.getAttribute('data-panel') === name));
      });
    });
  }

  private _bindControls(popupEl: HTMLElement, annot: any) {
    const containerEl = popupEl.querySelector('.pdf-annotation__embed-editor-popup-controls') as HTMLElement;
    const elems = {
      inline: containerEl.querySelector('.pdf-annotation__embed-editor-popup-inline-iframe-row') as any,
      popup: containerEl.querySelector('.pdf-annotation__embed-editor-popup-popup-iframe-row') as any,
      size: containerEl.querySelector('.pdf-annotation__embed-editor-popup-target-size-row') as any,
      ctrls: containerEl.querySelector('.pdf-annotation__embed-editor-popup-ctrls-row') as any,
      onhover: containerEl.querySelector('.pdf-annotation__embed-editor-popup-on-hover-row') as any,
      fullscreen: containerEl.querySelector('.pdf-annotation__embed-editor-popup-fullscreen-row') as any,
      fullpage: containerEl.querySelector('.pdf-annotation__embed-editor-popup-fullpage-row') as any,
      custom: containerEl.querySelector('.pdf-annotation__embed-editor-popup-custom-size-row') as any,
      page: containerEl.querySelector('.pdf-annotation__embed-editor-popup-new-page-row') as any,
      thumbnail: containerEl.querySelector('.pdf-annotation__embed-editor-popup-thumbnail-url-row') as any,
      resource: containerEl.querySelector('.pdf-annotation__embed-editor-popup-resource-url-row') as any,
    };

    elems.page?.querySelector('input[type="radio"]').addEventListener('change',
      ($ev: any) => annot.target = $ev.target.checked ? 'new-page' : annot.target);
    elems.inline?.querySelector('input[type="radio"]').addEventListener('change',
      ($ev: any) => annot.target = $ev.target.checked ? 'inline-iframe' : annot.target);
    elems.popup?.querySelector('input[type="radio"]').addEventListener('change', ($ev: any) => {
      annot.target = $ev.target.checked ? 'popup-iframe' : annot.target;
      if (elems.size) elems.size.style.display = $ev.target.checked ? 'flex' : 'none';
    });

    elems.ctrls?.querySelector('input[type="checkbox"]').addEventListener('change',
      ($ev: any) => annot.ctrls = $ev.target.checked ? ['open-in-blank', 'close'] : null);
    elems.onhover?.querySelector('input[type="checkbox"]').addEventListener('change',
      ($ev: any) => annot.openOn = $ev.target.checked ? 'hover' : 'click');

    const sizeFields = containerEl.querySelector('.pdf-annotation__embed-editor-size-fields') as HTMLElement | null;
    const whinputs = Array.from(sizeFields?.querySelectorAll('input[type="text"]') || []) as HTMLInputElement[];
    whinputs.forEach((input) => input.addEventListener('change',
      () => annot.targetSize = `${whinputs[0].value},${whinputs[1].value}`));

    const setTargetSize = (value: string) => {
      annot.targetSize = value;
      const xx = ['fullscreen', 'fullpage'].indexOf(value) >= 0;
      whinputs.forEach((input: HTMLInputElement) => input.disabled = xx);
      if (sizeFields) sizeFields.style.display = xx ? 'none' : 'flex';
      elems.onhover?.querySelector('input[type="checkbox"]') &&
        (elems.onhover.querySelector('input[type="checkbox"]').disabled = xx);
    };

    elems.fullscreen?.querySelector('input[type="radio"]').addEventListener('change',
      ($ev: any) => { if ($ev.target.checked) setTargetSize('fullscreen'); });
    elems.fullpage?.querySelector('input[type="radio"]').addEventListener('change',
      ($ev: any) => { if ($ev.target.checked) setTargetSize('fullpage'); });
    elems.custom?.querySelector('input[type="radio"]')
      .addEventListener('change', ($ev: any) => {
        const configs = this._configs();
        if ($ev.target.checked && configs?.popup) {
          setTargetSize(configs?.popup?.customSize);
          whinputs.forEach((input: HTMLInputElement, i: number) =>
            input.value = configs?.popup?.customSize?.split(',')[i]);
        }
      });

    elems.thumbnail?.querySelector('input[type="text"]').addEventListener('change',
      ($ev: any) => annot.thumbnail = $ev.target.value);
    elems.resource?.querySelector('input[type="text"]').addEventListener('change',
      ($ev: any) => annot.resource = $ev.target.value);

    containerEl.querySelectorAll('input').forEach((input: HTMLInputElement) => {
      input.addEventListener('change', () => {
        if (elems.size) elems.size.style.display = annot.target == 'popup-iframe' ? 'flex' : 'none';
        if (elems.thumbnail) elems.thumbnail.style.display = annot.target == 'inline-iframe' ? 'none' : 'flex';
        this._getStorage().update(annot, () => this._getViewer().render(annot));
      });
    });
  }

  private _getContainerEl(annot: any) {
    const configs = this._configs();

    const customTargetSize = (
      annot.targetSize &&
      ['fullscreen', 'fullpage'].indexOf(annot.targetSize) < 0
    ) ? annot.targetSize.split(',')
      : configs?.popup?.customSize?.split(',');

    const checked = (val: any) => val ? 'checked' : '';
    const customChecked = checked(['fullscreen', 'fullpage'].indexOf(annot.targetSize || '') < 0);

    const tmpid = Math.random().toString(36).substring(2);

    return `
      <div class="pdf-annotation__embed-editor-popup-controls">
        <div class="pdf-annotation__embed-editor-header">
          <span class="pdf-annotation__embed-editor-title">Embed content</span>
          <div class="pdf-annotation__embed-editor-tabs" role="tablist">
            <button type="button" class="pdf-annotation__embed-editor-tab is-active" data-tab="content" role="tab" aria-selected="true">Content</button>
            <button type="button" class="pdf-annotation__embed-editor-tab" data-tab="display" role="tab" aria-selected="false">Display</button>
          </div>
        </div>

        <div class="pdf-annotation__embed-editor-body">
          <div class="pdf-annotation__embed-editor-panel is-active" data-panel="content" role="tabpanel">
            <div class="pdf-annotation__embed-editor-field-group">
              <label class="pdf-annotation__embed-editor-field-label" for="${tmpid}-resource">Resource URL</label>
              <div class="pdf-annotation__embed-editor-popup-resource-url-row">
                <input id="${tmpid}-resource" type="text" placeholder="https://…"
                  value="${annot.resource || configs?.resource || ''}"
                  class="pdf-annotation__embed-editor-popup-resource-url pdf-annotation__embed-editor-input"/>
              </div>
            </div>

            <div class="pdf-annotation__embed-editor-field-group pdf-annotation__embed-editor-popup-thumbnail-url-row"
              style="${annot.target == 'inline-iframe' ? 'display: none;' : ''}">
              <label class="pdf-annotation__embed-editor-field-label" for="${tmpid}-thumb">
                Thumbnail URL <span class="pdf-annotation__embed-editor-optional">optional</span>
              </label>
              <input id="${tmpid}-thumb" type="text" placeholder="https://… or leave empty for default"
                value="${annot.thumbnail || configs?.thumbnail || ''}"
                class="pdf-annotation__embed-editor-popup-thumbnail-url pdf-annotation__embed-editor-input"/>
            </div>
          </div>

          <div class="pdf-annotation__embed-editor-panel" data-panel="display" role="tabpanel">
            <div class="pdf-annotation__embed-editor-field-group">
              <span class="pdf-annotation__embed-editor-field-label">Open as</span>
              <div class="pdf-annotation__embed-editor-segments pdf-annotation__embed-editor-targets" role="radiogroup" aria-label="Open as">
                ${configs?.inline ?
        `<label class="pdf-annotation__embed-editor-segment pdf-annotation__embed-editor-popup-inline-iframe-row" title="Embed on the page">
                  <input id="${tmpid}-inline-iframe" type="radio" value="void" name="pdf-embed-resource-target"
                    ${checked(annot.target == 'inline-iframe')}
                    class="pdf-annotation__embed-editor-popup-inline-iframe-option"/>
                  <span>Inline</span>
                </label>` : ''}
                ${configs?.popup ?
        `<label class="pdf-annotation__embed-editor-segment pdf-annotation__embed-editor-popup-popup-iframe-row" title="Open in a floating window">
                  <input id="${tmpid}-popup-iframe" type="radio" value="void" name="pdf-embed-resource-target"
                    ${checked(annot.target == 'popup-iframe')}
                    class="pdf-annotation__embed-editor-popup-popup-iframe-option"/>
                  <span>Popup</span>
                </label>` : ''}
                ${configs?.newPage ?
        `<label class="pdf-annotation__embed-editor-segment pdf-annotation__embed-editor-popup-new-page-row" title="Open externally in a new tab">
                  <input id="${tmpid}-new-page" type="radio" value="void" name="pdf-embed-resource-target"
                    ${checked(annot.target == 'new-page')}
                    class="pdf-annotation__embed-editor-popup-new-page-option"/>
                  <span>New tab</span>
                </label>` : ''}
              </div>
            </div>

            ${configs?.popup ?
        `<div class="pdf-annotation__embed-editor-popup-target-size-row"
              style="${annot.target != 'popup-iframe' ? 'display: none;' : ''}">
              <div class="pdf-annotation__embed-editor-field-group">
                <span class="pdf-annotation__embed-editor-field-label">Popup size</span>
                <div class="pdf-annotation__embed-editor-segments pdf-annotation__embed-editor-sizes" role="radiogroup" aria-label="Popup size">
                  ${configs?.popup?.fullscreen ?
          `<label class="pdf-annotation__embed-editor-segment pdf-annotation__embed-editor-popup-fullscreen-row" title="Cover the whole viewer">
                      <input id="${tmpid}-fullscreen" type="radio" value="void" name="target-size"
                        ${checked(annot.targetSize == 'fullscreen')}
                        class="pdf-annotation__embed-editor-popup-fullscreen-option"/>
                      <span>Full</span>
                    </label>` : ''}
                  ${configs?.popup?.fullpage ?
          `<label class="pdf-annotation__embed-editor-segment pdf-annotation__embed-editor-popup-fullpage-row" title="Fill the current page">
                      <input id="${tmpid}-fullpage" type="radio" value="void" name="target-size"
                        ${checked(annot.targetSize == 'fullpage')}
                        class="pdf-annotation__embed-editor-popup-fullpage-option"/>
                      <span>Page</span>
                    </label>` : ''}
                  ${configs?.popup?.custom ?
          `<label class="pdf-annotation__embed-editor-segment pdf-annotation__embed-editor-popup-custom-size-row" title="Use a custom width and height">
                      <input id="${tmpid}-custom" type="radio" value="void" name="target-size" ${customChecked}
                        class="pdf-annotation__embed-editor-popup-custom-size-option"/>
                      <span>Custom</span>
                    </label>` : ''}
                </div>
                ${configs?.popup?.custom ?
          `<div class="pdf-annotation__embed-editor-size-fields"
                    style="${customChecked ? '' : 'display: none;'}">
                    <input type="text" placeholder="${customTargetSize[0]}" value="${customTargetSize[0]}" ${customChecked ? '' : 'disabled'}
                      aria-label="Width"
                      class="pdf-annotation__embed-editor-popup-custom-size-width pdf-annotation__embed-editor-size-input"/>
                    <span class="pdf-annotation__embed-editor-size-sep" aria-hidden="true">×</span>
                    <input type="text" placeholder="${customTargetSize[1]}" value="${customTargetSize[1]}" ${customChecked ? '' : 'disabled'}
                      aria-label="Height"
                      class="pdf-annotation__embed-editor-popup-custom-size-height pdf-annotation__embed-editor-size-input"/>
                  </div>` : ''}
              </div>

              ${configs?.popup?.ctrls || configs?.popup?.onHover ?
          `<div class="pdf-annotation__embed-editor-options-group">
                ${configs?.popup?.ctrls ?
            `<label class="pdf-annotation__embed-editor-checkbox-row pdf-annotation__embed-editor-popup-ctrls-row">
                    <input id="${tmpid}-ctrls" type="checkbox" value="void" name="ctrls"
                      ${checked(annot.ctrls)}
                      class="pdf-annotation__embed-editor-popup-ctrls-option"/>
                    <span>Show open &amp; close controls</span>
                  </label>` : ''}
                ${configs?.popup?.onHover ?
            `<label class="pdf-annotation__embed-editor-checkbox-row pdf-annotation__embed-editor-popup-on-hover-row">
                    <input id="${tmpid}-on-hover" type="checkbox" value="void" name="on-hover"
                      ${checked(annot.openOn == 'hover')} ${customChecked ? '' : 'disabled'}
                      class="pdf-annotation__embed-editor-popup-on-hover-option"/>
                    <span>Open on hover</span>
                  </label>` : ''}
              </div>` : ''}
            </div>` : ''}
          </div>
        </div>

        <div class="pdf-annotation__embed-editor-footer">
          <span class="pdf-annotation__embed-editor-hint">Changes save automatically</span>
        </div>
      </div>`.trim();
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-embed-editor__dropping-zone .textLayer {
            cursor: crosshair !important;
          }

          .pdf-embed-editor__dropping-zone {
            outline: 2px dashed rgba(61, 109, 240, 0.4);
            outline-offset: -3px;
            box-shadow: inset 0 0 0 9999px rgba(61, 109, 240, 0.04);
          }

          .pdf-annotation__embed:active {
            cursor: grabbing;
          }

          .pdf-annotation__embed-editor-popup {
            position: absolute;
            width: 22.5rem;
            max-width: min(72%, 24rem);
            max-height: min(42%, 22rem);
            display: flex;
            flex-direction: column;
            text-align: left;
            pointer-events: auto;
            z-index: 6;
            border-radius: 0.85rem;
            overflow: hidden;
            box-shadow:
              0 18px 40px rgba(16, 24, 40, 0.16),
              0 2px 6px rgba(16, 24, 40, 0.06),
              0 0 0 1px rgba(16, 24, 40, 0.08);
            font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
            letter-spacing: -0.011em;
            background: #f7f8fa;
            color: #1f2937;
          }

          .pdf-annotation__embed-editor-popup-controls {
            display: flex;
            flex-direction: column;
            min-height: 0;
            flex: 1;
          }

          .pdf-annotation__embed-editor-header {
            padding: 0.65rem 0.75rem 0.55rem;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            gap: 0.45rem;
            border-bottom: 1px solid rgba(16, 24, 40, 0.08);
            background: rgba(255, 255, 255, 0.65);
          }

          .pdf-annotation__embed-editor-title {
            font-size: 0.8125rem;
            font-weight: 650;
            color: #111827;
            letter-spacing: -0.02em;
          }

          .pdf-annotation__embed-editor-tabs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.2rem;
            padding: 0.15rem;
            border-radius: 0.5rem;
            background: rgba(16, 24, 40, 0.06);
          }

          .pdf-annotation__embed-editor-tab {
            appearance: none;
            border: none;
            background: transparent;
            color: #6b7280;
            font: inherit;
            font-size: 0.72rem;
            font-weight: 650;
            letter-spacing: 0.01em;
            padding: 0.35rem 0.4rem;
            border-radius: 0.4rem;
            cursor: pointer;
            line-height: 1.2;
          }
          .pdf-annotation__embed-editor-tab:hover {
            color: #374151;
          }
          .pdf-annotation__embed-editor-tab.is-active {
            background: #ffffff;
            color: #1f2937;
            box-shadow: 0 1px 3px rgba(16, 24, 40, 0.1);
          }

          .pdf-annotation__embed-editor-body {
            display: flex;
            flex-direction: column;
            padding: 0.65rem 0.75rem 0.7rem;
            overflow-y: auto;
            min-height: 0;
          }

          .pdf-annotation__embed-editor-panel {
            display: none;
            flex-direction: column;
            gap: 0.7rem;
          }
          .pdf-annotation__embed-editor-panel.is-active {
            display: flex;
          }

          .pdf-annotation__embed-editor-footer {
            flex-shrink: 0;
            padding: 0.4rem 0.75rem 0.55rem;
            border-top: 1px solid rgba(16, 24, 40, 0.08);
            background: rgba(255, 255, 255, 0.55);
          }

          .pdf-annotation__embed-editor-hint {
            font-size: 0.6875rem;
            color: #6b7280;
          }

          .pdf-annotation__embed-editor-field-group {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
          }

          .pdf-annotation__embed-editor-field-label {
            font-size: 0.6875rem;
            font-weight: 600;
            color: #4b5563;
            letter-spacing: 0.01em;
          }

          .pdf-annotation__embed-editor-optional {
            font-weight: 400;
            color: #9ca3af;
          }

          .pdf-annotation__embed-editor-input {
            width: 100%;
            box-sizing: border-box;
            padding: 0.45rem 0.55rem;
            font-size: 0.8rem;
            line-height: 1.3;
            border-radius: 0.45rem;
            border: 1px solid rgba(16, 24, 40, 0.12);
            background-color: #ffffff;
            color: #111827;
            outline: none;
            transition: border-color 0.12s ease, box-shadow 0.12s ease;
          }
          .pdf-annotation__embed-editor-input:focus {
            border-color: #3d6df0;
            box-shadow: 0 0 0 3px rgba(61, 109, 240, 0.16);
          }
          .pdf-annotation__embed-editor-input::placeholder {
            color: #9ca3af;
          }

          .pdf-annotation__embed-editor-segments {
            display: flex;
            gap: 0.2rem;
            padding: 0.15rem;
            border-radius: 0.5rem;
            background: rgba(16, 24, 40, 0.06);
          }
          .pdf-annotation__embed-editor-segment {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 0.38rem 0.35rem;
            border-radius: 0.4rem;
            cursor: pointer;
            font-size: 0.75rem;
            font-weight: 650;
            color: #4b5563;
            line-height: 1.2;
            text-align: center;
            transition: background 0.12s ease, color 0.12s ease, box-shadow 0.12s ease;
          }
          .pdf-annotation__embed-editor-segment input {
            position: absolute;
            opacity: 0;
            pointer-events: none;
            width: 0;
            height: 0;
          }
          .pdf-annotation__embed-editor-segment:hover {
            color: #111827;
            background: rgba(255, 255, 255, 0.55);
          }
          .pdf-annotation__embed-editor-segment:has(input:checked) {
            background: #ffffff;
            color: #111827;
            box-shadow: 0 1px 3px rgba(16, 24, 40, 0.12);
          }

          .pdf-annotation__embed-editor-size-fields {
            display: flex;
            align-items: center;
            gap: 0.35rem;
          }
          .pdf-annotation__embed-editor-size-sep {
            color: #9ca3af;
            font-size: 0.75rem;
          }
          .pdf-annotation__embed-editor-size-input {
            flex: 1;
            min-width: 0;
            width: auto;
            padding: 0.35rem 0.45rem;
            font-size: 0.75rem;
            border-radius: 0.4rem;
            border: 1px solid rgba(16, 24, 40, 0.12);
            background-color: #ffffff;
            color: #111827;
            outline: none;
          }
          .pdf-annotation__embed-editor-size-input:focus {
            border-color: #3d6df0;
            box-shadow: 0 0 0 2px rgba(61, 109, 240, 0.14);
          }
          .pdf-annotation__embed-editor-size-input:disabled {
            opacity: 0.45;
            background: #f3f4f6;
          }

          .pdf-annotation__embed-editor-options-group {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            padding-top: 0.1rem;
          }

          .pdf-annotation__embed-editor-checkbox-row {
            display: flex;
            align-items: center;
            gap: 0.45rem;
            font-size: 0.775rem;
            color: #374151;
            cursor: pointer;
            line-height: 1.35;
            margin: 0;
          }
          .pdf-annotation__embed-editor-checkbox-row input {
            accent-color: #3d6df0;
          }
          .pdf-annotation__embed-editor-checkbox-row:has(input:disabled) {
            opacity: 0.45;
            cursor: default;
          }

          .pdf-annotation__embed-editor-popup-target-size-row {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            padding: 0.5rem 0.55rem;
            border-radius: 0.6rem;
            background: rgba(61, 109, 240, 0.04);
            border: 1px solid rgba(61, 109, 240, 0.12);
          }

          .pdf-annotation__embed-editor-popup-resource-url-row,
          .pdf-annotation__embed-editor-popup-thumbnail-url-row {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
          }

          @media (prefers-color-scheme: dark) {
            .pdf-annotation__embed-editor-popup {
              background: #1f2430;
              color: #e5e7eb;
              box-shadow:
                0 18px 40px rgba(0, 0, 0, 0.45),
                0 0 0 1px rgba(255, 255, 255, 0.08);
            }
            .pdf-annotation__embed-editor-header,
            .pdf-annotation__embed-editor-footer {
              background: rgba(0, 0, 0, 0.2);
              border-color: rgba(255, 255, 255, 0.08);
            }
            .pdf-annotation__embed-editor-title { color: #f3f4f6; }
            .pdf-annotation__embed-editor-field-label { color: #d1d5db; }
            .pdf-annotation__embed-editor-hint { color: #9ca3af; }
            .pdf-annotation__embed-editor-tabs {
              background: rgba(255, 255, 255, 0.08);
            }
            .pdf-annotation__embed-editor-tab {
              color: #9ca3af;
            }
            .pdf-annotation__embed-editor-tab.is-active {
              background: #2a3140;
              color: #f3f4f6;
            }
            .pdf-annotation__embed-editor-input,
            .pdf-annotation__embed-editor-size-input {
              background: #2a3140;
              color: #f3f4f6;
              border-color: rgba(255, 255, 255, 0.12);
            }
            .pdf-annotation__embed-editor-segments {
              background: rgba(255, 255, 255, 0.08);
            }
            .pdf-annotation__embed-editor-segment {
              color: #9ca3af;
            }
            .pdf-annotation__embed-editor-segment:hover {
              color: #f3f4f6;
              background: rgba(255, 255, 255, 0.06);
            }
            .pdf-annotation__embed-editor-segment:has(input:checked) {
              background: #2a3140;
              color: #f3f4f6;
            }
            .pdf-annotation__embed-editor-popup-target-size-row {
              background: rgba(126, 162, 255, 0.08);
              border-color: rgba(126, 162, 255, 0.2);
            }
            .pdf-annotation__embed-editor-checkbox-row { color: #d1d5db; }
          }
        </style>`));
  }
}
