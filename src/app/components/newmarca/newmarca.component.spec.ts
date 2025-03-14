import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewmarcaComponent } from './newmarca.component';

describe('NewmarcaComponent', () => {
  let component: NewmarcaComponent;
  let fixture: ComponentFixture<NewmarcaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewmarcaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewmarcaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
