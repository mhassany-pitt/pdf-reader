import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IframeIntegrationTestgroundComponent } from './iframe-integration-testground.component';

const routes: Routes = [
  { path: '', component: IframeIntegrationTestgroundComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class IframeIntegrationTestgroundRoutingModule { }
