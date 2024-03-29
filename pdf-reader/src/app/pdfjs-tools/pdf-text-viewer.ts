import { WHRect, htmlToElements, scale } from './pdf-utils';
import { PdfNoteViewer } from './pdf-note-viewer';

export class PdfTextViewer extends PdfNoteViewer {

  protected override _configs() { return this.registry.get(`configs.text`); }

  protected override getType() { return { type: 'text', viewer: 'text-viewer' }; }

  protected override onAnnotMouseOver(): void { }

  protected override getRenderedEl(annot: any, rect: WHRect) {
    const editor = this.registry.get('text-editor');
    const configs = this._configs();
    const scaleFactor = scale(this._getPdfJS());

    const viewerEl = htmlToElements(
      `<div 
        data-annotation-id="${annot.id}" 
        data-annotation-type="${annot.type}"
        data-analytic="text:${annot.id}"
        tabindex="-1"
        class="
          pdf-annotation__text
          pdf-annotation--unfocusable
          ${editor && configs?.move ? 'pdf-annotation--moveable' : ''}
          ${editor && configs?.delete ? 'pdf-annotation--deletable' : ''}" 
        style="
          top: calc(${rect.top}%);
          left: calc(${rect.left}%);
          right: calc(${rect.right}%);
          bottom: calc(${rect.bottom}%);
        ">
        ${editor && configs?.move ? `<div class="pdf-annotation__embed-move-btn" style="font-size: calc(${scaleFactor} * 1rem);">✥</div>` : ''}
        <textarea readonly="true" ${editor ? 'placeholder="Text ..."' : ''} 
          class="pdf-annotation__text-viewer-textarea ${editor && configs?.move ? 'pdf-annotation--moveable-excluded' : ''}"
          style="font-size: ${scale(this._getPdfJS()) * 100}%;"
        >${annot.note}</textarea>
      </div>`);

    const textarea = viewerEl.querySelector('textarea') as HTMLTextAreaElement;
    textarea.style.resize = editor ? 'both' : 'none';

    // exclude the textarea from movement (user need to select text) 
    // but allow user to resize the text area
    textarea.addEventListener('mousemove', ($event) => {
      if (editor && configs?.move) {
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
            border-color: lightgray;
            cursor: pointer;
            outline: none;
            font-family: inherit;
            border-radius: 0.125rem;
            box-sizing: border-box;
            padding: 0.125rem;
            padding-right: 1rem;
          }
        </style>`
      ));
  }
}
