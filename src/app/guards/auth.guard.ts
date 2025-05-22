import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../interfaces/user';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    // Obtener los roles permitidos para la ruta
    const allowedRoles = route.data['roles'] as UserRole[] || [
      UserRole.SUPER,
      UserRole.ADMIN,
      UserRole.USER
    ];
    
    return this.authService.user$.pipe(
      take(1),
      map(user => {
        // Verificar si el usuario está autenticado y tiene el rol permitido
        const isAuthenticated = !!user;
        const hasRole = this.authService.checkUserRole(user, allowedRoles);
        
        // Si el usuario está autenticado pero no tiene el rol adecuado, redirigir a nopermitido
        if (isAuthenticated && !hasRole) {
          console.warn('Acceso denegado por falta de permisos. Redirigiendo a nopermitido');
          this.router.navigate(['/nopermitido']);
          return false;
        }
        
        // Si no está autenticado, redirigir a login
        if (!isAuthenticated) {
          console.warn('Usuario no autenticado. Redirigiendo a login');
          this.router.navigate(['/login']);
          return false;
        }
        
        return isAuthenticated && hasRole;
      })
    );
  }
}
