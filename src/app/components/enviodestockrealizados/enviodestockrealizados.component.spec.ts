import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnviodestockrealizadosComponent } from './enviodestockrealizados.component';

describe('EnviodestockrealizadosComponent', () => {
  let component: EnviodestockrealizadosComponent;
  let fixture: ComponentFixture<EnviodestockrealizadosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnviodestockrealizadosComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnviodestockrealizadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
