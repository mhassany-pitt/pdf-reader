import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DocumentsRoutingModule } from './documents.routing.module';
import { DocumentsComponent } from './documents.component';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DocumentsService } from './documents.service';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    DocumentsComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    DocumentsRoutingModule,
    TableModule, InputTextModule,
    ButtonModule, TagModule,
  ],
  providers: [DocumentsService]
})
export class DocumentsModule { }
