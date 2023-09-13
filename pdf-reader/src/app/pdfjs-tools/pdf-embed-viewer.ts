import {
  getOrParent, getPageEl, htmlToElements, isLeftClick,
  removeSelectorAll,
  rotateRect, rotation, scale
} from './annotator-utils';
import { PdfRegistry } from './pdf-registry';
import { PdfToolbar } from './pdf-toolbar';

export class PdfEmbedViewer {

  private registry: PdfRegistry;

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('embed-viewer', this);

    // remove popup on delete
    this.registry.register(`embed.deleted.${Math.random()}`,
      (annot) => removeSelectorAll(this._getDocumentEl(),
        `.pdfjs-annotation__embed-viewer-popup[data-embed-id="${annot.id}"]`));

    this._attachStylesheet();
    this._renderOnPagerendered();
    this._onAnnotClick();
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getToolbar(): PdfToolbar { return this.registry.get('toolbar'); }
  private _getDocument() { return this.registry.getDocument(); }
  private _getDocumentEl() { return this.registry.getDocumentEl(); }
  private _getStorage() { return this.registry.get('storage'); }
  private _getAnnotLayer() { return this.registry.get('annotation-layer'); }

  private _renderOnPagerendered() {
    this._getPdfJS().eventBus.on('pageannotationsloaded', ($event: any) => {
      const pageNum = $event.pageNumber;
      const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(pageNum);
      annotsLayerEl.querySelectorAll('.pdfjs-annotation__embed').forEach((el: any) => el.remove());

      this._getStorage().list()
        .filter(annot => annot.type == 'embed')
        .filter(annot => annot.pages.includes(pageNum))
        .forEach(annot => this.render(annot));
    });
  }

