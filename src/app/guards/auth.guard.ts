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
        
        return isAuthenticated && hasRole;
      }),
      tap(canAccess => {
        if (!canAccess) {
          console.warn('Acceso denegado. Redirigiendo a login');
          this.router.navigate(['/login']);
        }
      })
    );
  }
}
