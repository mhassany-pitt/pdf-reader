import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";

export type Annotation = { id: string, type: string };
export class AnnotationStorage<T extends Annotation> {
  private annotations: T[] = [];

  private http: HttpClient;
  private groupId: string;
  private api: string;

  constructor({ http, groupId, annotationApi }) {
    this.http = http;
    this.groupId = groupId;
    this.api = annotationApi;

    this.load();
  }

  private load() {
    this.http.get(`${this.api || (environment.apiUrl + '/annoations')}/${this.groupId}`, { withCredentials: true }).subscribe({
      next: (resp: any) => this.annotations = resp,
      error: (error: any) => console.log(error),
    });
  }

  list() {
    return this.annotations;
  }

  create(annotation: T, then?: () => void) {
    this.http.post(`${this.api}/${this.groupId}`, annotation, { withCredentials: true }).subscribe({
      next: (resp: any) => {
        annotation.id = resp.id;
        this.annotations.push(annotation);
        then?.();
      },
      error: (error: any) => console.log(error),
    });
  }

  read(id: string) {
    return this.annotations.filter(a => a.id == id)[0];
  }

  update(annotation: T, then?: () => void) {
    this.http.patch(`${this.api}/${this.groupId}/${annotation.id}`, annotation, { withCredentials: true }).subscribe({
      next: (resp: any) => {
        this.annotations[this.annotations.indexOf(this.read(annotation.id))] = annotation;
        then?.();
      },
      error: (error: any) => console.log(error),
    });
  }

  delete(annotation: T, then?: () => void) {
    this.http.delete(`${this.api}/${this.groupId}/${annotation.id}`, { withCredentials: true }).subscribe({
      next: (resp: any) => {
        this.annotations.splice(this.annotations.indexOf(annotation), 1);
        then?.();
      },
      error: (error: any) => console.log(error),
    });
  }
}