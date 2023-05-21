import { TestBed } from '@angular/core/testing';

import { PDFReaderService } from './pdf-reader.service';

describe('PDFReaderService', () => {
  let service: PDFReaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PDFReaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
