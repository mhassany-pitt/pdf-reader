import { htmlToElements } from './annotator-utils';
import { PdfNoteToolbarBtn } from './pdf-note-toolbar-btn';
import { PdfRegistry } from './pdf-registry';
import { PdfToolbar } from './pdf-toolbar';
import { PdfToolbarBtn } from './pdf-toolbar-btn';

export class PdfEmbedResourceToolbarBtn extends PdfToolbarBtn {

  protected override getIcon() { return '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAB5ElEQVR4AWJwLwC0dw+gdoBxGIc7zUhDWramMDPXrDxk2/MWx8wpNy9zyjamOGTjnnD1zrvW/6g9b/3y5XNx/O1XF+WbAKR7AiIgQAQEiIAAERABASIgQAQEyNDQ0PK0NR1KJ36kQ2lrWtY2kHywjelFaqbxZ830PK2vBRkJ0UiX00Cy6W0gXUiNVoDcTrOb3SwFyTs8luY2O1wCknc0P31Kc5t9TPMqQPammtmuCpCrqWZ2pQLkQaqZ3asAeZx6ZV/SqbSyHdeq83EWp53pVZrOHv9PIF/Smml9M+th5qVHQEbu1By+qRUoq1ITyK8V/JmqQHkD5NcKvqEVIE+AdBfIYyBAgAABAgQIECBAgAABAgQIECBAgAABAgSI+0NauFVdAPIWyN+d6TDGavepj9zXDj/q5HEaAjJy39KZtLpNEEvSnvQmZUC6fUCAGBAgBgQIECBAgAAxIEAMCBADUj4gBgSIAQFiQOoHxIAAMSBA7qea2V0vgtldu1wBsjvVzHZUgMxLH5PNbe/TvKqXGj+SbG47WP1i/DeTzW7XW3VcxcU0kKY3G0jnUqOVB7qsT89TX7Lx15eepnXtPPJoWdo84sgjHUqb01KHgjmlTUCACMj4AREQAQEiIEAEBIiAABEQDQMXeD06YD9UEQAAAABJRU5ErkJggg==">'; }

  protected override getClassName() { return 'freeform'; }
  protected override getTitle() { return 'Freeform'; }

  protected override selected() {
  }
  protected override unselected() {
  }
}