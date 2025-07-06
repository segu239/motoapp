import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrudService } from '../../services/crud.service';
import { Sucursal } from '../../interfaces/sucursal';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-sucursales',
  templateUrl: './sucursales.component.html',
  styleUrls: ['./sucursales.component.css']
})
export class SucursalesComponent implements OnInit, OnDestroy {
  sucursales: any[] = [];
  sucursalForm: FormGroup;
  editMode = false;
  currentSucursalId: string | null = null;
  loading = false;
  private destroy$ = new Subject<void>();
  
  constructor(
    private crudService: CrudService,
    private fb: FormBuilder
  ) {
    this.sucursalForm = this.fb.group({
      nombre: ['', [Validators.required]],
      value: [null, [Validators.required, Validators.min(0)]]
    });
  }
  
  ngOnInit(): void {
    this.loadSucursales();
  }
  
  loadSucursales(): void {
    this.loading = true;
    this.crudService.getListSnap('sucursales').pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (data) => {
        this.sucursales = data.map((item: any) => {
          return {
            id: item.key,
            ...item.payload.val()
          };
        });
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar sucursales', error);
        this.showError('Error al cargar la lista de sucursales');
        this.loading = false;
      }
    );
  }
  
  onSubmit(): void {
    if (this.sucursalForm.invalid) {
      this.markFormGroupTouched(this.sucursalForm);
      return;
    }
    
    this.loading = true;
    
    const sucursalData = {
      ...this.sucursalForm.value
    };
    
    if (this.editMode && this.currentSucursalId) {
      // Actualizar sucursal existente
      this.crudService.update('sucursales', this.currentSucursalId, JSON.stringify(sucursalData))
        .then(() => {
          this.loading = false;
          this.resetForm();
          this.loadSucursales();
          this.showSuccess('Sucursal actualizada correctamente');
        })
        .catch(error => {
          this.loading = false;
          console.error('Error al actualizar sucursal', error);
          this.showError('Error al actualizar sucursal');
        });
    } else {
      // Crear nueva sucursal
      this.crudService.push('sucursales', JSON.stringify(sucursalData))
        .then(() => {
          this.loading = false;
          this.resetForm();
          this.loadSucursales();
          this.showSuccess('Sucursal creada correctamente');
        })
        .catch(error => {
          this.loading = false;
          console.error('Error al crear sucursal', error);
          this.showError('Error al crear sucursal');
        });
    }
  }
  
  editSucursal(sucursal: any): void {
    this.editMode = true;
    this.currentSucursalId = sucursal.id;
    this.sucursalForm.patchValue({
      nombre: sucursal.nombre,
      value: sucursal.value
    });
  }
  
  deleteSucursal(sucursal: any): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la sucursal ${sucursal.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.loading = true;
        this.crudService.remove('sucursales', sucursal.id)
          .then(() => {
            this.loading = false;
            this.loadSucursales();
            this.showSuccess('Sucursal eliminada correctamente');
          })
          .catch(error => {
            this.loading = false;
            console.error('Error al eliminar sucursal', error);
            this.showError('Error al eliminar sucursal');
          });
      }
    });
  }
  
  resetForm(): void {
    this.sucursalForm.reset();
    this.editMode = false;
    this.currentSucursalId = null;
  }
  
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  showSuccess(message: string): void {
    Swal.fire({
      title: 'Éxito',
      text: message,
      icon: 'success',
      confirmButtonText: 'Aceptar'
    });
  }
  
  showError(message: string): void {
    Swal.fire({
      title: 'Error',
      text: message,
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}