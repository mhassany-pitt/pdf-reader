import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PDFDocumentService {

  constructor(
    private http: HttpClient
  ) { }

  get(id: string) {
    return this.http.get(`${environment.apiUrl}/pdf-documents/${id}`, { withCredentials: true });
  }

  update(pdfDocument: any) {
    return this.http.patch(`${environment.apiUrl}/pdf-documents/${pdfDocument.id}`, pdfDocument, { withCredentials: true });
  }

  upload(id: string, file: any) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${environment.apiUrl}/pdf-documents/${id}/file`, form, { withCredentials: true });
  }

  updateTextLocations(id: string, texts: any) {
    return this.http.post(`${environment.apiUrl}/pdf-documents/${id}/text-locations`, texts, { withCredentials: true });
  }
}
