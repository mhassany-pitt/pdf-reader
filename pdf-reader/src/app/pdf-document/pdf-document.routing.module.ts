import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PDFDocumentComponent } from './pdf-document.component';

const routes: Routes = [
  { path: '', component: PDFDocumentComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DocumentRoutingModule { }
