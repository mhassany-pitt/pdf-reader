import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-unauthorized-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './unauthorized-page.component.html',
  styleUrls: ['./unauthorized-page.component.less']
})
export class UnauthorizedPageComponent { }

// TODO: in 403 page, add a link to the login page