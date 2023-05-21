import { TestBed } from '@angular/core/testing';

import { PDFDocumentsService } from './pdf-documents.service';

describe('PDFDocumentsService', () => {
  let service: PDFDocumentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PDFDocumentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
