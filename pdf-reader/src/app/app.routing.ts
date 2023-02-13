import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: "reader", loadChildren: () => import('./reader/reader.module').then(m => m.ReaderModule) },
  { path: '**', redirectTo: 'reader' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRouting { }
