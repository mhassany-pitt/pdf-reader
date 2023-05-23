import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfDocumentShareComponent } from './pdf-document-share.component';

describe('PdfDocumentShareComponent', () => {
  let component: PdfDocumentShareComponent;
  let fixture: ComponentFixture<PdfDocumentShareComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PdfDocumentShareComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfDocumentShareComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
