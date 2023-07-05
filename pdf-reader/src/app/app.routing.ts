import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthenticatedGuard } from './auth-guards/authenticated.guard';
import { PublicGuard } from './auth-guards/public.guard';
import { AuthenticatedAuthorGuard } from './auth-guards/authenticated-author.guard';
import { HandshakeGuard } from './auth-guards/handshake.guard';
import { AppAdminGuard } from './auth-guards/app-admin.guard';

const routes: Routes = [
  {
    path: 'unauthorized',
    loadChildren: () => import('./unauthorized-page/unauthorized-page.module').then(m => m.UnauthorizedPageModule)
  },
  {
    path: 'default-resource',
    loadComponent: () => import('./default-resource/default-resource.component').then(m => m.DefaultResourceComponent)
  },
  {
    path: 'pdf-documents',
    loadChildren: () => import('./pdf-documents/pdf-documents.module').then(m => m.PDFDocumentsModule),
    canActivate: [AuthenticatedAuthorGuard]
  },
  {
    path: 'pdf-reader',
    loadChildren: () => import('./pdf-reader/pdf-reader.module').then(m => m.PDFReaderModule),
    canActivate: [HandshakeGuard]
  },
  {
    path: 'iframe-integration-testground',
    loadChildren: () => import('./iframe-integration-testground/iframe-integration-testground.module').then(m => m.IframeIntegrationTestgroundModule),
    canActivate: [HandshakeGuard]
  },
  {
    path: 'user-admin',
    loadChildren: () => import('./user-admin/user-admin.module').then(m => m.UserAdminModule),
    canActivate: [AppAdminGuard]
  },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginModule),
    canActivate: [PublicGuard]
  },
  {
    path: 'update-password',
    loadChildren: () => import('./update-password/update-password.module').then(m => m.UpdatePasswordModule),
    canActivate: [HandshakeGuard]
  },
  { path: '**', redirectTo: 'pdf-documents' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRouting { }
