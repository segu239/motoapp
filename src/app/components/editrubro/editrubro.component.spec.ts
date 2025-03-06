import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditrubroComponent } from './editrubro.component';

describe('EditrubroComponent', () => {
  let component: EditrubroComponent;
  let fixture: ComponentFixture<EditrubroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditrubroComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditrubroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
