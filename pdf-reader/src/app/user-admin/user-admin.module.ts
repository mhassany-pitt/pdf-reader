import { Input, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserAdminRoutingModule } from './user-admin.routing.module';
import { UserAdminComponent } from './user-admin.component';
import { FormsModule } from '@angular/forms';
import { UserAuthCtrlComponent } from '../user-auth-ctrl/user-auth-ctrl.component';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { SelectButtonModule } from 'primeng/selectbutton';
import { UserAdminService } from './user-admin.service';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { ChipsModule } from 'primeng/chips';

@NgModule({
  declarations: [
    UserAdminComponent
  ],
  imports: [
    CommonModule, FormsModule, RouterModule,
    UserAdminRoutingModule,
    UserAuthCtrlComponent,
    TableModule, ButtonModule,
    InputTextModule, DialogModule,
    InputTextareaModule, SelectButtonModule,
    SplitButtonModule, MultiSelectModule,
    ConfirmDialogModule, ChipsModule,
  ],
  providers: [UserAdminService, ConfirmationService]
})
export class UserAdminModule { }
