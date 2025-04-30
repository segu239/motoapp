import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditcajamoviComponent } from './editcajamovi.component';

describe('EditcajamoviComponent', () => {
  let component: EditcajamoviComponent;
  let fixture: ComponentFixture<EditcajamoviComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditcajamoviComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditcajamoviComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
