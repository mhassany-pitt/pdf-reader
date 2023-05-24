import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PDFDocumentsService {

  constructor(
    private http: HttpClient,
  ) { }

  list() {
    return this.http.get(`${environment.apiUrl}/pdf-documents`, { withCredentials: true });
  }

  create(file: any) {
    const form = new FormData();
    form.append('file', file);

    return this.http.post(`${environment.apiUrl}/pdf-documents`, form, { withCredentials: true });
  }
}
