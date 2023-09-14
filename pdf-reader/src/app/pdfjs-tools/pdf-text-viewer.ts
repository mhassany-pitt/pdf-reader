import { WHRect, htmlToElements } from './pdf-utils';
import { PdfNoteViewer } from './pdf-note-viewer';

export class PdfTextViewer extends PdfNoteViewer {

  protected override getType() { return { type: 'text', viewer: 'text-viewer' }; }

  protected override onAnnotMouseOver(): void { }

  protected override getRenderedEl(annot: any, rect: WHRect) {
    const editor = this.registry.get('text-editor');
    const configs = this.registry.get(`configs.text`);

    const viewerEl = htmlToElements(
      `<div 
        data-annotation-id="${annot.id}" 
        data-annotation-type="${annot.type}"
        data-analytic-id="text-${annot.id}"
        tabindex="-1"
        class="
          pdfjs-annotation__text
          pdfjs-annotation--unfocusable
          ${configs?.moveable ? 'pdf-annotation--moveable' : ''}
          ${configs?.deletable ? 'pdfjs-annotation--deletable' : ''}" 
        style="
          top: calc(${rect.top}%);
          left: calc(${rect.left}%);
          right: calc(${rect.right}%);
          bottom: calc(${rect.bottom}%);
        ">
        ${configs?.moveable ? '<div class="move-icon">✥</div>' : ''}
        <textarea 
          class="${configs?.moveable ? 'pdf-annotation--moveable-excluded' : ''}"
          ${editor ? 'placeholder="Text ..."' : ''}
          readonly="true">${annot.note}</textarea>
      </div>`);

    const textarea = viewerEl.querySelector('textarea') as HTMLTextAreaElement;
    textarea.style.resize = editor ? 'both' : 'none';

    // exclude the textarea from movement (user need to select text) 
    // but allow user to resize the text area
    textarea.addEventListener('mousemove', ($event) => {
      if (configs?.moveable) {
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
          .pdfjs-annotation__text {
            position: absolute;
            pointer-events: auto;
            z-index: 5;
          }

          .pdfjs-annotation__text .move-icon {
            position: absolute;
            top: 4px;
            right: 3px;
            width: 12px;
            height: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: lightgray;
            cursor: move;
          }

          .pdfjs-annotation__text .move-icon:hover { 
            color: black; 
          }

          .pdfjs-annotation__text textarea {
            width: 100% !important;
            height: 100% !important;
            cursor: pointer;
            border-color: lightgray;
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
