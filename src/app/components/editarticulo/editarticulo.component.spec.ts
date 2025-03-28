import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarticuloComponent } from './editarticulo.component';

describe('EditarticuloComponent', () => {
  let component: EditarticuloComponent;
  let fixture: ComponentFixture<EditarticuloComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditarticuloComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarticuloComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
