import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CryptoService } from '../../../services/crypto.service';
import { CrudService } from '../../../services/crud.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login2',
  templateUrl: './login2.component.html',
  styleUrls: ['./login2.component.css']
})
export class Login2Component implements OnInit {
  loginForm: FormGroup;
  loading = false;
  rememberMe = false;
  sucursal: string | null = null;
  errorMessage: string | null = null;
  sucursales: any[] = [];
  
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cryptoService: CryptoService,
    private crudService: CrudService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  
  ngOnInit(): void {
    // Recuperar datos de sesión anterior si existe
    this.checkRememberMe();
    this.loadSavedCredentials();
    this.loadSucursales();
  }
  
  loadSucursales(): void {
    this.crudService.getListSnap('sucursales').subscribe(
      data => {
        this.sucursales = data.map(item => {
          const payload = item.payload.val() as any;
          return {
            key: item.key,
            nombre: payload.nombre,
            value: payload.value
          };
        });
      },
      error => {
        console.error('Error al cargar sucursales:', error);
        this.showError('Error al cargar las sucursales');
      }
    );
  }
  
  checkRememberMe(): void {
    const savedRememberMe = sessionStorage.getItem('sddccasdf');
    if (savedRememberMe) {
      this.rememberMe = savedRememberMe === 'true';
    }
  }
  
  loadSavedCredentials(): void {
    if (this.rememberMe && 
        sessionStorage.getItem('sddddasdf') && 
        sessionStorage.getItem('sddeeasdf')) {
      try {
        const email = this.cryptoService.decrypt(sessionStorage.getItem('sddddasdf') || '');
        const password = this.cryptoService.decrypt(sessionStorage.getItem('sddeeasdf') || '');
        
        if (email && password) {
          this.loginForm.patchValue({
            email,
            password
          });
          
          // Auto login opcional
          // this.onSubmit();
        }
      } catch (error) {
        console.error('Error al cargar credenciales guardadas', error);
      }
    }
  }
  
  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }
    
    if (!this.sucursal) {
      this.showError('Debe seleccionar una sucursal');
      return;
    }
    
    this.loading = true;
    this.errorMessage = null;
    sessionStorage.setItem('sucursal', this.sucursal);
    
    const { email, password } = this.loginForm.value;
    
    this.authService.signIn(email, password)
      .then((user) => {
        this.loading = false;
        
        if (user) {
          // Guardar preferencia de recordar sesión
          sessionStorage.setItem('sddccasdf', this.rememberMe ? 'true' : 'false');
          
          // Guardar credenciales si rememberMe está activo
          if (this.rememberMe) {
            sessionStorage.setItem('sddddasdf', this.cryptoService.encrypt(email));
            sessionStorage.setItem('sddeeasdf', this.cryptoService.encrypt(password));
          } else {
            sessionStorage.setItem('sddddasdf', this.cryptoService.encrypt(''));
            sessionStorage.setItem('sddeeasdf', this.cryptoService.encrypt(''));
          }
          
          // Guardar información del usuario
          sessionStorage.setItem('usernameOp', user.nombre);
          sessionStorage.setItem('emailOp', user.email);
          sessionStorage.setItem('sddffasdf', this.cryptoService.encrypt(user.nivel));
          sessionStorage.setItem('sddggasdf', user.uid || '');
          
          // Redireccionar
          this.router.navigate(['/components/puntoventa']);
        }
      })
      .catch((error) => {
        this.loading = false;
        this.handleAuthError(error);
      });
  }
  
  handleAuthError(error: any): void {
    console.error('Error de autenticación:', error);
    
    let errorMsg = 'Error de autenticación';
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          errorMsg = 'Email o contraseña incorrectos';
          break;
        case 'auth/too-many-requests':
          errorMsg = 'Demasiados intentos fallidos. Intente más tarde';
          break;
        case 'auth/user-disabled':
          errorMsg = 'Esta cuenta ha sido deshabilitada';
          break;
        default:
          errorMsg = error.message || 'Error de autenticación';
      }
    }
    
    this.errorMessage = errorMsg;
    this.showError(errorMsg);
  }
  
  showError(message: string): void {
    Swal.fire({
      title: 'Error',
      text: message,
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
  }
  
  onForgotPassword(): void {
    Swal.fire({
      title: 'Recuperar contraseña',
      input: 'email',
      inputLabel: 'Su dirección de correo',
      inputPlaceholder: 'Ingrese su correo electrónico',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      preConfirm: (email) => {
        if (!email) {
          Swal.showValidationMessage('Por favor ingrese su correo');
          return false;
        }
        
        return this.authService.resetPassword(email)
          .then(() => true)
          .catch((error) => {
            Swal.showValidationMessage(`Error: ${error.message}`);
            return false;
          });
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Correo enviado',
          text: 'Se ha enviado un correo con instrucciones para recuperar su contraseña. Revise también su carpeta de spam.',
          icon: 'success'
        });
      }
    });
  }
  
  onSucursalChange(event: any): void {
    this.sucursal = event.target.value;
  }
} 