import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DocumentsRoutingModule } from './pdf-documents.routing.module';
import { PDFDocumentsComponent } from './pdf-documents.component';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PDFDocumentsService } from './pdf-documents.service';
import { RouterModule } from '@angular/router';
import { UserAuthCtrlComponent } from '../user-auth-ctrl/user-auth-ctrl.component';

@NgModule({
  declarations: [
    PDFDocumentsComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    DocumentsRoutingModule,
    TableModule, InputTextModule,
    ButtonModule, TagModule,
    UserAuthCtrlComponent,
  ],
  providers: [PDFDocumentsService]
})
export class PDFDocumentsModule { }
