import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NopermitidoComponent } from './nopermitido.component';

describe('NopermitidoComponent', () => {
  let component: NopermitidoComponent;
  let fixture: ComponentFixture<NopermitidoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NopermitidoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NopermitidoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
