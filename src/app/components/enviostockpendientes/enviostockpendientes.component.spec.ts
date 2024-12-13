import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnviostockpendientesComponent } from './enviostockpendientes.component';

describe('EnviostockpendientesComponent', () => {
  let component: EnviostockpendientesComponent;
  let fixture: ComponentFixture<EnviostockpendientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnviostockpendientesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnviostockpendientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
