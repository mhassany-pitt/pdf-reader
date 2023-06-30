import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { IframeIntegrationTestgroundRoutingModule } from './iframe-integration-testground.routing.module';
import { IframeIntegrationTestgroundComponent } from './iframe-integration-testground.component';

@NgModule({
  declarations: [
    IframeIntegrationTestgroundComponent
  ],
  imports: [
    CommonModule,
    IframeIntegrationTestgroundRoutingModule
  ]
})
export class IframeIntegrationTestgroundModule { }
