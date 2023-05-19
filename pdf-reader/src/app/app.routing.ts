import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: 'default-resource', loadComponent: () => import('./default-resource/default-resource.component').then(m => m.DefaultResourceComponent) },
  { path: 'documents', loadChildren: () => import('./documents/documents.module').then(m => m.DocumentsModule) },
  { path: 'reader', loadChildren: () => import('./reader/reader.module').then(m => m.ReaderModule) },
  { path: '**', redirectTo: 'documents' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRouting { }
