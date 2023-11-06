import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfPluginsManagementComponent } from './pdf-plugins-management.component';

describe('PdfPluginsManagementComponent', () => {
  let component: PdfPluginsManagementComponent;
  let fixture: ComponentFixture<PdfPluginsManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PdfPluginsManagementComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfPluginsManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
