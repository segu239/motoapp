import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TipomonedaComponent } from './tipomoneda.component';

describe('TipomonedaComponent', () => {
  let component: TipomonedaComponent;
  let fixture: ComponentFixture<TipomonedaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TipomonedaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TipomonedaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
