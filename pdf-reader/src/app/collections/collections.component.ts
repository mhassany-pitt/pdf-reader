import { Component } from '@angular/core';

@Component({
  selector: 'app-collections',
  templateUrl: './collections.component.html',
  styleUrls: ['./collections.component.less']
})
export class CollectionsComponent {

  collections = [
    { id: '123', name: 'Chapter 1 - ...', modified_at: new Date() }
  ]
}
