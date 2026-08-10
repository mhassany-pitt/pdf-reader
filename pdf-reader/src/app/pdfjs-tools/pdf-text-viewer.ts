import { WHRect, htmlToElements, scale, annotTitleAttr, getAnnotDisplayName, escapeHtml, annotIsMine } from './pdf-utils';
import { PdfNoteViewer } from './pdf-note-viewer';

export class PdfTextViewer extends PdfNoteViewer {

  protected override _configs() { return this.registry.get(`configs.text`); }

  protected override getType() { return { type: 'text', viewer: 'text-viewer' }; }

  protected override onAnnotMouseOver(): void { }

  protected override getRenderedEl(annot: any, rect: WHRect) {
    const editor = this.registry.get('text-editor');
    const configs = this._configs();
    const scaleFactor = scale(this._getPdfJS());
    const mine = annotIsMine(annot);

    const viewerEl = htmlToElements(
      `<div 
        data-annotation-id="${annot.id}" 
        data-annotation-type="${annot.type}"
        data-analytic="text:${annot.id}"
        ${getAnnotDisplayName(annot) ? `data-annotator="${escapeHtml(getAnnotDisplayName(annot))}"` : ''}
        tabindex="-1"
        title="${annotTitleAttr(annot, 'Text annotation')}"
        class="
          pdf-annotation__text
          pdf-annotation--unfocusable
          ${editor && configs?.move && mine ? 'pdf-annotation--moveable' : ''}
          ${editor && configs?.delete && mine ? 'pdf-annotation--deletable' : ''}" 
        style="
          top: calc(${rect.top}%);
          left: calc(${rect.left}%);
          right: calc(${rect.right}%);
          bottom: calc(${rect.bottom}%);
        ">
        ${editor && configs?.move && mine ? `<div class="pdf-annotation__embed-move-btn" style="font-size: calc(${scaleFactor} * 1rem);">✥</div>` : ''}
        <textarea readonly="true" ${editor && mine ? 'placeholder="Text ..."' : ''} 
          class="pdf-annotation__text-viewer-textarea ${editor && configs?.move && mine ? 'pdf-annotation--moveable-excluded' : ''}"
          style="font-size: ${scale(this._getPdfJS()) * 100}%;"
        >${annot.note}</textarea>
      </div>`);

    const textarea = viewerEl.querySelector('textarea') as HTMLTextAreaElement;
    textarea.style.resize = editor && mine ? 'both' : 'none';

    // exclude the textarea from movement (user need to select text) 
    // but allow user to resize the text area
    textarea.addEventListener('mousemove', ($event) => {
      if (editor && configs?.move && mine) {
        const bottomRight = textarea.offsetHeight - $event.offsetY <= 16
          && textarea.offsetWidth - $event.offsetX <= 16;
        if (bottomRight)
          textarea.classList.remove('pdf-annotation--moveable-excluded');
        else textarea.classList.add('pdf-annotation--moveable-excluded');
      }
    });

    return viewerEl;
  }

  protected override _attachStylesheet() {
    this.registry
      .getDocumentEl()
      .querySelector('head')
      .appendChild(htmlToElements(
        `<style>
          .pdf-annotation__text {
            position: absolute;
            pointer-events: auto;
            cursor: pointer;
            z-index: 5;
          }

          .pdf-annotation__text .pdf-annotation__embed-move-btn {
            position: absolute;
            top: 4px;
            right: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: gray;
            cursor: move;
          }

          .pdf-annotation__text .pdf-annotation__embed-move-btn:hover { 
            color: black; 
          }

          .pdf-annotation__text-viewer-textarea,
          .pdf-annotation__text-editor-textarea {
            width: 100% !important;
            height: 100% !important;
            border: 1px solid rgba(0, 0, 0, 0.12);
            cursor: pointer;
            outline: none;
            font-family: inherit;
            border-radius: 0.35rem;
            box-sizing: border-box;
            padding: 0.3rem 0.4rem;
            padding-right: 1.1rem;
            background-color: rgba(255, 255, 255, 0.92);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
            line-height: 1.4;
            resize: none;
          }

          .pdf-annotation__text-editor-textarea {
            border-color: #3d6df0;
            box-shadow: 0 0 0 2px rgba(61, 109, 240, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
            background-color: #ffffff;
          }
        </style>`
      ));
  }
}
