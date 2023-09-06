import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { inSameOrigin } from "./pdfjs-utils";
import { firstValueFrom } from "rxjs";
import { AppService } from "../app.service";

export class Annotations {

  // passing user id from client side is not secure
  // but how can we send that to 3rd party api?
  // TODO: maybe we need something similar but not user id
  private user: () => any;

  private apiUrl: string;
  private http: HttpClient;
  private groupId: string;

  private pdfjs: any;

  private annots: any = {};
  private get _annots() {
    return Object.values(this.annots)
      .reduce((arr: any[], annot: any) =>
        arr.concat(annot), []);
  }

  qparams: { [key: string]: string } = {};

  constructor({ user, apiUrl, http, groupId, pdfjs }) {
    this.user = user;
    this.apiUrl = apiUrl;
    this.http = http;
    this.groupId = groupId;

    this.pdfjs = pdfjs;

    this.pdfjs.eventBus.on('pagerendered', ($event: any) => this.loadPageAnnotations($event.pageNumber));
    this.pdfjs.eventBus.on('pagesdestroy', ($event: any) => delete this.annots[$event.pageNumber]);
  }

  async reload() {
    Object.keys(this.annots).map(k => parseInt(k)).forEach(pageNum => this.loadPageAnnotations(pageNum));
  }

  private async loadPageAnnotations(pageNum: number) {
    this.annots[pageNum] = await this.loadAnnotations({ ...this.qparams, pages: pageNum });
    if (this.annots[pageNum]) {
      this.pdfjs.eventBus.dispatch('pageannotationsloaded', { pageNumber: pageNum });
    }
  }

  async loadAnnotations(qparams: any) {
    try {
      let api = this.apiUrl || (environment.apiUrl + '/annotations');
      api += `/${this.groupId}?${Object.keys(qparams).map(k => `${k}=${qparams[k]}`).join('&')}`;
      const req = this.http.get(api, { withCredentials: inSameOrigin(api) });
      return await firstValueFrom(req) as any;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  list() { return this._annots; }

  create(annot: any, then?: () => void) {
    const api = `${this.apiUrl}/${this.groupId}`;
    this.http.post(api, {
      ...annot,
      user_id: this.user?.().id,
    }, { withCredentials: inSameOrigin(api) }).subscribe({
      next: (resp: any) => {
        annot.id = resp.id;
        annot.pages.forEach(page => {
          if (page in this.annots == false)
            this.annots[page] = [];
          this.annots[page].push(annot);
        });
        then?.();
      }
    });
  }

  read(id: string) {
    return this._annots.filter(a => a.id == id)[0];
  }

  update(annot: any, then?: () => void) {
    const api = `${this.apiUrl}/${this.groupId}/${annot.id}`;
    this.http.patch(api, annot, { withCredentials: inSameOrigin(api) }).subscribe({
      next: (resp: any) => {
        annot.pages
          .filter(page => page in this.annots)
          .forEach(page => {
            const index = this.annots[page].indexOf(annot);
            if (index > -1) this.annots[page][index] = annot;
          });
        then?.();
      }
    });
  }

  delete(annot: any, then?: () => void) {
    const api = `${this.apiUrl}/${this.groupId}/${annot.id}`;
    this.http.delete(api, { withCredentials: inSameOrigin(api) }).subscribe({
      next: (resp: any) => {
        annot.pages
          .filter(page => page in this.annots)
          .forEach(page => {
            const index = this.annots[page].indexOf(annot);
            if (index > -1) this.annots[page].splice(index, 1);
          });
        then?.();
      }
    });
  }
}
