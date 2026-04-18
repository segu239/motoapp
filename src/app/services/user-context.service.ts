import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { CryptoService } from './crypto.service';
import { UserRole } from '../interfaces/user';
import { normalizeRole } from '../utils/role-visibility';

@Injectable({
  providedIn: 'root'
})
export class UserContextService {
  constructor(private cryptoService: CryptoService) {}

  getRole(): UserRole {
    const encryptedRole = sessionStorage.getItem('sddffasdf');

    if (!encryptedRole) {
      return UserRole.USER;
    }

    try {
      return normalizeRole(this.cryptoService.decrypt(encryptedRole));
    } catch (error) {
      console.error('No se pudo leer el rol actual desde sessionStorage', error);
      return UserRole.USER;
    }
  }

  getEmail(): string {
    return sessionStorage.getItem('emailOp') || '';
  }

  buildRoleHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-User-Role': this.getRole(),
      'X-User-Email': this.getEmail()
    });
  }

  withRolePayload<T extends Record<string, any>>(payload: T): T & { rol_usuario: UserRole; email_usuario: string } {
    return {
      ...payload,
      rol_usuario: this.getRole(),
      email_usuario: this.getEmail()
    };
  }
}
