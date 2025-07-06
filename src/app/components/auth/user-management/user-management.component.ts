import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { User, UserRole } from '../../../interfaces/user';
import { CrudService } from '../../../services/crud.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  users: User[] = [];
  userForm: FormGroup;
  editMode = false;
  currentUserId: string | null = null;
  loading = false;
  userRoles = Object.values(UserRole);
  sucursales: any[] = [];
  sucursalesSeleccionadas: number[] = [];
  private destroy$ = new Subject<void>();
  
  constructor(
    private authService: AuthService,
    private crudService: CrudService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      nombre: ['', [Validators.required]],
      apellido: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(6)]],
      telefono: [''],
      nivel: [UserRole.USER, [Validators.required]],
      username: ['']
    });
    
    // Configuramos el comportamiento de password de manera segura
    this.userForm.get('password')?.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(val => {
      // No usar updateValueAndValidity para evitar recursión
      if (this.editMode) {
        this.userForm.get('password')?.clearValidators();
        if (val && val.length > 0) {
          this.userForm.get('password')?.addValidators([Validators.minLength(6)]);
        }
      } else {
        this.userForm.get('password')?.clearValidators();
        this.userForm.get('password')?.addValidators([Validators.required, Validators.minLength(6)]);
      }
    });
  }
  
  ngOnInit(): void {
    this.loadUsers();
    this.loadSucursales();
    
    // Eliminamos los suscriptores que estaban causando el problema de recursión
  }
  
  loadSucursales(): void {
    this.crudService.getListSnap('sucursales').pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      data => {
        this.sucursales = data.map(item => {
          const payload = item.payload.val() as any;
          return {
            key: item.key,
            nombre: payload.nombre,
            value: payload.value
          };
        });
        // Ordenar por nombre
        this.sucursales.sort((a, b) => a.nombre.localeCompare(b.nombre));
      },
      error => {
        console.error('Error al cargar sucursales:', error);
        this.showError('Error al cargar las sucursales');
      }
    );
  }
  
  loadUsers(): void {
    this.loading = true;
    this.authService.getAllUsers().pipe(
      takeUntil(this.destroy$)
    ).subscribe(
      (users) => {
        this.users = users;
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar usuarios', error);
        this.showError('Error al cargar la lista de usuarios');
        this.loading = false;
      }
    );
  }
  
  onSubmit(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      return;
    }
    
    this.loading = true;
    
    const userData: User = {
      ...this.userForm.value,
      sucursalesPermitidas: this.sucursalesSeleccionadas.length > 0 ? this.sucursalesSeleccionadas : undefined
    };
    
    if (this.editMode && this.currentUserId) {
      // Actualizar usuario existente
      this.authService.updateUserData(this.currentUserId, userData)
        .then(() => {
          this.loading = false;
          this.resetForm();
          this.loadUsers();
          this.showSuccess('Usuario actualizado correctamente');
        })
        .catch(error => {
          this.loading = false;
          console.error('Error al actualizar usuario', error);
          this.showError('Error al actualizar usuario');
        });
    } else {
      // Crear nuevo usuario
      this.authService.signUp(userData)
        .then(() => {
          this.loading = false;
          this.resetForm();
          this.loadUsers();
          this.showSuccess('Usuario creado correctamente');
        })
        .catch(error => {
          this.loading = false;
          console.error('Error al crear usuario', error);
          this.showError('Error al crear usuario: ' + error.message);
        });
    }
  }
  
  editUser(user: User): void {
    this.editMode = true;
    this.currentUserId = user.uid || null;
    
    // Eliminar el password para no mostrarlo en el formulario
    const { password, ...userWithoutPassword } = user;
    
    this.userForm.patchValue(userWithoutPassword);
    
    // Limpiar el campo de contraseña
    this.userForm.get('password')?.setValue('');
    
    // Cargar sucursales permitidas
    this.sucursalesSeleccionadas = user.sucursalesPermitidas || [];
    
    // Marcar los checkboxes correspondientes
    setTimeout(() => {
      this.sucursalesSeleccionadas.forEach(sucursalId => {
        const checkbox = document.getElementById('sucursal_' + sucursalId) as HTMLInputElement;
        if (checkbox) {
          checkbox.checked = true;
        }
      });
      
      // Actualizar el checkbox "seleccionar todas"
      this.actualizarCheckboxSeleccionarTodas();
    }, 100);
  }
  
  deleteUser(user: User): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el usuario ${user.nombre} ${user.apellido}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed && user.uid) {
        this.loading = true;
        this.authService.deleteUser(user.uid)
          .then(() => {
            this.loading = false;
            this.loadUsers();
            this.showSuccess('Usuario eliminado correctamente');
          })
          .catch(error => {
            this.loading = false;
            console.error('Error al eliminar usuario', error);
            this.showError('Error al eliminar usuario');
          });
      }
    });
  }
  
  resetForm(): void {
    this.userForm.reset({
      nivel: UserRole.USER
    });
    this.editMode = false;
    this.currentUserId = null;
    this.sucursalesSeleccionadas = [];
    
    // Desmarcar todos los checkboxes
    this.sucursales.forEach(sucursal => {
      const checkbox = document.getElementById('sucursal_' + sucursal.value) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = false;
      }
    });
    
    // Desmarcar el checkbox "seleccionar todas"
    const checkboxAll = document.getElementById('todas_sucursales') as HTMLInputElement;
    if (checkboxAll) {
      checkboxAll.checked = false;
    }
  }

  migrateUsers(): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: 'Esto intentará migrar los usuarios existentes a Firebase Authentication. Este proceso no modifica la base de datos actual, solo crea los usuarios en Firebase Auth.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, migrar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        this.loading = true;
        
        try {
          // Migrar cada usuario
          const results = await Promise.all(
            this.users.map(async (user) => {
              try {
                if (user.email && user.password) {
                  await this.authService.migrateUser(user.email, user.password);
                  return { user: user.email, success: true };
                }
                return { user: user.email, success: false, reason: 'Sin email o password' };
              } catch (error) {
                return { user: user.email, success: false, reason: error.message };
              }
            })
          );
          
          this.loading = false;
          
          // Mostrar resultados
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          Swal.fire({
            title: 'Migración completada',
            html: `
              <p>Proceso finalizado con:</p>
              <p>- ${successful} usuarios migrados correctamente</p>
              <p>- ${failed} usuarios con errores</p>
            `,
            icon: 'info'
          });
          
        } catch (error) {
          this.loading = false;
          this.showError('Error en el proceso de migración: ' + error.message);
        }
      }
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
  
  onSucursalChange(event: any, sucursalId: number): void {
    if (event.target.checked) {
      // Agregar sucursal si no está ya en el array
      if (!this.sucursalesSeleccionadas.includes(sucursalId)) {
        this.sucursalesSeleccionadas.push(sucursalId);
      }
    } else {
      // Eliminar sucursal del array
      this.sucursalesSeleccionadas = this.sucursalesSeleccionadas.filter(id => id !== sucursalId);
    }
    
    // Actualizar estado del checkbox "seleccionar todas"
    this.actualizarCheckboxSeleccionarTodas();
  }
  
  seleccionarTodasSucursales(event: any): void {
    const checked = event.target.checked;
    
    // Actualizar todos los checkboxes
    this.sucursales.forEach(sucursal => {
      const checkbox = document.getElementById('sucursal_' + sucursal.value) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = checked;
      }
      
      // Actualizar el array de seleccionadas
      if (checked) {
        if (!this.sucursalesSeleccionadas.includes(sucursal.value)) {
          this.sucursalesSeleccionadas.push(sucursal.value);
        }
      } else {
        this.sucursalesSeleccionadas = [];
      }
    });
  }
  
  actualizarCheckboxSeleccionarTodas(): void {
    const checkboxAll = document.getElementById('todas_sucursales') as HTMLInputElement;
    if (checkboxAll) {
      // Marcar como seleccionado si todas las sucursales están seleccionadas
      checkboxAll.checked = this.sucursalesSeleccionadas.length === this.sucursales.length;
    }
  }
  
  obtenerNombresSucursales(sucursalesIds: number[]): string {
    if (!this.sucursales || this.sucursales.length === 0) {
      return 'Cargando...';
    }
    
    const nombres = sucursalesIds.map(id => {
      const sucursal = this.sucursales.find(s => s.value === id);
      return sucursal ? sucursal.nombre : id;
    });
    
    return nombres.join(', ');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 