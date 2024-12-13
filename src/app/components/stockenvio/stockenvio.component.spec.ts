import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockenvioComponent } from './stockenvio.component';

describe('StockenvioComponent', () => {
  let component: StockenvioComponent;
  let fixture: ComponentFixture<StockenvioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StockenvioComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockenvioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
