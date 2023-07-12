import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IframeIntegrationTestgroundRoutingModule } from './iframe-integration-testground.routing.module';
import { IframeIntegrationTestgroundComponent } from './iframe-integration-testground.component';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@NgModule({
  declarations: [
    IframeIntegrationTestgroundComponent
  ],
  imports: [
    CommonModule, FormsModule, InputTextModule,
    IframeIntegrationTestgroundRoutingModule
  ]
})
export class IframeIntegrationTestgroundModule { }
