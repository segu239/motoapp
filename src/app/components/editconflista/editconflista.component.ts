import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SubirdataService } from '../../services/subirdata.service';
import { CargardataService } from '../../services/cargardata.service';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editconflista',
  templateUrl: './editconflista.component.html',
  styleUrls: ['./editconflista.component.css']
})
export class EditconflistaComponent implements OnInit {
  public conflistaForm!: FormGroup;
  public listapFlag: boolean = false;
  public currentConflista: any = null;
  private id_conflista: number = 0;
  public tiposMoneda: any[] = [];
  public marcas: any[] = [];
  private originalPreciof21: number = 0;
  private originalPreciof105: number = 0;

  constructor(
    private subirdata: SubirdataService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private cargardata: CargardataService,
  ) {}

  ngOnInit(): void {
    this.initForm(); // Initialize form first
    this.cargarTiposMoneda();
    this.cargarMarcas();
    this.loadConflistaData(); // Load data after form is initialized
  }

  cargarTiposMoneda() {
    this.cargardata.getTipoMoneda().subscribe({
      next: (response: any) => {
        if (!response.error) {
          this.tiposMoneda = response.mensaje;
          console.log('Tipos de moneda cargados:', this.tiposMoneda);
        } else {
          console.error('Error loading tipos de moneda:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  cargarMarcas() {
    this.cargardata.getMarca().subscribe({
      next: (response: any) => {
        if (!response.error) {
          // Trim the values in the marcas array
          this.marcas = response.mensaje.map((marca: any) => {
            return {
              ...marca,
              cod_marca: marca.cod_marca.trim(),
              marca: marca.marca.trim()
            };
          });
          
          console.log('Marcas cargadas (trimmed):', this.marcas);
          
          // Debug marca values if currentConflista is already loaded
          if (this.currentConflista && this.currentConflista.cod_marca) {
            const trimmedCodMarca = this.currentConflista.cod_marca.trim();
            console.log('Current cod_marca (trimmed):', trimmedCodMarca);
            console.log('Marca matching trimmed cod_marca:', 
              this.marcas.find(m => m.cod_marca === trimmedCodMarca));
          }
        } else {
          console.error('Error loading marcas:', response.mensaje);
        }
      },
      error: (error) => {
        console.error('Error in API call:', error);
      }
    });
  }

  initForm(): void {
    this.conflistaForm = this.fb.group({
      listap: new FormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/^[0-9]{1,4}$/)
      ])),
      activa: new FormControl(false),
      precosto21: new FormControl(0, Validators.required),
      precosto105: new FormControl(0, Validators.required),
      pordcto: new FormControl(0, Validators.required),
      margen: new FormControl(0, Validators.required),
      preciof21: new FormControl(0, Validators.required),
      preciof105: new FormControl(0, Validators.required),
      rmargen: new FormControl(false),
      tipomone: new FormControl('', Validators.required),
      actprov: new FormControl(false),
      cod_marca: new FormControl('', Validators.required),
      fecha: new FormControl('', Validators.required)
    });

    this.monitorFormChanges();
  }

  loadConflistaData(): void {
    this.route.queryParams.subscribe(params => {
      console.log('Query params:', params);
      if (params['conflista']) {
        try {
          const conflistaData = JSON.parse(params['conflista']);
          this.id_conflista = conflistaData.id_conflista;
          console.log('ID Conflista:', this.id_conflista);
          this.currentConflista = conflistaData;
          // Guardar valores originales
          this.originalPreciof21 = conflistaData.preciof21;
          this.originalPreciof105 = conflistaData.preciof105;
          
          console.log('Current Conflista Data:', this.currentConflista);
          console.log('Raw activa value from backend:', this.currentConflista.activa);
          console.log('Raw rmargen value from backend:', this.currentConflista.rmargen);
          console.log('Raw actprov value from backend:', this.currentConflista.actprov);
          
          // Transform date to YYYY-MM-DD
          const fechaStr = this.currentConflista.fecha ? 
            new Date(this.currentConflista.fecha).toISOString().split('T')[0] : 
            '';
          
          // Fix: Convert string values to boolean values - handle 't' as true
          const activaValue = this.currentConflista.activa === 't' || 
                             this.currentConflista.activa === 'Si' || 
                             this.currentConflista.activa === true;
          const rmargenValue = this.currentConflista.rmargen === 't' || 
                              this.currentConflista.rmargen === 'Si' || 
                              this.currentConflista.rmargen === true;
          const actprovValue = this.currentConflista.actprov === 't' || 
                              this.currentConflista.actprov === 'Si' || 
                              this.currentConflista.actprov === true;
          
          console.log('Converted boolean values:', { activaValue, rmargenValue, actprovValue });
          
          // Use setTimeout to ensure the form controls are ready
          setTimeout(() => {
            console.log('Form before patch:', this.conflistaForm.value);
            
            // Set each form control value individually
            this.conflistaForm.get('listap')?.setValue(this.currentConflista.listap);
            this.conflistaForm.get('activa')?.setValue(activaValue);
            this.conflistaForm.get('precosto21')?.setValue(this.currentConflista.precosto21);
            this.conflistaForm.get('precosto105')?.setValue(this.currentConflista.precosto105);
            this.conflistaForm.get('pordcto')?.setValue(this.currentConflista.pordcto);
            this.conflistaForm.get('margen')?.setValue(this.currentConflista.margen);
            this.conflistaForm.get('preciof21')?.setValue(this.currentConflista.preciof21);
            this.conflistaForm.get('preciof105')?.setValue(this.currentConflista.preciof105);
            this.conflistaForm.get('rmargen')?.setValue(rmargenValue);
            this.conflistaForm.get('tipomone')?.setValue(this.currentConflista.tipomone);
            this.conflistaForm.get('tipomone')?.disable();
            this.conflistaForm.get('actprov')?.setValue(actprovValue);
            this.conflistaForm.get('cod_marca')?.setValue(this.currentConflista.cod_marca ? this.currentConflista.cod_marca.trim() : '');
            this.conflistaForm.get('fecha')?.setValue(fechaStr);
            
            console.log('Form values after individual sets:', this.conflistaForm.value);
            console.log('Form control activa value:', this.conflistaForm.get('activa')?.value);
            console.log('Form control rmargen value:', this.conflistaForm.get('rmargen')?.value);
            console.log('Form control actprov value:', this.conflistaForm.get('actprov')?.value);
            console.log('Form control cod_marca value:', this.conflistaForm.get('cod_marca')?.value);
            
            // Force change detection
            setTimeout(() => {
              console.log('Form values after change detection:', this.conflistaForm.value);
            }, 100);
          }, 0);
        } catch (error) {
          console.error('Error parsing conflista data:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo cargar la información de la conflista',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }

  onSubmit(): void {
    if (this.conflistaForm.valid) {
      const formValues = this.conflistaForm.value;
      
      // Verificar si se modificaron los precios
      const preciof21Changed = formValues.preciof21 !== this.originalPreciof21;
      const preciof105Changed = formValues.preciof105 !== this.originalPreciof105;
      
      const conflistaData = {
        id_conflista: this.id_conflista,
        listap: formValues.listap,
        // Convert boolean values back to 't'/'f' for the API
        activa: formValues.activa ? 't' : 'f',
        precosto21: formValues.precosto21,
        precosto105: formValues.precosto105,
        pordcto: formValues.pordcto,
        margen: formValues.margen,
        preciof21: formValues.preciof21,
        preciof105: formValues.preciof105,
        rmargen: formValues.rmargen ? 't' : 'f',
        tipomone: formValues.tipomone,
        actprov: formValues.actprov ? 't' : 'f',
        cod_marca: formValues.cod_marca,
        fecha: formValues.fecha,
        // Solo recalcular si se modificaron los precios
        //recalcular_precios: preciof21Changed || preciof105Changed
        recalcular_21: preciof21Changed,
        recalcular_105: preciof105Changed
      };

      this.subirdata.updateConflista(conflistaData).subscribe((response: any) => {
        console.log('conflistaData:', conflistaData);
        Swal.fire({
          title: 'Actualizando...',
          timer: 300,
          didOpen: () => {
            Swal.showLoading();
          }
        }).then((result) => {
          console.log('result:', result);
          console.log('response:', response);
          if (result.dismiss === Swal.DismissReason.timer) {
            Swal.fire({
              title: '¡Éxito!',
              text: 'La conflista se actualizó correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });
            console.log('Conflista actualizada correctamente');
            this.router.navigate(['components/conflista']);
          }
        });
      }, error => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar la conflista',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      });
    } else {
      this.markFormGroupTouched(this.conflistaForm);
      Swal.fire({
        title: 'ERROR',
        text: 'Verifique los datos ingresados, hay campos inválidos o vacíos',
        icon: 'error',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['components/conflista']);
  }

  monitorFormChanges(): void {
    Object.keys(this.conflistaForm.controls).forEach(field => {
      const control = this.conflistaForm.get(field);
      control?.valueChanges.pipe(debounceTime(1000)).subscribe(value => {
        console.log(`El campo ${field} cambió a: `, value);
        this.listapFlag = this.conflistaForm.controls['listap'].invalid;
      });
    });
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
