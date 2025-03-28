import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewvalorcambioComponent } from './newvalorcambio.component';

describe('NewvalorcambioComponent', () => {
  let component: NewvalorcambioComponent;
  let fixture: ComponentFixture<NewvalorcambioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewvalorcambioComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewvalorcambioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
