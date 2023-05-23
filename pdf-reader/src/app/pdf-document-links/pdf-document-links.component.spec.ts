import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PDFDocumentLinksComponent } from './pdf-document-links.component';

describe('PDFDocumentLinksComponent', () => {
  let component: PDFDocumentLinksComponent;
  let fixture: ComponentFixture<PDFDocumentLinksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PDFDocumentLinksComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PDFDocumentLinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
