import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockreciboComponent } from './stockrecibo.component';

describe('StockreciboComponent', () => {
  let component: StockreciboComponent;
  let fixture: ComponentFixture<StockreciboComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StockreciboComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockreciboComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
