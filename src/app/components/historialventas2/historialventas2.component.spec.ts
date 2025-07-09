import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Historialventas2Component } from './historialventas2.component';

describe('Historialventas2Component', () => {
  let component: Historialventas2Component;
  let fixture: ComponentFixture<Historialventas2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Historialventas2Component ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Historialventas2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});