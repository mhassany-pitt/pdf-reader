import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReaderRouting } from './reader.routing';
import { ReaderComponent } from './reader.component';
import { ReaderService } from './reader.service';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    ReaderComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReaderRouting,
    DropdownModule,
  ],
  providers: [ReaderService]
})
export class ReaderModule { }
