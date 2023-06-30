import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IframeIntegrationTestgroundComponent } from './iframe-integration-testground.component';

describe('IframeIntegrationTestgroundComponent', () => {
  let component: IframeIntegrationTestgroundComponent;
  let fixture: ComponentFixture<IframeIntegrationTestgroundComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IframeIntegrationTestgroundComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IframeIntegrationTestgroundComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
