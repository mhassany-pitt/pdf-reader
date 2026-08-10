import {
  getOrParent, getPageEl, htmlToElements,
  removeSelectorAll, rotateRect, rotation, scale,
  annotTitleAttr, getAnnotDisplayName, escapeHtml, annotIsMine
} from './pdf-utils';
import { PdfRegistry } from './pdf-registry';
import { PdfToolbar } from './pdf-toolbar';
import { baseHref } from 'src/environments/environment';

const EMBED_ICON_SVG = `<svg class="pdf-annotation__embed-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 4v10h14V8H5Zm0-2v1h14V6H5Z"/>
</svg>`;

const MOVE_ICON_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M8 1.2 10.2 3.4 8.9 3.4 8.9 6.1 11.6 6.1 11.6 4.8 13.8 7 11.6 9.2 11.6 7.9 8.9 7.9 8.9 10.6 10.2 10.6 8 12.8 5.8 10.6 7.1 10.6 7.1 7.9 4.4 7.9 4.4 9.2 2.2 7 4.4 4.8 4.4 6.1 7.1 6.1 7.1 3.4 5.8 3.4 8 1.2Z"/>
</svg>`;

const EDIT_ICON_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M11.7 1.6c.4-.4 1-.4 1.4 0l1.3 1.3c.4.4.4 1 0 1.4L6.1 12.6 2.5 13.5l.9-3.6L11.7 1.6Zm-8.4 9.7.4 1.5 1.5.4 7-7-1.9-1.9-7 7Z"/>
</svg>`;

