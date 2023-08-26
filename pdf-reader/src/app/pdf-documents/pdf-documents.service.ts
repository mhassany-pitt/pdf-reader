import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PDFDocumentsService {

  constructor(
    private http: HttpClient,
  ) { }

  list({ includeArchives }) {
    return this.http.get(`${environment.apiUrl}/pdf-documents${includeArchives ? '?include-archives=true' : ''}`, { withCredentials: true });
  }

  create() {
    return this.http.post(`${environment.apiUrl}/pdf-documents`, {}, { withCredentials: true });
  }

  toggleArchive(id: string) {
    return this.http.patch(`${environment.apiUrl}/pdf-documents/${id}/archive`, {}, { withCredentials: true });
  }
}
