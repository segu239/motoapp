import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewarticuloComponent } from './newarticulo.component';

describe('NewarticuloComponent', () => {
  let component: NewarticuloComponent;
  let fixture: ComponentFixture<NewarticuloComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewarticuloComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewarticuloComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
