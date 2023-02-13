import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReaderRouting } from './reader.routing';
import { ReaderComponent } from './reader.component';
import { PdfJsViewerModule } from 'ng2-pdfjs-viewer';

@NgModule({
  declarations: [
    ReaderComponent
  ],
  imports: [
    CommonModule,
    ReaderRouting,
    PdfJsViewerModule
  ]
})
export class ReaderModule { }
