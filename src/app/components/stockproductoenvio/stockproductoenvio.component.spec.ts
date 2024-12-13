import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockproductoenvioComponent } from './stockproductoenvio.component';

describe('StockproductoenvioComponent', () => {
  let component: StockproductoenvioComponent;
  let fixture: ComponentFixture<StockproductoenvioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StockproductoenvioComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockproductoenvioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
