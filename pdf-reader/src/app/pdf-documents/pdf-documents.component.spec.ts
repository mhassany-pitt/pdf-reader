import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PDFDocumentsComponent } from './pdf-documents.component';

describe('PDFDocumentsComponent', () => {
  let component: PDFDocumentsComponent;
  let fixture: ComponentFixture<PDFDocumentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PDFDocumentsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PDFDocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
