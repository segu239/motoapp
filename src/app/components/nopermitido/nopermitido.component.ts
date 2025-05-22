import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-nopermitido',
  templateUrl: './nopermitido.component.html',
  styleUrls: ['./nopermitido.component.css']
})
export class NopermitidoComponent {

  constructor(
    private location: Location,
    private router: Router
  ) {}

  volverAtras(): void {
    this.location.back();
  }

}
