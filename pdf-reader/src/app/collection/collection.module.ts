import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CollectionRoutingModule } from './collection.routing.module';
import { CollectionComponent } from './collection.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import {ChipsModule} from 'primeng/chips';

@NgModule({
  declarations: [
    CollectionComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    CollectionRoutingModule,
    InputTextModule,
    ButtonModule,
    ChipsModule,
  ]
})
export class CollectionModule { }
