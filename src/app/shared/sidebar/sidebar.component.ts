import { Component, OnInit } from '@angular/core';
import { LoginService } from '../../services/login.service';
import { AuthService } from '../../services/auth.service';
import { CarritoService } from '../../services/carrito.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  public nombreCliente: string;
  
  constructor(
    private _login: LoginService,
    private authService: AuthService,
    private _carrito: CarritoService
  ) {
    this.nombreCliente = sessionStorage.getItem('usernameOp') || '';
  }
  
  ngOnInit(): void {
  }
  
  salir() {
    // Limpiar el estado del carrito primero
    this._carrito.limpiarCarrito();
    
    // Limpiar los datos de sesión
    sessionStorage.clear();
    
    // Intentar cerrar sesión usando el nuevo servicio primero
    this.authService.signOut()
      .catch(error => {
        console.error('Error al cerrar sesión con AuthService', error);
        // Si falla, usar el servicio anterior como fallback
        this._login.signOut().then((resp: any) => console.log(resp));
      });
  }
}

