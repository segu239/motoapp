import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewtipomonedaComponent } from './newtipomoneda.component';

describe('NewtipomonedaComponent', () => {
  let component: NewtipomonedaComponent;
  let fixture: ComponentFixture<NewtipomonedaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewtipomonedaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewtipomonedaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
