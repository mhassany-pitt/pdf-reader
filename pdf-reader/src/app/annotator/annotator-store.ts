export class AnnotationStore {
  private STORAGE_KEY: string;

  private annotations = [] as any[];

  constructor({ groupId, skipLoading = false }) {
    this.STORAGE_KEY = `${groupId}__pdfjs-reader-annotations`;

    if (!skipLoading) this.load();
  }

  private load() {
    this.annotations = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
  }
  private persist() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.annotations));
  };

  list() {
    return this.annotations;
  }

  create(annotation: any) {
    this.annotations.push(annotation);
    this.persist();
  }

  read(id: string) {
    return this.annotations.filter(a => a.id == id)[0];
  }

  update(annotation: any) {
    const prev = this.read(annotation.id);
    const index = prev ? this.annotations.indexOf(prev) : -1;
    if (index < 0)
      return;
    this.annotations[index] = annotation;
    this.persist();
  }

  delete(annotation: any) {
    this.annotations.splice(this.annotations.indexOf(annotation), 1);
    this.persist();
  }
}