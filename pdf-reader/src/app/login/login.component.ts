import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less']
})
export class LoginComponent {

  credentials = { email: '', password: '' };

  constructor(
    private http: HttpClient,
    private router: Router,
  ) { }

  login() {
    this.http.post(`${environment.apiUrl}/auth/login`, this.credentials, { withCredentials: true }).subscribe({
      next: (resp: any) => this.router.navigate(['/']),
      error: (error: any) => alert('Login failed! try again, if this issue persists contact administrator.')
    })
  }
}
