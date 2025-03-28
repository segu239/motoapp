import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditproveedoresComponent } from './editproveedores.component';

describe('EditproveedoresComponent', () => {
  let component: EditproveedoresComponent;
  let fixture: ComponentFixture<EditproveedoresComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditproveedoresComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditproveedoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
