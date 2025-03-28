import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditconflistaComponent } from './editconflista.component';

describe('EditconflistaComponent', () => {
  let component: EditconflistaComponent;
  let fixture: ComponentFixture<EditconflistaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditconflistaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditconflistaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
