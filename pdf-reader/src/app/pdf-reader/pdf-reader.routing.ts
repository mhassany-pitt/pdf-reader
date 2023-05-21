import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PDFReaderComponent } from './pdf-reader.component';

const routes: Routes = [
  { path: ':id', component: PDFReaderComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PDFReaderRouting { }
