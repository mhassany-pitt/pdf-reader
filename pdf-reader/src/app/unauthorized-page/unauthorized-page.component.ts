import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AppService } from '../app.service';

@Component({
  selector: 'app-unauthorized-page',
  standalone: true,
  imports: [CommonModule, ButtonModule, RouterModule],
  templateUrl: './unauthorized-page.component.html',
  styleUrls: ['./unauthorized-page.component.less']
})
export class UnauthorizedPageComponent {
  constructor(public app: AppService) { }
}