import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DocumentRoutingModule } from './document.routing.module';
import { DocumentComponent } from './document.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ChipsModule } from 'primeng/chips';
import { DocumentService } from './document.service';

@NgModule({
  declarations: [
    DocumentComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    DocumentRoutingModule,
    InputTextModule,
    ButtonModule,
    ChipsModule,
  ],
  providers: [DocumentService]
})
export class DocumentModule { }
