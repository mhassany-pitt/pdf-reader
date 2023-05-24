import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class PDFReaderService {

  constructor(
    private http: HttpClient
  ) { }

  get(id: string) {
    return this.http.get(`${environment.apiUrl}/pdf-reader/${id}`, { withCredentials: true });
  }
}
