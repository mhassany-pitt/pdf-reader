import { Component } from '@angular/core';
import { UserAdminService } from './user-admin.service';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-user-admin',
  templateUrl: './user-admin.component.html',
  styleUrls: ['./user-admin.component.less']
})
export class UserAdminComponent {

  actions = [
    { label: 'Update Roles', icon: 'pi pi-shield', command: () => this.dialog = 'update-role' },
    { separator: true },
    { label: 'Activate', icon: 'pi pi-check', command: () => this.confirm(() => this.toggle(true)) },
    { label: 'Deactive', icon: 'pi pi-ban', command: () => this.confirm(() => this.toggle(false)) },
    { label: 'Delete', icon: 'pi pi-trash', command: () => this.confirm(() => this.removeUsers()) },
  ];

  dialog: 'create' | 'update-role' | boolean = false;
  model: any = {};

  users = [];
  selected: any[] = [];

  constructor(
    private router: Router,
    private service: UserAdminService,
    private confirmService: ConfirmationService,
  ) { }

  filter(table: any, $event: any) {
    table.filterGlobal($event.target.value, 'contains');
  }

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.service.list().subscribe({
      next: (users: any) => this.users = users
    });
  }

  createUsers() {
    this.service.create(this.model).subscribe({
      next: (resp: any) => {
        this.dialog = false;
        this.model = {};
        this.reload();
      },
      error: (error: any) => { console.log(error) },
    })
  }

  confirm(then: () => void) {
    this.confirmService.confirm({
      message: 'Are you sure that you want to proceed?',
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => then()
    });
  }

  updateRoles() {
    const data = this.selected
      .map(obj => ({ ...obj, roles: this.model.roles }))
      .filter(obj => !obj.itIsMe);
    this.service.update({ action: 'update', data }).subscribe({
      next: (resp: any) => {
        this.dialog = false;
        this.model = {};
        this.reload();
      },
      error: (error: any) => { console.log(error) },
    });
  }

  toggle(active) {
    const data = this.selected
      .map(obj => ({ ...obj, active }))
      .filter(obj => !obj.itIsMe);
    this.service.update({ action: 'update', data }).subscribe({
      next: (resp: any) => {
        this.dialog = false;
        this.model = {};
        this.reload();
      },
      error: (error: any) => { console.log(error) },
    });
  }

  removeUsers() {
    const data = this.selected
      .filter(obj => !obj.itIsMe)
      .map(obj => obj.email);
    this.service.update({ action: 'delete', data }).subscribe({
      next: (resp: any) => this.reload(),
      error: (error: any) => { console.log(error) },
    });
  }
}