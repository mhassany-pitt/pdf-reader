import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PDFDocumentsComponent } from './pdf-documents.component';
import { DefaultResourceComponent } from '../default-resource/default-resource.component';

const routes: Routes = [
  { path: '', component: PDFDocumentsComponent },
  { path: ':id', loadChildren: () => import('../pdf-document/pdf-document.module').then(m => m.PDFDocumentModule) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DocumentsRoutingModule { }
