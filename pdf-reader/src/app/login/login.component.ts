import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less']
})
export class LoginComponent {

  model = { email: '', password: '' };

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  login() {
    const redirect = this.route.snapshot.queryParams['redirect_to'];
    this.http.post(`${environment.apiUrl}/auth/login`, this.model, { withCredentials: true }).subscribe({
      next: (resp: any) => {
        if (redirect)
          this.router.navigate([redirect]);
        else this.router.navigate(['/']);
      },
      error: (error: any) => {
        if (error.status == 401)
          alert(error.error.message);
        else alert('Login failed! try again, if this issue persists contact administrator.');
      }
    })
  }
}
