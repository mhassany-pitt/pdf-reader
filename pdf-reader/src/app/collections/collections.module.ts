import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CollectionsRoutingModule } from './collections.routing.module';
import { CollectionsComponent } from './collections.component';

import { TableModule } from 'primeng/table';

@NgModule({
  declarations: [
    CollectionsComponent
  ],
  imports: [
    CommonModule,
    CollectionsRoutingModule,
    TableModule
  ]
})
export class CollectionsModule { }