  render(annot: any) {
    const annotsLayerEl = this._getAnnotLayer().getOrAttachLayerEl(annot.pages[0]);
    annotsLayerEl.querySelectorAll(`[data-annotation-id="${annot.id}"].pdfjs-annotation__embed`)
      .forEach((el: any) => el.remove());

    const editor = this.registry.get('embed-editor');
    const configs = this.registry.get(`configs.embed`);

    const degree = rotation(this._getPdfJS());
    const bound = rotateRect(degree, true, annot.rects[annot.pages[0]][0] as any);

    const viewerEl = htmlToElements(
      `<div 
        data-annotation-id="${annot.id}" 
        data-annotation-type="${annot.type}"
        data-analytic-id="embed-${annot.id}"
        tabindex="-1"
        class="
          pdfjs-annotation__embed 
          ${configs?.moveable ? 'pdf-annotation--moveable' : ''}
          ${configs?.deletable ? 'pdfjs-annotation--deletable' : ''}" 
        style="
          top: ${bound.top}%;
          left: ${bound.left}%;
          bottom: calc(${bound.bottom + bound.top == 100 ? `${100 - bound.top}% - 32px` : `${bound.bottom}%`});
          right: calc(${bound.right + bound.left == 100 ? `${100 - bound.left}% - 32px` : `${bound.right}%`});
          min-width: 16px;
          min-height: 16px;
          border-radius: 0.125rem;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
        <div class="top-right">
          ${configs?.moveable && annot.target == 'inline-iframe' ? '<div class="move-icon">✥</div>' : ''}
          ${editor ? '<div class="pdfjs-annotation__embed-edit-btn">⚙</div>' : ''}
        </div>
        ${editor ? '<img class="resize-icon" draggable="false" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHAQMAAAD+nMWQAAAABlBMVEVHcExmZmZEBjuPAAAAAXRSTlMAQObYZgAAABRJREFUeAFjYAICFiYOJiEmJSYXAAHyAJWhegUKAAAAAElFTkSuQmCC"/>' : ''}
      </div>`);
    annotsLayerEl.appendChild(viewerEl);

    if (annot.target == 'inline-iframe') {
      const iframeEl = htmlToElements(`<iframe src="${annot.resource}"></iframe>`);
      viewerEl.appendChild(iframeEl);
      this.fitIframeToParent(viewerEl);
    } else if (annot.thumbnail) {
      viewerEl.appendChild(htmlToElements(`<img class="pdfjs-annotation__embed-thumb-icon" draggable="false" src="${annot.thumbnail}"/>`));
    }
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
      const isThumbIcon = getOrParent($event, '.pdfjs-annotation__embed-thumb-icon'),
        isEditBtn = getOrParent($event, '.pdfjs-annotation__embed-edit-btn'),
        isViewerPopup = getOrParent($event, '.pdfjs-annotation__embed-viewer-popup'),
        isViewerPopupVisible = getPageEl($event.target)?.querySelector('.pdfjs-annotation__embed-viewer-popup');
      if (isLeftClick($event) && isThumbIcon && !isEditBtn && !isViewerPopupVisible) {
        const annotEl = getOrParent($event, '.pdfjs-annotation__embed');
        const annotId = annotEl.getAttribute('data-annotation-id');
        const annot = this._getStorage().read(annotId);
        if (annot.target == 'new-page') {
          window.open(annot.resource, '_blank');
        } else if (annot.target == 'popup-iframe') {
          const popupEl = htmlToElements(
            `<div class="pdfjs-annotation__embed-viewer-popup" data-embed-id="${annotId}">
              <div class="pdfjs-annotation__embed-viewer-popup-header">
                <a href="${annot.resource}" target="_blank">open in new tab</a>
                <span style="flex-grow: 1;"></span>
                <button type="button" class="close-btn">close</button>
              </div>
              <iframe src="${annot.resource}" style="flex-grow: 1; height: 0%;"></iframe>
            </div>`);
          this._getAnnotLayer().getOrAttachLayerEl(annot.pages[0]).appendChild(popupEl);
          popupEl.querySelector('.close-btn')?.addEventListener('click', $event => {
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
            popupEl.style.top = `calc(100% - ${style.bottom} + 5px)`;
            popupEl.style.left = `calc(${style.left} + (${style.width} / 2) - (${targetSize[0]} / 2))`;
            popupEl.style.width = `${targetSize[0]}`;
            popupEl.style.height = `${targetSize[1]}`;
          }
        }
      } else if (!isThumbIcon && !isViewerPopup) {
        this.removePopups();
      }
    });
  }

  removePopups() {
    this._getDocumentEl().querySelectorAll('.pdfjs-annotation__embed-viewer-popup').forEach(el => el.remove());
  }

  private _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdfjs-annotation__embed {
            position: absolute;
            pointer-events: auto;
            user-select: none;
            cursor: pointer;
            z-index: 5;
            border: solid 1px lightgray;
            background-color: white;
            border-radius: 0.125rem;
          }
          
          .pdfjs-annotation__embed img.pdfjs-annotation__embed-thumb-icon {
            max-width: 80%; 
            max-height: 80%; 
            margin: 2.5%;
            object-fit: contain;
            user-select: none;
          }
          .pdfjs-annotation__embed img.pdfjs-annotation__embed-thumb-icon:hover {
            max-width: 90%;
            max-height: 90%;
            margin: 0;
          }

          .pdfjs-annotation__embed img.resize-icon {
            position: absolute;
            bottom: 0;
            right: 0;
            cursor: se-resize;
            z-index: 2;
          }

          .pdfjs-annotation__embed .top-right {
            position: absolute;
            top: 2px;
            right: 1px;
            width: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 2;
          }

          .pdfjs-annotation__embed .move-icon { 
            color: lightgray;
          }

          .pdfjs-annotation__embed .move-icon:hover { 
            color: black; 
          }
  
          .pdfjs-annotation__embed .pdfjs-annotation__embed-edit-btn {
            font-size: 1.25rem;
            color: lightgray;
          }

          .pdfjs-annotation__embed .pdfjs-annotation__embed-edit-btn:hover { 
            color: black; 
          }

          .pdfjs-annotation__embed iframe {
            background-color: white;
            border: none; 
            z-index: 1;
          }
          
          .pdfjs-annotation__embed-viewer-popup {
            display: flex;
            flex-flow: column;
            width: 100%;
            height: 100%;
            box-shadow: rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;
            background-color: white;
            overflow: hidden;
            border-radius: 0.125rem;
            padding: 0.125rem;
            z-index: 6;
            pointer-events: auto;
          }
          
          .pdfjs-annotation__embed-viewer-popup-header {
            display: flex;
            align-items: center;
            margin: 5px;
          }      
        </style>`
      ));
  }
}
