import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'default-resource', loadComponent: () => import('./default-resource/default-resource.component').then(m => m.DefaultResourceComponent) },
  { path: 'pdf-documents', loadChildren: () => import('./pdf-documents/pdf-documents.module').then(m => m.PDFDocumentsModule) },
  { path: 'pdf-reader', loadChildren: () => import('./pdf-reader/pdf-reader.module').then(m => m.PDFReaderModule) },
  { path: '**', redirectTo: 'pdf-documents' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRouting { }
