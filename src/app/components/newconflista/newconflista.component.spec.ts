import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewconflistaComponent } from './newconflista.component';

describe('NewconflistaComponent', () => {
  let component: NewconflistaComponent;
  let fixture: ComponentFixture<NewconflistaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewconflistaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewconflistaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
