import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { User, UserRole } from '../../../interfaces/user';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  userForm: FormGroup;
  editMode = false;
  currentUserId: string | null = null;
  loading = false;
  userRoles = Object.values(UserRole);
  
  constructor(
    private authService: AuthService,
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
  }
  
  ngOnInit(): void {
    this.loadUsers();
    
    // El campo password es obligatorio solo al crear usuarios nuevos
    this.userForm.get('password')?.valueChanges.subscribe(val => {
      if (this.editMode) {
        this.userForm.get('password')?.setValidators(val ? [Validators.minLength(6)] : null);
      } else {
        this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      }
      this.userForm.get('password')?.updateValueAndValidity();
    });

    // Si no hay username, usar el nombre
    this.userForm.get('nombre')?.valueChanges.subscribe(val => {
      const usernameControl = this.userForm.get('username');
      if (usernameControl && !usernameControl.value) {
        usernameControl.setValue(val);
      }
    });
  }
  
  loadUsers(): void {
    this.loading = true;
    this.authService.getAllUsers().subscribe(
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
      ...this.userForm.value
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
} 