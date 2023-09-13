import { PdfNoteToolbarBtn } from './pdf-note-toolbar-btn';

export class PdfTextToolbarBtn extends PdfNoteToolbarBtn {

  protected override getType() { return { type: 'text', editor: 'text-editor', label: 'Text' } }
  protected override getIcon() { return `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAABwklEQVR4Ae3dA4ycURTH0YZ1XDdWGdc2gyq2XcZoY6eMrSquEWtiW3Vcm7c3WmM879s5/+QXLQZnjXnT9p06rILquxsMRECACAgQAQEiIAICRECARMTO7HJ2uwc9yO736LIvZzuKAomIc9m/6N/9y84WARIRC7KfYT+z+SWAHGAxsAMlgJzgMLATQIAAAQIECJCuD0gtO9FitWxgBVxupUFut+GybmcDK/BygYwekKNR325UGORm1LejJYCsiPp2vsIgF6K+LS/lp733YuK9z5ZWGGRx9i4m3t2Sfvw+N7uWvYnh+5w9zlYNPH/lQAYue3X2NPscw/cmu5LNKQCk/qoG4le4QIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIECBAgQIAAAQIESETMzDZ14EEwN2UzgTSGsS57EZ3b82wtkPrfMwYwOowyA8jkIJuje9sEpKxHyj4BBAgQINU5QukAkHIOGfuRzQdSH8rZDh/D9y877fuQxlC2Z5c6cLDkpWyb79Q1pUCACIiAABEQIAICRECACIj+A4xa9WVc6wIDAAAAAElFTkSuQmCC">`; }
}