import { firstValueFrom } from "rxjs";
import { PdfRegistry } from "./pdf-registry";
import { isSameOrigin, qparamsToString } from "./pdf-utils";
import { environment } from "src/environments/environment";

export class PdfStorage {

  private registry: PdfRegistry;

  enabled = true;

  private annots: any = {};
  private get _annots() {
    return Object.values(this.annots)
      .reduce((arr: any[], annot: any) =>
        arr.concat(annot), []);
  }

  qparams: { [key: string]: string } = {};

  constructor({ registry }) {
    this.registry = registry;

    this.registry.register('storage', this);
    this.registry.register(`configs.default.storage`, () => PdfStorage.defaultConfigs());

    this._getPdfJS().eventBus.on('pagerendered', ($event: any) => this.loadPageAnnotations($event.pageNumber));
    this._getPdfJS().eventBus.on('pagesdestroy', ($event: any) => delete this.annots[$event.pageNumber]);
  }

  protected _configs() { return this.registry.get(`configs.storage`); }
  static defaultConfigs() {
    return { apiUrl: `${environment.apiUrl}/annotations` };
  }

  private _getPdfJS() { return this.registry.getPdfJS(); }
  private _getPdfDocId() { return this.registry.get('pdfDocId'); }
  private async getUserId() {
    const apiUrl = this._configs()?.apiUrl;
    const user_id = apiUrl && !isSameOrigin(apiUrl) ? this.registry.get('userId') : null;
    return user_id ? { user_id } : {};
  }

  list() { return this._annots; }
  read(id: string) { return this._annots.filter(a => a.id == id)[0]; }

  private _apiUrl() {
    const apiUrl = this._configs()?.apiUrl || `${environment.apiUrl}/annotations`;
    return `${apiUrl}/${this._getPdfDocId()}`;
  }

  async loadAnnotations(qparams: any) {
    if (this.enabled) try {
      const api = `${this._apiUrl()}?${qparamsToString({ ...qparams, ...await this.getUserId() })}`;
      const req: any = this.registry.get('http').get(api, { withCredentials: isSameOrigin(api) });
      return await firstValueFrom(req);
    } catch (error) { console.error(error); }
    return [];
  }

  private async loadPageAnnotations(pageNum: number) {
    if (pageNum in this.annots == false)
      this.annots[pageNum] = await this.loadAnnotations({ ...this.qparams, pages: pageNum });

    if (this.annots[pageNum])
      this._getPdfJS().eventBus.dispatch('pageannotationsloaded', { pageNumber: pageNum });
  }

  async reload() {
    for (const pageNum of Object.keys(this.annots))
      await this.loadPageAnnotations(parseInt(pageNum));
  }

  async create(annot: any, then?: () => void) {
    try {
      const api = `${this._apiUrl()}?${qparamsToString(await this.getUserId())}`;
      const req = this.registry.get('http').post(api, annot, { withCredentials: isSameOrigin(api) });
      const resp: any = await firstValueFrom(req);
      annot.id = resp.id;
      annot.pages.forEach(page => {
        if (page in this.annots == false)
          this.annots[page] = [];
        this.annots[page].push(annot);
      });
      then?.();
    } catch (error) { console.error(error); }
  }

  async update(annot: any, then?: () => void) {
    try {
      const api = `${this._apiUrl()}/${annot.id}?${qparamsToString(await this.getUserId())}`;
      const req = this.registry.get('http').patch(api, annot, { withCredentials: isSameOrigin(api) });
      await firstValueFrom(req);
      annot.pages
        .filter(page => page in this.annots)
        .forEach(page => {
          const index = this.annots[page].indexOf(annot);
          if (index > -1) this.annots[page][index] = annot;
        });
      then?.();
    } catch (error) { console.error(error); }
  }

  async delete(annot: any, then?: () => void) {
    try {
      const api = `${this._apiUrl()}/${annot.id}?${qparamsToString(await this.getUserId())}`;
      const req = this.registry.get('http').delete(api, { withCredentials: isSameOrigin(api) });
      await firstValueFrom(req);
      annot.pages
        .filter(page => page in this.annots)
        .forEach(page => {
          const index = this.annots[page].indexOf(annot);
          if (index > -1) this.annots[page].splice(index, 1);
        });
      then?.();
    } catch (error) { console.error(error); }
  }
}
