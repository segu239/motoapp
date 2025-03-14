import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewartivaComponent } from './newartiva.component';

describe('NewartivaComponent', () => {
  let component: NewartivaComponent;
  let fixture: ComponentFixture<NewartivaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewartivaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewartivaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
