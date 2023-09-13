import { HttpClient } from "@angular/common/http";
import { inSameOrigin, qparamsToString } from "./pdfjs-utils";
import { firstValueFrom } from "rxjs";

export class Annotations {

  enabled = true;
  private userId: () => string;
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

  constructor({ userId, apiUrl, http, groupId, pdfjs }) {
    this.userId = userId;
    this.apiUrl = apiUrl;
    this.http = http;
    this.groupId = groupId;

    this.pdfjs = pdfjs;

    this.pdfjs.eventBus.on('pagerendered', ($event: any) => this.loadPageAnnotations($event.pageNumber));
    this.pdfjs.eventBus.on('pagesdestroy', ($event: any) => delete this.annots[$event.pageNumber]);
  }

  list() { return this._annots; }

  read(id: string) {
    return this._annots.filter(a => a.id == id)[0];
  }

  async reload() {
    Object.keys(this.annots).map(k => parseInt(k)).forEach(pageNum => this.loadPageAnnotations(pageNum));
  }

  private async loadPageAnnotations(pageNum: number) {
    if (pageNum in this.annots == false)
      this.annots[pageNum] = await this.loadAnnotations({ ...this.qparams, pages: pageNum });

    if (this.annots[pageNum])
      this.pdfjs.eventBus.dispatch('pageannotationsloaded', { pageNumber: pageNum });
  }

  private async getUserId() {
    // use guest:id if user is not logged in
    // use qparams.user_id if user_id passed through query params
    const user_id = await this.userId();
    return user_id ? { user_id } : {};
  }

  async loadAnnotations(qparams: any) {
    if (this.enabled) try {
      const api = `${this.apiUrl}/${this.groupId}?${qparamsToString({ ...qparams, ...await this.getUserId() })}`;
      const req = this.http.get(api, { withCredentials: inSameOrigin(api) });
      return await firstValueFrom(req) as any;
    } catch (error) { console.error(error); }
    return [];
  }

  async create(annot: any, then?: () => void) {
    const api = `${this.apiUrl}/${this.groupId}?${qparamsToString(await this.getUserId())}`;
    this.http.post(api, annot, { withCredentials: inSameOrigin(api) }).subscribe({
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

  async update(annot: any, then?: () => void) {
    const api = `${this.apiUrl}/${this.groupId}/${annot.id}?${qparamsToString(await this.getUserId())}`;
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

  async delete(annot: any, then?: () => void) {
    const api = `${this.apiUrl}/${this.groupId}/${annot.id}?${qparamsToString(await this.getUserId())}`;
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
