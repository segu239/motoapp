import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewrubroComponent } from './newrubro.component';

describe('NewrubroComponent', () => {
  let component: NewrubroComponent;
  let fixture: ComponentFixture<NewrubroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewrubroComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewrubroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
