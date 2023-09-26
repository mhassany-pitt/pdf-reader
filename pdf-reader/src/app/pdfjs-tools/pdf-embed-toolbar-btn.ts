import { PdfEmbedEditor } from './pdf-embed-editor';
import { PdfToolbarBtn } from './pdf-toolbar-btn';

export class PdfEmbedToolbarBtn extends PdfToolbarBtn {

  constructor({ registry }) {
    super({ registry });

    this.registry.register(`configs.default.embed`, () => PdfEmbedToolbarBtn.defaultConfigs());

    this._addToolbarUI();
  }

  protected _configs() { return this.registry.get(`configs.embed`); }
  static defaultConfigs() {
    return {
      delete: true,
      move: true,
      inline: true,
      popup: {
        fullscreen: true,
        fullpage: true,
        custom: true,
        customSize: '320px,240px',
        onHover: true,
        ctrls: ['open-in-blank', 'close'],
      },
      newPage: true,
      resource: '/#/default-resource',
      thumbnail: '/assets/info.png',
    };
  }

  private _getEditor(): PdfEmbedEditor { return this.registry.get('embed-editor'); }

  protected override getIcon() { return '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAB5ElEQVR4AWJwLwC0dw+gdoBxGIc7zUhDWramMDPXrDxk2/MWx8wpNy9zyjamOGTjnnD1zrvW/6g9b/3y5XNx/O1XF+WbAKR7AiIgQAQEiIAAERABASIgQAQEyNDQ0PK0NR1KJ36kQ2lrWtY2kHywjelFaqbxZ830PK2vBRkJ0UiX00Cy6W0gXUiNVoDcTrOb3SwFyTs8luY2O1wCknc0P31Kc5t9TPMqQPammtmuCpCrqWZ2pQLkQaqZ3asAeZx6ZV/SqbSyHdeq83EWp53pVZrOHv9PIF/Smml9M+th5qVHQEbu1By+qRUoq1ITyK8V/JmqQHkD5NcKvqEVIE+AdBfIYyBAgAABAgQIECBAgAABAgQIECBAgAABAgSI+0NauFVdAPIWyN+d6TDGavepj9zXDj/q5HEaAjJy39KZtLpNEEvSnvQmZUC6fUCAGBAgBgQIECBAgAAxIEAMCBADUj4gBgSIAQFiQOoHxIAAMSBA7qea2V0vgtldu1wBsjvVzHZUgMxLH5PNbe/TvKqXGj+SbG47WP1i/DeTzW7XW3VcxcU0kKY3G0jnUqOVB7qsT89TX7Lx15eepnXtPPJoWdo84sgjHUqb01KHgjmlTUCACMj4AREQAQEiIEAEBIiAABEQDQMXeD06YD9UEQAAAABJRU5ErkJggg==">'; }

  protected override getClassName() { return 'embed'; }
  protected override getTitle() { return 'Embed'; }

  protected override _addToolbarUI(): void {
    if (!this._configs())
      return;

    super._addToolbarUI();
  }

  protected override selected() {
    this._getEditor().setEnabled(true);
    this._getEditor().onPointDrop = () => {
      if (this.button.classList.contains('selected'))
        this.button.click();
    };
    this._getToolbarEl().showDetails(null as any);
  }

  protected override unselected() {
    this._getEditor().setEnabled(false);
    this._getToolbarEl().showDetails(null as any);
  }
}