const CLOSE_ICON_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M3.2 3.2c.3-.3.8-.3 1.1 0L8 6.9l3.7-3.7c.3-.3.8-.3 1.1 0 .3.3.3.8 0 1.1L9.1 8l3.7 3.7c.3.3.3.8 0 1.1-.3.3-.8.3-1.1 0L8 9.1l-3.7 3.7c-.3.3-.8.3-1.1 0-.3-.3-.3-.8 0-1.1L6.9 8 3.2 4.3c-.3-.3-.3-.8 0-1.1Z"/>
</svg>`;

const EXTERNAL_ICON_SVG = `<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M9.2 2.2h4.6v4.6h-1.4V4.6L7.8 9.2 6.8 8.2l4.6-4.6H9.2V2.2ZM3.2 3.8h4v1.4h-3v6.6h6.6v-3H12v4.4H2.2V3.8h1Z"/>
</svg>`;

export class PdfEmbedViewer {

  private registry: PdfRegistry;
  private timeout: any = null;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('embed-viewer', this);
    this.registry.register(`storage.deleted.${Math.random()}`, (annot) => {
      if (annot.type == 'embed') {
        removeSelectorAll(this._getDocumentEl(),
          `.pdf-annotation__embed-viewer-popup[data-embed-id="${annot.id}"]`);
      }
    });

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._onAnnotClick();
  }

  protected _configs() { return this.registry.get(`configs.embed`); }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getToolbar(): PdfToolbar { return this.registry.get('toolbar'); }
  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getStorage() { return this.registry.get('storage'); }
  private _getAnnotLayer() { return this.registry.get('annotation-layer'); }

  private _resourceLabel(resource?: string) {
    if (!resource) return 'Embedded content';
    try {
      const url = new URL(resource, (this._getDocument() as any).location?.href || location.href);
      if (url.hash?.startsWith('#/')) return 'App resource';
      return url.hostname || 'Embedded content';
    } catch {
      return 'Embedded content';
    }
  }

  private _isDefaultThumbnail(thumbnail?: string) {
    return !thumbnail || thumbnail === '/assets/info.png' || thumbnail.endsWith('/assets/info.png');
  }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(pageNum);
      removeSelectorAll(annotsLayerEl, '.pdf-annotation__embed');

      this._getStorage().list()
        .filter(annot => annot.type == 'embed')
        .filter(annot => annot.pages.includes(pageNum))
        .forEach(annot => this.render(annot));
    });
  }

  render(annot: any) {
    const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(annot.pages[0]);
    annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdf-annotation__embed`)
      .forEach((el: any) => el.remove());

    const editor = this.registry.get('embed-editor');
    const configs = this._configs();

    const degree = rotation(this._getPdfJS());
    const bound = rotateRect(degree, true, annot.rects[annot.pages[0]][0] as any);
    const scaleFactor = scale(this._getPdfJS());

    const editable = editor && configs && annotIsMine(annot);
    const movable = editable && configs?.move && annot.target == 'inline-iframe';
    const isInline = annot.target == 'inline-iframe';
    const openHint = annot.target == 'new-page'
      ? 'Open in new tab'
      : annot.target == 'popup-iframe'
        ? (annot.openOn == 'hover' ? 'Hover to preview' : 'Click to open')
        : 'Embedded content';

    const viewerEl = htmlToElements(
      `<div 
        data-annotation-id="${annot.id}" 
        data-annotation-type="${annot.type}"
        data-analytic="embed:${annot.id}"
        ${getAnnotDisplayName(annot) ? `data-annotator="${escapeHtml(getAnnotDisplayName(annot))}"` : ''}
        tabindex="-1"
        title="${annotTitleAttr(annot, openHint)}"
        class="${[
        'pdf-annotation__embed',
        isInline ? 'pdf-annotation__embed--inline' : 'pdf-annotation__embed--placeholder',
        annot.openOn == 'hover' ? 'pdf-annotation__embed--open-on-hover' : '',
        movable ? 'pdf-annotation--moveable' : '',
        editable && configs?.delete ? 'pdf-annotation--deletable' : ''
      ].filter(c => c).join(' ')}" 
        style="
          top: ${bound.top}%;
          left: ${bound.left}%;
          bottom: calc(${bound.bottom + bound.top == 100 ? `${100 - bound.top}% - 32px` : `${bound.bottom}%`});
          right: calc(${bound.right + bound.left == 100 ? `${100 - bound.left}% - 32px` : `${bound.right}%`});
          min-width: calc(${scaleFactor} * ${isInline ? 48 : 32}px);
          min-height: calc(${scaleFactor} * ${isInline ? 48 : 32}px);
        ">
        <div class="pdf-annotation__embed-controls">
          ${movable ? `<button type="button" class="pdf-annotation__embed-move-btn" title="Move" aria-label="Move">${MOVE_ICON_SVG}</button>` : ''}
          ${editable ? `<button type="button" class="pdf-annotation__embed-edit-btn" title="Edit embed" aria-label="Edit embed">${EDIT_ICON_SVG}</button>` : ''}
        </div>
        ${editable ? '<span class="pdf-annotation__embed-resize-handle" aria-hidden="true"></span>' : ''}
      </div>`);
    annotsLayerEl.appendChild(viewerEl);

    if (isInline) {
      if (annot.resource) {
        const iframeEl = htmlToElements(
          `<iframe src="${annot.resource}" class="pdf-annotation__embed-inline-iframe" title="${this._resourceLabel(annot.resource)}"></iframe>`);
        viewerEl.appendChild(iframeEl);
        this.fitIframeToParent(viewerEl);
      } else {
        viewerEl.appendChild(htmlToElements(
          `<div class="pdf-annotation__embed-inline-empty">
            ${EMBED_ICON_SVG}
            <span>Add a resource URL</span>
          </div>`));
      }
    } else {
      viewerEl.appendChild(this._buildPlaceholder(annot, scaleFactor));
    }

    if (
      annot.target == 'popup-iframe' &&
      !['fullscreen', 'fullpage'].includes(annot.targetSize) &&
      annot.openOn == 'hover'
    ) {
      viewerEl.addEventListener('mouseenter', $event => {
        this.timeout = setTimeout(() => this._showAnnotInPopupOrBlank($event), 600);
      });
      viewerEl.addEventListener('mouseleave', $event => {
        if (this.timeout)
          clearTimeout(this.timeout);
      });
      // user needs to click close button to close popup
    } else {
      viewerEl.addEventListener('click', $event => {
        if (
          getOrParent($event, '.pdf-annotation__embed-edit-btn') ||
          getOrParent($event, '.pdf-annotation__embed-move-btn') ||
          getOrParent($event, '.pdf-annotation__embed-resize-handle')
        ) return;
        this._showAnnotInPopupOrBlank($event);
      });
    }
  }

  private _buildPlaceholder(annot: any, scaleFactor: number) {
    const label = this._resourceLabel(annot.resource);
    const action = annot.target == 'new-page' ? 'Open' : 'Preview';

    if (!this._isDefaultThumbnail(annot.thumbnail)) {
      const src = (annot.thumbnail == '/assets/info.png' ? baseHref : '') + annot.thumbnail;
      return htmlToElements(
        `<div class="pdf-annotation__embed-thumb">
          <img class="pdf-annotation__embed-thumb-icon" draggable="false" src="${src}" alt=""/>
          <span class="pdf-annotation__embed-thumb-badge">${action}</span>
        </div>`);
    }

    return htmlToElements(
      `<div class="pdf-annotation__embed-placeholder" style="font-size: calc(${scaleFactor} * 1rem);">
        <span class="pdf-annotation__embed-placeholder-icon">${EMBED_ICON_SVG}</span>
        <span class="pdf-annotation__embed-placeholder-meta">
          <span class="pdf-annotation__embed-placeholder-action">${action}</span>
          <span class="pdf-annotation__embed-placeholder-label">${label}</span>
        </span>
      </div>`);
  }

  fitIframeToParent(annotEl: HTMLElement) {
    const iframe = annotEl.querySelector('iframe') as HTMLIFrameElement;
    if (iframe == null)
      return;

    const degree = rotation(this._getPdfJS());
    const scaleFactor = scale(this._getPdfJS());
    iframe.style.position = 'absolute';
    iframe.style.transform = `scale(${scaleFactor}) rotate(${degree}deg)`;

    const computedStyle = getComputedStyle(annotEl);
    let width: any = parseFloat(computedStyle.width.replace('px', '')) / scaleFactor;
    let height: any = parseFloat(computedStyle.height.replace('px', '')) / scaleFactor;
    width = degree == 90 || degree == 270 ? height : width;
    height = degree == 90 || degree == 270 ? width : height;
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
  }

  private _onAnnotClick() {
    this._getDocument().addEventListener('click', ($event: any) => {
      const embedEl = getOrParent($event, '.pdf-annotation__embed'),
        viewerPopup = getOrParent($event, '.pdf-annotation__embed-viewer-popup');
      if (!embedEl && !viewerPopup)
        this.removePopups();
    });
  }

  private _showAnnotInPopupOrBlank($event: any) {
    const annotEl = getOrParent($event, '.pdf-annotation__embed');
    const annotId = annotEl.getAttribute('data-annotation-id');
    const annot = this._getStorage().read(annotId);

    if (annot.target == 'new-page') {
      window.open(annot.resource, '_blank');
      return;
    }

    const popupEl = getPageEl($event.target)?.querySelector('.pdf-annotation__embed-viewer-popup');
    if (annot.target == 'popup-iframe' && !popupEl) {
      const label = this._resourceLabel(annot.resource);
      const showCtrls = annot.ctrls?.filter(c => ['open-in-blank', 'close'].includes(c)).length;
      const popupEl = htmlToElements(
        `<div class="pdf-annotation__embed-viewer-popup" data-embed-id="${annotId}">
          ${showCtrls ?
          `<div class="pdf-annotation__embed-viewer-popup-header">
            <span class="pdf-annotation__embed-viewer-popup-title" title="${label}">${label}</span>
            <span class="pdf-annotation__embed-viewer-popup-actions">
              ${annot.ctrls?.includes('open-in-blank')
            ? `<a href="${annot.resource}" target="_blank" rel="noopener noreferrer"
                    class="pdf-annotation__embed-viewer-popup-open-in-blank" title="Open in new tab">
                    ${EXTERNAL_ICON_SVG}<span>Open</span>
                  </a>`
            : ''}
              ${annot.ctrls?.includes('close')
            ? `<button type="button" class="pdf-annotation__embed-viewer-popup-close" title="Close" aria-label="Close">
                    ${CLOSE_ICON_SVG}
                  </button>`
            : ''}
            </span>
          </div>` :
          `<div class="pdf-annotation__embed-viewer-popup-header pdf-annotation__embed-viewer-popup-header--minimal">
            <span class="pdf-annotation__embed-viewer-popup-title" title="${label}">${label}</span>
          </div>`}
          <div class="pdf-annotation__embed-viewer-popup-body">
            <div class="pdf-annotation__embed-viewer-popup-loading" aria-hidden="true">Loading…</div>
            <iframe src="${annot.resource}" class="pdf-annotation__embed-popup-iframe" title="${label}"></iframe>
          </div>
        </div>`);
      this._getAnnotLayer().getOrAttachLayerEl(annot.pages[0]).appendChild(popupEl);

      const iframe = popupEl.querySelector('.pdf-annotation__embed-popup-iframe') as HTMLIFrameElement;
      const loading = popupEl.querySelector('.pdf-annotation__embed-viewer-popup-loading') as HTMLElement;
      const hideLoading = () => loading?.classList.add('is-hidden');
      iframe?.addEventListener('load', hideLoading);
      setTimeout(hideLoading, 2500);

      popupEl.querySelector('.pdf-annotation__embed-viewer-popup-close')?.addEventListener('click', $event => {
        if (annot.targetSize == 'fullscreen')
          this._getToolbar().toggle(true);
        this.removePopups();
      });

      if (annot.targetSize == 'fullscreen') {
        popupEl.style.position = 'fixed';
        popupEl.style.inset = '32px 0 0 0';
        popupEl.style.zIndex = '100';
        this._getToolbar().toggle(false);
      } else if (annot.targetSize == 'fullpage') {
        popupEl.style.position = 'absolute';
        popupEl.style.inset = '0';
      } else { // custom size popup
        const style = getComputedStyle(annotEl);
        const targetSize = annot.targetSize ? annot.targetSize.split(',') : ['320px', '240px'];
        popupEl.style.position = 'absolute';
        popupEl.style.top = `calc(100% - ${style.bottom} + 8px)`;
        popupEl.style.left = `calc(${style.left} + (${style.width} / 2) - (${targetSize[0]} / 2))`;
        popupEl.style.width = `${targetSize[0]}`;
        popupEl.style.height = `${targetSize[1]}`;
      }

      return popupEl;
    }

    return null;
  }

  removePopups() {
    if (this.timeout)
      clearTimeout(this.timeout);
    this._getDocumentEl()
      .querySelectorAll('.pdf-annotation__embed-viewer-popup')
      .forEach(el => el.remove());
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-annotation__embed {
            position: absolute;
            pointer-events: auto;
            user-select: none;
            cursor: pointer;
            z-index: 6;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.55rem;
            overflow: hidden;
            transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
          }

          .pdf-annotation__embed--placeholder {
            background: linear-gradient(160deg, #eef3ff 0%, #f7f9fc 55%, #eef2f7 100%);
            border: 1px solid rgba(61, 109, 240, 0.28);
            box-shadow:
              0 4px 12px rgba(16, 24, 40, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.75);
          }
          .pdf-annotation__embed--placeholder:hover {
            border-color: rgba(61, 109, 240, 0.5);
            box-shadow:
              0 8px 18px rgba(16, 24, 40, 0.12),
              inset 0 1px 0 rgba(255, 255, 255, 0.85);
            transform: translateY(-1px);
          }

          .pdf-annotation__embed--inline {
            background: #ffffff;
            border: 1px solid rgba(16, 24, 40, 0.12);
            box-shadow: 0 4px 14px rgba(16, 24, 40, 0.1);
          }
          .pdf-annotation__embed--inline:hover {
            border-color: rgba(61, 109, 240, 0.35);
            box-shadow: 0 8px 20px rgba(16, 24, 40, 0.14);
          }

          .pdf-annotation__embed-placeholder {
            display: flex;
            align-items: center;
            gap: 0.45em;
            padding: 0.35em 0.55em;
            max-width: 100%;
            max-height: 100%;
            box-sizing: border-box;
            color: #2f4fb8;
          }
          .pdf-annotation__embed-placeholder-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            width: 1.65em;
            height: 1.65em;
            border-radius: 0.45em;
            background: rgba(61, 109, 240, 0.12);
            color: #3d6df0;
          }
          .pdf-annotation__embed-placeholder-icon .pdf-annotation__embed-icon {
            width: 1em;
            height: 1em;
          }
          .pdf-annotation__embed-placeholder-meta {
            display: flex;
            flex-direction: column;
            gap: 0.05em;
            min-width: 0;
            line-height: 1.2;
          }
          .pdf-annotation__embed-placeholder-action {
            font-size: 0.62em;
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #3d6df0;
          }
          .pdf-annotation__embed-placeholder-label {
            font-size: 0.72em;
            font-weight: 600;
            color: #1f2937;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 9em;
          }

          .pdf-annotation__embed-thumb {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            padding: 0.35rem;
            box-sizing: border-box;
          }
          .pdf-annotation__embed img.pdf-annotation__embed-thumb-icon {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            user-select: none;
            border-radius: 0.25rem;
          }
          .pdf-annotation__embed-thumb-badge {
            position: absolute;
            right: 0.3rem;
            bottom: 0.3rem;
            padding: 0.12rem 0.35rem;
            border-radius: 999px;
            font-size: 0.55rem;
            font-weight: 700;
            letter-spacing: 0.03em;
            text-transform: uppercase;
            color: #ffffff;
            background: rgba(61, 109, 240, 0.92);
            box-shadow: 0 2px 6px rgba(16, 24, 40, 0.18);
          }

          .pdf-annotation__embed-inline-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.35rem;
            width: 100%;
            height: 100%;
            color: #6b7280;
            font-size: 0.75rem;
            font-weight: 600;
            background: repeating-linear-gradient(
              -45deg,
              #f8fafc,
              #f8fafc 8px,
              #f1f5f9 8px,
              #f1f5f9 16px
            );
          }
          .pdf-annotation__embed-inline-empty .pdf-annotation__embed-icon {
            color: #3d6df0;
            opacity: 0.75;
          }

          .pdf-annotation__embed-controls {
            position: absolute;
            top: 0.25rem;
            right: 0.25rem;
            display: flex;
            gap: 0.2rem;
            z-index: 3;
            opacity: 0;
            transform: translateY(-2px);
            transition: opacity 0.12s ease, transform 0.12s ease;
          }
          .pdf-annotation__embed:hover .pdf-annotation__embed-controls,
          .pdf-annotation__embed:focus-within .pdf-annotation__embed-controls {
            opacity: 1;
            transform: none;
          }

          .pdf-annotation__embed-move-btn,
          .pdf-annotation__embed-edit-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.35rem;
            height: 1.35rem;
            padding: 0;
            border: 1px solid rgba(16, 24, 40, 0.1);
            border-radius: 0.35rem;
            background: rgba(255, 255, 255, 0.95);
            color: #4b5563;
            box-shadow: 0 2px 6px rgba(16, 24, 40, 0.12);
            cursor: pointer;
          }
          .pdf-annotation__embed-move-btn { cursor: move; }
          .pdf-annotation__embed-move-btn:hover,
          .pdf-annotation__embed-edit-btn:hover {
            color: #1f2937;
            border-color: rgba(61, 109, 240, 0.35);
            background: #ffffff;
          }

          .pdf-annotation__embed-resize-handle {
            position: absolute;
            right: 0;
            bottom: 0;
            width: 0.7rem;
            height: 0.7rem;
            cursor: se-resize;
            z-index: 2;
            background:
              linear-gradient(135deg, transparent 45%, rgba(16, 24, 40, 0.18) 46%, rgba(16, 24, 40, 0.18) 54%, transparent 55%),
              linear-gradient(135deg, transparent 62%, rgba(16, 24, 40, 0.28) 63%, rgba(16, 24, 40, 0.28) 71%, transparent 72%);
          }

          .pdf-annotation__embed iframe,
          .pdf-annotation__embed-popup-iframe {
            background-color: white;
            border: none;
            z-index: 1;
          }

          .pdf-annotation__embed-viewer-popup {
            display: flex;
            flex-flow: column;
            gap: 0;
            width: 100%;
            height: 100%;
            background-color: #ffffff;
            box-shadow:
              0 18px 40px rgba(16, 24, 40, 0.18),
              0 2px 6px rgba(16, 24, 40, 0.06),
              0 0 0 1px rgba(16, 24, 40, 0.08);
            border-radius: 0.85rem;
            overflow: hidden;
            z-index: 6;
            pointer-events: auto;
            font-family: "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif;
            letter-spacing: -0.011em;
          }

          .pdf-annotation__embed-viewer-popup-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            border-bottom: 1px solid rgba(16, 24, 40, 0.08);
            padding: 0.45rem 0.55rem 0.45rem 0.75rem;
            background: linear-gradient(180deg, #fbfcfd 0%, #f3f5f8 100%);
            min-height: 2rem;
            box-sizing: border-box;
          }
          .pdf-annotation__embed-viewer-popup-header--minimal {
            padding-right: 0.75rem;
          }

          .pdf-annotation__embed-viewer-popup-title {
            flex: 1;
            min-width: 0;
            font-size: 0.775rem;
            font-weight: 650;
            color: #111827;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .pdf-annotation__embed-viewer-popup-actions {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            flex-shrink: 0;
          }

          .pdf-annotation__embed-viewer-popup-open-in-blank {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.7rem;
            font-weight: 650;
            color: #3d6df0;
            text-decoration: none;
            padding: 0.2rem 0.45rem;
            border-radius: 0.35rem;
            border: 1px solid transparent;
          }
          .pdf-annotation__embed-viewer-popup-open-in-blank:hover {
            background: rgba(61, 109, 240, 0.08);
            border-color: rgba(61, 109, 240, 0.18);
          }

          .pdf-annotation__embed-viewer-popup-close {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.5rem;
            height: 1.5rem;
            padding: 0;
            border-radius: 0.35rem;
            border: 1px solid rgba(16, 24, 40, 0.1);
            background: #ffffff;
            color: #4b5563;
            cursor: pointer;
          }
          .pdf-annotation__embed-viewer-popup-close:hover {
            background: #f3f4f6;
            color: #111827;
          }

          .pdf-annotation__embed-viewer-popup-body {
            position: relative;
            flex: 1;
            min-height: 0;
            display: flex;
            background: #f8fafc;
          }
          .pdf-annotation__embed-popup-iframe {
            flex: 1;
            width: 100%;
            height: 100%;
          }
          .pdf-annotation__embed-viewer-popup-loading {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 600;
            color: #6b7280;
            background: #f8fafc;
            z-index: 2;
            transition: opacity 0.2s ease;
          }
          .pdf-annotation__embed-viewer-popup-loading.is-hidden {
            opacity: 0;
            pointer-events: none;
          }

          @media (prefers-color-scheme: dark) {
            .pdf-annotation__embed--placeholder {
              background: linear-gradient(160deg, #24304a 0%, #1f2430 100%);
              border-color: rgba(126, 162, 255, 0.35);
            }
            .pdf-annotation__embed--inline {
              background: #1f2430;
              border-color: rgba(255, 255, 255, 0.12);
            }
            .pdf-annotation__embed-placeholder { color: #9db4ff; }
            .pdf-annotation__embed-placeholder-icon {
              background: rgba(126, 162, 255, 0.16);
              color: #7ea2ff;
            }
            .pdf-annotation__embed-placeholder-action { color: #7ea2ff; }
            .pdf-annotation__embed-placeholder-label { color: #e5e7eb; }
            .pdf-annotation__embed-move-btn,
            .pdf-annotation__embed-edit-btn,
            .pdf-annotation__embed-viewer-popup-close {
              background: #2a3140;
              color: #d1d5db;
              border-color: rgba(255, 255, 255, 0.12);
            }
            .pdf-annotation__embed-viewer-popup {
              background: #1f2430;
              box-shadow:
                0 18px 40px rgba(0, 0, 0, 0.45),
                0 0 0 1px rgba(255, 255, 255, 0.08);
            }
            .pdf-annotation__embed-viewer-popup-header {
              background: linear-gradient(180deg, #2a3140 0%, #242a36 100%);
              border-bottom-color: rgba(255, 255, 255, 0.08);
            }
            .pdf-annotation__embed-viewer-popup-title { color: #f3f4f6; }
            .pdf-annotation__embed-viewer-popup-open-in-blank { color: #7ea2ff; }
            .pdf-annotation__embed-viewer-popup-body,
            .pdf-annotation__embed-viewer-popup-loading {
              background: #161a22;
              color: #9ca3af;
            }
          }
        </style>`
      ));
  }
}
