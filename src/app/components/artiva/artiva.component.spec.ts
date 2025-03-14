import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArtivaComponent } from './artiva.component';

describe('ArtivaComponent', () => {
  let component: ArtivaComponent;
  let fixture: ComponentFixture<ArtivaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ArtivaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArtivaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
