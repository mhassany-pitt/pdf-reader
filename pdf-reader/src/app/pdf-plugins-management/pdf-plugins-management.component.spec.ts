import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PDFPluginsManagementComponent } from './pdf-plugins-management.component';

describe('PDFPluginsManagementComponent', () => {
  let component: PDFPluginsManagementComponent;
  let fixture: ComponentFixture<PDFPluginsManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PDFPluginsManagementComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PDFPluginsManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
