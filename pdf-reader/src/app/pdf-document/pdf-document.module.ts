import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DocumentRoutingModule } from './pdf-document.routing.module';
import { PDFDocumentComponent } from './pdf-document.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ChipsModule } from 'primeng/chips';
import { PDFDocumentService } from './pdf-document.service';

@NgModule({
  declarations: [
    PDFDocumentComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    DocumentRoutingModule,
    InputTextModule,
    ButtonModule,
    ChipsModule,
  ],
  providers: [PDFDocumentService]
})
export class PDFDocumentModule { }
