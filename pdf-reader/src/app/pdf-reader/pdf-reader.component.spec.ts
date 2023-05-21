import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PDFReaderComponent } from './pdf-reader.component';

describe('PDFReaderComponent', () => {
  let component: PDFReaderComponent;
  let fixture: ComponentFixture<PDFReaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PDFReaderComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PDFReaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
