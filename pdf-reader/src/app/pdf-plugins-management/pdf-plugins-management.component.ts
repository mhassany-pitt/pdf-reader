import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { environment } from 'src/environments/environment';

@Component({
  standalone: true,
  imports: [
    CommonModule, FormsModule, HttpClientModule,
    ButtonModule, InputTextareaModule,
  ],
  selector: 'app-pdf-plugins-management',
  templateUrl: './pdf-plugins-management.component.html',
  styleUrls: ['./pdf-plugins-management.component.less']
})
export class PDFPluginsManagementComponent implements OnInit {

  @Output() close = new EventEmitter();

  updating = false;
  plugins: string = '';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.http.get(`${environment.apiUrl}/preferences/plugins-default`, { withCredentials: true }).subscribe({
      next: (plugins: any) => this.plugins = plugins.value,
      error: (error) => console.error(error)
    });
  }

  update(form: any) {
    this.http.patch(`${environment.apiUrl}/preferences`, {
      key: 'plugins-default',
      value: this.plugins
    }, { withCredentials: true }).subscribe({
      next: (plugins) => this.close.emit(),
      error: (error) => console.error(error)
    });
  }
}
