import { WHRect, htmlToElements } from './annotator-utils';
import { PdfNoteViewer } from './pdf-note-viewer';

export class PdfTextViewer extends PdfNoteViewer {

  constructor({ registry }) {
    super({ registry });
  }

  protected override getType() {
    return { type: 'text', viewer: 'text-viewer' };
  }

  protected override onAnnotMouseOver(): void { }

  protected override getRenderedEl(annot: any, rect: WHRect) {
    const viewerEl = htmlToElements(
      `<div data-annotation-id="${annot.id}" 
        data-analytic-id="annot-text-${annot.id}"
        class="
          pdfjs-annotation__text 
          pdfjs-show-boundary__unfocusable
          ${this.attachMoveElClass ? 'pdf-movable-el' : ''}
        " 
        ${this.attachMoveElClass ? `data-movable-type="text"` : ''}
        style="
          top: calc(${rect.top}%);
          left: calc(${rect.left}%);
          right: calc(${rect.right}%);
          bottom: calc(${rect.bottom}%);
        ">
        ${this.attachMoveElClass ? '<div class="move-icon">&#10021;</div>' : ''}
        <textarea 
          class="${this.attachMoveElClass ? 'pdf-movable-el-excluded' : ''}"
          readonly="true">${annot.note}</textarea>
      </div>`);

    const textarea = viewerEl.querySelector('textarea') as HTMLTextAreaElement;
    textarea.style.resize = this.registry.get('text-editor') ? 'both' : 'none';

    // exclude the textarea from movement (user need to select text) 
    // but allow user to resize the text area
    textarea.addEventListener('mousemove', ($event) => {
      if (this.attachMoveElClass) {
        const bottomRight = textarea.offsetHeight - $event.offsetY <= 16
          && textarea.offsetWidth - $event.offsetX <= 16;
        if (bottomRight)
          textarea.classList.remove('pdf-movable-el-excluded');
        else textarea.classList.add('pdf-movable-el-excluded');
      }
    });

    return viewerEl;
  }

  protected override _attachStylesheet() {
    const styles =
      `<style>
        .pdfjs-annotation__text {
          position: absolute;
          pointer-events: auto;
          z-index: 5;
        }

        .pdfjs-annotation__text .move-icon {
          border-top-right-radius: 0.125rem;
          border-top-left-radius: 0.125rem;
          text-align: right;
          cursor: move;
          position: absolute;
          top: 0.125rem;
          right: 0.125rem;
          color: lightgray;
        }

        .pdfjs-annotation__text .move-icon:hover { 
          color: gray; 
        }

        .pdfjs-annotation__text textarea {
          width: 100% !important;
          height: 100% !important;
          background-color: transparent;
          cursor: pointer;
          border-color: lightgray;
          outline: none;
          font-family: inherit;
          border-radius: 0.125rem;
          box-sizing: border-box;
          padding-right: 1rem;
        }
      </style>`;
    this.registry.getDocumentEl().querySelector('head').appendChild(htmlToElements(styles));
  }
}

// show resize handle on right 
// don't focus on textarea when clicked