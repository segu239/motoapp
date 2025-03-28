import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditvalorcambioComponent } from './editvalorcambio.component';

describe('EditvalorcambioComponent', () => {
  let component: EditvalorcambioComponent;
  let fixture: ComponentFixture<EditvalorcambioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditvalorcambioComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditvalorcambioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
