import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValorcambioComponent } from './valorcambio.component';

describe('ValorcambioComponent', () => {
  let component: ValorcambioComponent;
  let fixture: ComponentFixture<ValorcambioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ValorcambioComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValorcambioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
