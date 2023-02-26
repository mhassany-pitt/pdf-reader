import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DocumentsService } from './documents.service';

@Component({
  selector: 'app-documents',
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.less']
})
export class DocumentsComponent implements OnInit {

  documents = [
    { id: '123', name: 'Chapter 1 - ...', modified_at: new Date() }
  ]

  constructor(
    private service: DocumentsService,
    private router: Router,
  ) { }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  ngOnInit(): void {
    this.service.list().subscribe({
      next: (documents: any) => this.documents = documents,
      error: (error: any) => console.log(error)
    });
  }

  create($event: any) {
    const files = $event.target.files;

    if (files.length < 1)
      return;

    this.service.create(files[0]).subscribe({
      next: (resp: any) => {
        this.router.navigate(['/documents', resp.id])
      },
      error: (error: any) => { console.log(error) },
    })
  }
}