import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
//import { CargardataService } from '../../services/cargardata.service';
import { SubirdataService } from 'src/app/services/subirdata.service';
import Swal from 'sweetalert2';


interface Rubro {
  cod_rubro: string;
  rubro: string;
  id_rubro_p: number;
}

@Component({
  selector: 'app-editrubroprincipal',
  templateUrl: './editrubroprincipal.component.html',
  styleUrls: ['./editrubroprincipal.component.css']
})
export class EditrubroprincipalComponent implements OnInit {
  rubroForm: FormGroup;
  currentRubro: Rubro | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    //private cargardataService: CargardataService
    private subirdataService: SubirdataService
  ) {
    this.rubroForm = new FormGroup({
      cod_rubro: new FormControl('', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ]{1,2}$/)
      ]),
      rubro: new FormControl('', [
        Validators.required,
        Validators.pattern(/^[a-zA-Z0-9\/-_,ñÑ]{1,30}$/)
       
      ]),
      id_rubro_p: new FormControl('')
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['rubro']) {
        this.currentRubro = JSON.parse(params['rubro']);
        this.rubroForm.patchValue(this.currentRubro);
      }
    });
  }

  onSubmit() {
    if (this.rubroForm.valid) {
      const rubroData = this.rubroForm.value;
      if (this.currentRubro?.id_rubro_p) {
        // Update existing rubro
        this.subirdataService.editarRubroPrincipal(rubroData.id_rubro_p, rubroData).subscribe({
          next: (response) => {
            Swal.fire({
              title: '¡Éxito!',
              text: 'El rubro se actualizó correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });
            console.log('Rubro updated successfully');
            this.router.navigate(['components/rubroprincipal']);
          },
          error: (error) => {
            Swal.fire({
              title: 'Error',
              text: 'Ocurrió un error al actualizar el rubro',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
            console.error('Error updating rubro:', error);
          }
        });
      } else {
        // Create new rubro
        this.subirdataService.editarRubroPrincipal(rubroData.id_rubro_p,rubroData).subscribe({
          next: (response) => {
            console.log('Rubro created successfully');
            this.router.navigate(['components/rubroprincipal']);
          },
          error: (error) => {
            console.error('Error creating rubro:', error);
          }
        });
      }
    }
  }

  onCancel() {
    this.router.navigate(['components/rubroprincipal']);
  }
}


/* import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CargardataService } from 'src/app/services/cargardata.service';
import { SubirdataService } from 'src/app/services/subirdata.service';

@Component({
  selector: 'app-editrubroprincipal',
  templateUrl: './editrubroprincipal.component.html',
  styleUrls: ['./editrubroprincipal.component.css']
})
export class EditrubroprincipalComponent {
  cod_rubro: string = '';
  rubro: string = '';
  id_rubro_p: number = 0;

  constructor(
    //private rubroPrincipalService: RubroPrincipalService,
    private cargardataService: CargardataService,
    private subirdataService: SubirdataService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    const rubro = this.activatedRoute.snapshot.params['rubro'];
    if (rubro.id_rubro_p) {
      this.cargardataService.obtenerRubroPrincipalPorId(rubro.id_rubro_p).subscribe(
        (data:any) => {
          this.cod_rubro = data.cod_rubro;
          this.rubro = data.rubro;
          this.id_rubro_p = data.id_rubro_p;
        }
      );
    }
  }

  onUpdate(): void {
    const rubro = this.activatedRoute.snapshot.params['rubro'];
    const rubroData = {
      cod_rubro: this.cod_rubro,
      rubro: this.rubro,
      id_rubro_p: this.id_rubro_p
    };
    this.subirdataService.editarRubroPrincipal(rubro.id_rubro_p, rubroData).subscribe(
      data => {
        this.router.navigate(['/rubroprincipal']);
      }
    );
  }

  onCancel(): void {
    this.router.navigate(['/rubroprincipal']);
  }
} */