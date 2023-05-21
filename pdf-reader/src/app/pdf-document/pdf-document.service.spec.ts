import { TestBed } from '@angular/core/testing';

import { PDFDocumentService } from './pdf-document.service';

describe('PDFDocumentService', () => {
  let service: PDFDocumentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PDFDocumentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
