import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditmarcaComponent } from './editmarca.component';

describe('EditmarcaComponent', () => {
  let component: EditmarcaComponent;
  let fixture: ComponentFixture<EditmarcaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditmarcaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditmarcaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
