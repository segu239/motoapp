import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Router } from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { switchMap, map, catchError, take } from 'rxjs/operators';
import { User, UserRole } from '../interfaces/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<User | null>;
  
  constructor(
    private afAuth: AngularFireAuth,
    private db: AngularFireDatabase,
    private router: Router
  ) {
    // Observable del usuario autenticado
    this.user$ = this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          return this.db.list<any>('usuarios/cliente', ref => 
            ref.orderByChild('email').equalTo(user.email || '')
          ).snapshotChanges().pipe(
            map(actions => {
              if (actions && actions.length > 0) {
                const userData = actions[0].payload.val();
                const key = actions[0].key;
                return {
                  uid: key,
                  email: userData.email || '',
                  nombre: userData.nombre || '',
                  apellido: userData.apellido || '',
                  nivel: userData.nivel || 'none',
                  telefono: userData.telefono || '',
                  username: userData.username || '',
                  emailVerified: user.emailVerified,
                  sucursalesPermitidas: userData.sucursalesPermitidas || [],
                } as User;
              }
              return null;
            })
          );
        } else {
          return of(null);
        }
      })
    );
  }

  // Iniciar sesión con email y password
  async signIn(email: string, password: string): Promise<any> {
    try {
      const credential = await this.afAuth.signInWithEmailAndPassword(email, password);
      
      if (credential.user) {
        // Buscar el usuario en la BD para obtener su información adicional
        return this.db.list<any>('usuarios/cliente', ref => 
          ref.orderByChild('email').equalTo(email)
        ).snapshotChanges().pipe(
          take(1),
          map(actions => {
            if (actions && actions.length > 0) {
              const userData = actions[0].payload.val();
              const key = actions[0].key;
              // Actualizar última sesión si se desea
              return {
                uid: key,
                email: userData.email,
                nombre: userData.nombre || '',
                apellido: userData.apellido || '',
                nivel: userData.nivel || 'none',
                telefono: userData.telefono || '',
                username: userData.username || '',
                emailVerified: credential.user?.emailVerified,
                sucursalesPermitidas: userData.sucursalesPermitidas || []
              } as User;
            }
            return null;
          })
        ).toPromise();
      }
      return null;
    } catch (error) {
      console.error('Error en signIn:', error);
      throw error;
    }
  }

  // Registrar nuevo usuario - mantiene el formato actual de la BD pero usa Firebase Auth
  async signUp(user: User): Promise<any> {
    try {
      // Crear usuario en Firebase Authentication
      const credential = await this.afAuth.createUserWithEmailAndPassword(user.email, user.password || '');
      
      if (credential.user) {
        // Guardar información adicional en la BD con el formato actual
        return this.db.list('usuarios/cliente').push({
          apellido: user.apellido,
          email: user.email,
          nivel: user.nivel || 'user',
          nombre: user.nombre,
          password: user.password, // Nota: Por seguridad se recomienda no guardar passwords en la BD
          telefono: user.telefono || '',
          username: user.username || user.nombre, // Mantener username si existe
          sucursalesPermitidas: user.sucursalesPermitidas || []
        });
      }
      return null;
    } catch (error) {
      console.error('Error en signUp:', error);
      throw error;
    }
  }

  // Migrar usuario existente a Firebase Auth
  async migrateUser(email: string, password: string): Promise<any> {
    try {
      // Verificar si ya existe en Firebase Auth
      try {
        await this.afAuth.signInWithEmailAndPassword(email, password);
        console.log('El usuario ya existe en Firebase Auth');
        return true;
      } catch (error) {
        // Si no existe, crearlo
        if (error.code === 'auth/user-not-found') {
          return this.afAuth.createUserWithEmailAndPassword(email, password);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error en migrateUser:', error);
      throw error;
    }
  }

  // Cerrar sesión
  async signOut(): Promise<void> {
    await this.afAuth.signOut();
    sessionStorage.clear();
    this.router.navigate(['/login2']);
  }

  // Recuperar contraseña
  async resetPassword(email: string): Promise<void> {
    return this.afAuth.sendPasswordResetEmail(email);
  }

  // Enviar correo de verificación
  async sendEmailVerification(): Promise<void> {
    const user = await this.afAuth.currentUser;
    if (user) {
      return user.sendEmailVerification();
    }
    throw new Error('No hay usuario autenticado');
  }

  // Actualizar datos del usuario - mantiene compatibilidad con la estructura actual
  async updateUserData(key: string, data: Partial<User>): Promise<void> {
    // Si incluye password, actualizarlo en Authentication
    if (data.password) {
      try {
        // Obtener el email del usuario para buscarlo en Firebase Auth
        const userSnapshot = await this.db.object(`usuarios/cliente/${key}`).query.once('value');
        const userData = userSnapshot.val();
        
        if (userData && userData.email) {
          // Iniciar sesión con el usuario para poder actualizar su password
          const user = await this.afAuth.currentUser;
          if (user && user.email === userData.email) {
            await user.updatePassword(data.password);
          }
        }
        
        // Actualizar en la BD con el formato actual
        return this.db.object(`usuarios/cliente/${key}`).update({
          apellido: data.apellido,
          email: data.email,
          nivel: data.nivel,
          nombre: data.nombre,
          password: data.password,
          telefono: data.telefono,
          username: data.username,
          sucursalesPermitidas: data.sucursalesPermitidas || []
        });
      } catch (error) {
        console.error('Error al actualizar contraseña:', error);
        throw error;
      }
    } else {
      // Actualización normal sin cambio de contraseña
      return this.db.object(`usuarios/cliente/${key}`).update(data);
    }
  }

  // Eliminar usuario - compatible con la estructura actual
  async deleteUser(key: string): Promise<void> {
    try {
      // Obtener el email del usuario para buscarlo en Firebase Auth
      const userSnapshot = await this.db.object(`usuarios/cliente/${key}`).query.once('value');
      const userData = userSnapshot.val();
      
      if (userData && userData.email) {
        // Tratar de eliminar en Firebase Auth
        const currentUser = await this.afAuth.currentUser;
        
        if (currentUser && currentUser.email === userData.email) {
          await currentUser.delete();
        } else {
          console.warn('No se puede eliminar directamente otro usuario de Firebase Auth desde el cliente');
          // En un entorno real, se necesitaría usar Cloud Functions para esto
        }
      }
      
      // Eliminar de la BD en la estructura actual
      return this.db.object(`usuarios/cliente/${key}`).remove();
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      throw error;
    }
  }

  // Obtener usuario por key - compatible con la estructura actual
  getUserData(key: string): Observable<User | null> {
    return this.db.object<any>(`usuarios/cliente/${key}`).valueChanges().pipe(
      take(1),
      map(userData => {
        if (!userData) return null;
        
        return {
          uid: key,
          email: userData.email || '',
          nombre: userData.nombre || '',
          apellido: userData.apellido || '',
          nivel: userData.nivel || 'none',
          telefono: userData.telefono || '',
          username: userData.username || '',
          sucursalesPermitidas: userData.sucursalesPermitidas || []
        } as User;
      }),
      catchError(err => {
        console.error('Error al obtener datos del usuario:', err);
        return of(null);
      })
    );
  }

  // Obtener todos los usuarios - compatible con la estructura actual
  getAllUsers(): Observable<User[]> {
    return this.db.list<any>('usuarios/cliente').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.val();
        const key = a.key;
        return {
          uid: key,
          email: data.email || '',
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          nivel: data.nivel || 'none',
          telefono: data.telefono || '',
          username: data.username || '',
          sucursalesPermitidas: data.sucursalesPermitidas || []
        } as User;
      }))
    );
  }

  // Verificar si el usuario tiene un rol específico
  checkUserRole(user: User | null, allowedRoles: UserRole[]): boolean {
    if (!user) return false;
    return allowedRoles.includes(user.nivel as UserRole);
  }

  // Verificar si el usuario está autenticado
  get isAuthenticated(): Observable<boolean> {
    return this.afAuth.authState.pipe(
      map(user => !!user)
    );
  }
} 