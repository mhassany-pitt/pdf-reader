import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DocumentRoutingModule } from './pdf-document.routing.module';
import { PDFDocumentComponent } from './pdf-document.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ChipsModule } from 'primeng/chips';
import { CheckboxModule } from 'primeng/checkbox';
import { ColorPickerModule } from 'primeng/colorpicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { PDFDocumentService } from './pdf-document.service';
import { PdfDocumentShareComponent } from './pdf-document-share/pdf-document-share.component';

@NgModule({
  declarations: [
    PDFDocumentComponent,
    PdfDocumentShareComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    DocumentRoutingModule,
    InputTextModule, InputNumberModule,
    ButtonModule, ChipsModule, DialogModule,
    InputSwitchModule, CheckboxModule,
    ColorPickerModule, MultiSelectModule
  ],
  providers: [PDFDocumentService]
})
export class PDFDocumentModule { }
