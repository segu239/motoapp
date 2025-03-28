import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdittipomonedaComponent } from './edittipomoneda.component';

describe('EdittipomonedaComponent', () => {
  let component: EdittipomonedaComponent;
  let fixture: ComponentFixture<EdittipomonedaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EdittipomonedaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EdittipomonedaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
