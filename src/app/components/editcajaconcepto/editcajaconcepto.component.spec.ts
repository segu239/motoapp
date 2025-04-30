import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditcajaconceptosComponent } from './editcajaconceptos.component';

describe('EditcajaconceptosComponent', () => {
  let component: EditcajaconceptosComponent;
  let fixture: ComponentFixture<EditcajaconceptosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditcajaconceptosComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditcajaconceptosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
