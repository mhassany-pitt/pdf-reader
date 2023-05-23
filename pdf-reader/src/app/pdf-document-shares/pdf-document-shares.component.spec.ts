import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PDFDocumentSharesComponent } from './pdf-document-shares.component';

describe('PDFDocumentSharesComponent', () => {
  let component: PDFDocumentSharesComponent;
  let fixture: ComponentFixture<PDFDocumentSharesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PDFDocumentSharesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PDFDocumentSharesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
