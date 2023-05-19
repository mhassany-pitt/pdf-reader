import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocumentsComponent } from './documents.component';
import { DefaultResourceComponent } from '../default-resource/default-resource.component';

const routes: Routes = [
  { path: '', component: DocumentsComponent },
  { path: ':id', loadChildren: () => import('../document/document.module').then(m => m.DocumentModule) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DocumentsRoutingModule { }
