import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PDFDocumentComponent } from './pdf-document.component';

describe('PDFDocumentComponent', () => {
  let component: PDFDocumentComponent;
  let fixture: ComponentFixture<PDFDocumentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PDFDocumentComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PDFDocumentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
