import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PDFDocumentsService } from './pdf-documents.service';
import { AppService } from '../app.service';

@Component({
  selector: 'app-pdf-documents',
  templateUrl: './pdf-documents.component.html',
  styleUrls: ['./pdf-documents.component.less']
})
export class PDFDocumentsComponent implements OnInit {

  pdfDocuments = [];

  includeArchives: boolean = false;

  constructor(
    private service: PDFDocumentsService,
    private router: Router,
    public app: AppService,
  ) { }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.service.list({ includeArchives: this.includeArchives }).subscribe({
      next: (pdfDocuments: any) => this.pdfDocuments = pdfDocuments
    });
  }

  create() {
    this.service.create().subscribe({
      next: (resp: any) => this.router.navigate(['/pdf-documents', resp.id]),
      error: (error: any) => { console.log(error) },
    })
  }

  toggleArchive(pdfDocument: any) {
    this.service.toggleArchive(pdfDocument.id).subscribe({
      next: (resp: any) => this.reload(),
      error: (error: any) => { console.log(error) },
    })
  }
}
