import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewproveedorComponent } from './newproveedor.component';

describe('NewproveedorComponent', () => {
  let component: NewproveedorComponent;
  let fixture: ComponentFixture<NewproveedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewproveedorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewproveedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
