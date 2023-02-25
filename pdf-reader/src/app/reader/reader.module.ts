import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReaderRouting } from './reader.routing';
import { ReaderComponent } from './reader.component';

@NgModule({
  declarations: [
    ReaderComponent
  ],
  imports: [
    CommonModule,
    ReaderRouting,
  ]
})
export class ReaderModule { }
