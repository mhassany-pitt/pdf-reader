import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PDFReaderRouting } from './pdf-reader.routing';
import { PDFReaderComponent } from './pdf-reader.component';
import { PDFReaderService } from './pdf-reader.service';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    PDFReaderComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    PDFReaderRouting,
    DropdownModule,
  ],
  providers: [PDFReaderService]
})
export class PDFReaderModule { }
