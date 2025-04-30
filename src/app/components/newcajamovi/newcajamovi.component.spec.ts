import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewcajamoviComponent } from './newcajamovi.component';

describe('NewcajamoviComponent', () => {
  let component: NewcajamoviComponent;
  let fixture: ComponentFixture<NewcajamoviComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewcajamoviComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewcajamoviComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
