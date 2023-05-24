import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRouting } from './app.routing';
import { AppComponent } from './app.component';
import { AuthenticatedAuthorGuard } from './auth-guards/authenticated-author.guard';
import { AuthenticatedGuard } from './auth-guards/authenticated.guard';
import { PublicGuard } from './auth-guards/public.guard';
import { AppService } from './app.service';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRouting, HttpClientModule,
  ],
  providers: [
    AppService,
    AuthenticatedAuthorGuard,
    AuthenticatedGuard,
    PublicGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
