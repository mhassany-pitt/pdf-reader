import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PDFDocumentsService } from './pdf-documents.service';

@Component({
  selector: 'app-pdf-documents',
  templateUrl: './pdf-documents.component.html',
  styleUrls: ['./pdf-documents.component.less']
})
export class PDFDocumentsComponent implements OnInit {

  pdfDocuments = [
    { id: '123', name: 'Chapter 1 - ...', modified_at: new Date() }
  ]

  constructor(
    private service: PDFDocumentsService,
    private router: Router,
  ) { }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (pdfDocuments: any) => this.pdfDocuments = pdfDocuments,
      error: (error: any) => console.log(error)
    });
  }

  create($event: any) {
    const files = $event.target.files;

    if (files.length < 1)
      return;

    this.service.create(files[0]).subscribe({
      next: (resp: any) => {
        this.router.navigate(['/pdf-documents', resp.id])
      },
      error: (error: any) => { console.log(error) },
    })
  }
}