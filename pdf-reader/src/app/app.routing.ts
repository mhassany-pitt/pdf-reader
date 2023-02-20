import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: "collections", loadChildren: () => import('./collections/collections.module').then(m => m.CollectionsModule) },
  { path: "reader", loadChildren: () => import('./reader/reader.module').then(m => m.ReaderModule) },
  { path: '**', redirectTo: 'collections' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRouting { }
