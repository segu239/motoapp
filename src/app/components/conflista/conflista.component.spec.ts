import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConflistaComponent } from './conflista.component';

describe('ConflistaComponent', () => {
  let component: ConflistaComponent;
  let fixture: ComponentFixture<ConflistaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConflistaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConflistaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
