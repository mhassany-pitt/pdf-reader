import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { inSameOrigin } from "./pdfjs-utils";
import { firstValueFrom } from "rxjs";
import { AppService } from "../app.service";

export type Annotation = { id: string, type: string };
export class AnnotationStorage<T extends Annotation> {
  private annotations: T[] = [];

  private app: AppService;
  private http: HttpClient;
  private groupId: string;
  private api: string;

  constructor({ app, api, http, groupId }) {
    this.app = app;
    this.api = api;
    this.http = http;
    this.groupId = groupId;
  }

  async load(qparams?: string) {
    let api = this.api || (environment.apiUrl + '/annotations');
    api += `/${this.groupId}${qparams ? '?' + qparams : ''}`;
    const req = this.http.get(api, { withCredentials: inSameOrigin(api) });
    try {
      this.annotations = await firstValueFrom(req) as any;
    } catch (error) { }
  }

  list() { return this.annotations; }

  create(annotation: T, then?: () => void) {
    const api = `${this.api}/${this.groupId}`;
    this.http.post(api, {
      ...annotation,
      user_id: this.app.user?.id,
    }, { withCredentials: inSameOrigin(api) }).subscribe({
      next: (resp: any) => {
        annotation.id = resp.id;
        this.annotations.push(annotation);
        then?.();
      }
    });
  }

  read(id: string) {
    return this.annotations.filter(a => a.id == id)[0];
  }

  update(annotation: T, then?: () => void) {
    const api = `${this.api}/${this.groupId}/${annotation.id}`;
    this.http.patch(api, annotation, { withCredentials: inSameOrigin(api) }).subscribe({
      next: (resp: any) => {
        this.annotations[this.annotations.indexOf(this.read(annotation.id))] = annotation;
        then?.();
      }
    });
  }

  delete(annotation: T, then?: () => void) {
    const api = `${this.api}/${this.groupId}/${annotation.id}`;
    this.http.delete(api, { withCredentials: inSameOrigin(api) }).subscribe({
      next: (resp: any) => {
        this.annotations.splice(this.annotations.indexOf(annotation), 1);
        then?.();
      }
    });
  }
}
