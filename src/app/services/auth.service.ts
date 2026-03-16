import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireDatabase } from '@angular/fire/compat/database';
import { Router } from '@angular/router';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, of } from 'rxjs';
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
    private router: Router,
    private functions: Functions
  ) {
    // Observable del usuario autenticado — lookup por authUid con fallback por email
    this.user$ = this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          // Primario: buscar por authUid (estable)
          return this.db.list<any>('usuarios/cliente', ref =>
            ref.orderByChild('authUid').equalTo(user.uid)
          ).snapshotChanges().pipe(
            switchMap(actions => {
              if (actions && actions.length > 0) {
                return of(actions);
              }
              // Fallback temporal: buscar por email (para usuarios aún no backfilled)
              // RETIRO: eliminar este fallback 30 días después del deploy del backfill
              console.warn(`[auth] ${user.email}: sin authUid en RTDB, usando fallback por email`);
              return this.db.list<any>('usuarios/cliente', ref =>
                ref.orderByChild('email').equalTo(user.email || '')
              ).snapshotChanges();
            }),
            map(actions => {
              if (actions && actions.length > 0) {
                const userData = actions[0].payload.val();
                const key = actions[0].key;
                return {
                  uid: key,
                  authUid: userData.authUid || null,
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
        // Primario: buscar por authUid
        let actions = await this.db.list<any>('usuarios/cliente', ref =>
          ref.orderByChild('authUid').equalTo(credential.user!.uid)
        ).snapshotChanges().pipe(take(1)).toPromise();

        // Fallback por email si no hay match por authUid
        if (!actions || actions.length === 0) {
          console.warn(`[auth] signIn ${email}: sin authUid, fallback por email`);
          actions = await this.db.list<any>('usuarios/cliente', ref =>
            ref.orderByChild('email').equalTo(email)
          ).snapshotChanges().pipe(take(1)).toPromise();
        }

        if (actions && actions.length > 0) {
          const userData = actions[0].payload.val();
          const key = actions[0].key;
          return {
            uid: key,
            authUid: userData.authUid || null,
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
      }
      return null;
    } catch (error) {
      console.error('Error en signIn:', error);
      throw error;
    }
  }

  // Registrar nuevo usuario — via Cloud Function (no afecta sesión del admin)
  async signUp(user: User): Promise<any> {
    try {
      const fn = httpsCallable(this.functions, 'adminManageUser');
      const result = await fn({
        action: 'createUser',
        email: user.email,
        password: user.password,
        nombre: user.nombre,
        apellido: user.apellido,
        nivel: user.nivel || 'user',
        telefono: user.telefono || '',
        username: user.username || user.nombre,
        sucursalesPermitidas: user.sucursalesPermitidas || []
      });
      return (result.data as any);
    } catch (error) {
      console.error('Error en signUp:', error);
      throw error;
    }
  }

  // Migrar usuario existente a Firebase Auth — via Cloud Function
  async migrateUser(email: string, password: string, rtdbKey?: string): Promise<any> {
    if (!rtdbKey) {
      throw new Error('rtdbKey es requerido para migración');
    }

    try {
      const fn = httpsCallable(this.functions, 'adminMigrateUser');
      const result = await fn({ email, password, rtdbKey });
      return (result.data as any);
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

  // Actualizar datos del usuario — usa Cloud Function para credenciales y nivel
  async updateUserData(key: string, data: Partial<User>): Promise<void> {
    const userSnapshot = await this.db.object(`usuarios/cliente/${key}`).query.once('value');
    const currentData = userSnapshot.val();

    if (!currentData) {
      throw new Error('Usuario no encontrado en la base de datos');
    }

    const needsAuthUpdate = data.password || (data.email && data.email !== currentData.email);
    const needsNivelUpdate = data.nivel && data.nivel !== currentData.nivel;

    // Actualizar credenciales en Auth via Cloud Function
    if (needsAuthUpdate) {
      if (!currentData.authUid) {
        throw new Error('Este usuario no tiene authUid. Ejecute el backfill primero.');
      }

      const callData: any = {
        action: 'updateCredentials',
        authUid: currentData.authUid,
      };
      if (data.password) callData.newPassword = data.password;
      if (data.email && data.email !== currentData.email) callData.newEmail = data.email;

      const fn = httpsCallable(this.functions, 'adminManageUser');
      await fn(callData);
    }

    // Cambiar nivel via Cloud Function (protegido por reglas RTDB)
    if (needsNivelUpdate) {
      if (!currentData.authUid) {
        throw new Error('Este usuario no tiene authUid. Ejecute el backfill primero.');
      }

      const fn = httpsCallable(this.functions, 'adminManageUser');
      await fn({
        action: 'updateNivel',
        authUid: currentData.authUid,
        newNivel: data.nivel,
      });
    }

    // Actualizar campos no-protegidos en RTDB
    const updatePayload: any = {};
    if (data.apellido !== undefined) updatePayload.apellido = data.apellido;
    if (data.email !== undefined) updatePayload.email = data.email;
    if (data.nombre !== undefined) updatePayload.nombre = data.nombre;
    if (data.password !== undefined) updatePayload.password = data.password;
    if (data.telefono !== undefined) updatePayload.telefono = data.telefono;
    if (data.username !== undefined) updatePayload.username = data.username;
    if (data.sucursalesPermitidas !== undefined) updatePayload.sucursalesPermitidas = data.sucursalesPermitidas;

    if (Object.keys(updatePayload).length > 0) {
      return this.db.object(`usuarios/cliente/${key}`).update(updatePayload);
    }
  }

  // Eliminar usuario — Cloud Function elimina de Auth Y RTDB
  async deleteUser(key: string): Promise<void> {
    const userSnapshot = await this.db.object(`usuarios/cliente/${key}`).query.once('value');
    const userData = userSnapshot.val();

    if (!userData) {
      throw new Error('Usuario no encontrado');
    }

    if (!userData.authUid) {
      throw new Error('Este usuario no tiene authUid. Ejecute el backfill primero.');
    }

    const fn = httpsCallable(this.functions, 'adminManageUser');
    await fn({
      action: 'deleteUser',
      authUid: userData.authUid
    });
    // La Cloud Function ya eliminó de Auth y RTDB
  }

  // Obtener usuario por key
  getUserData(key: string): Observable<User | null> {
    return this.db.object<any>(`usuarios/cliente/${key}`).valueChanges().pipe(
      take(1),
      map(userData => {
        if (!userData) return null;

        return {
          uid: key,
          authUid: userData.authUid || null,
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

  // Obtener todos los usuarios
  getAllUsers(): Observable<User[]> {
    return this.db.list<any>('usuarios/cliente').snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.val();
        const key = a.key;
        return {
          uid: key,
          authUid: data.authUid || null,
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

  // Obtener el rol del usuario actual
  getCurrentUserRole(): Observable<UserRole> {
    return this.user$.pipe(
      map(user => {
        if (!user) return UserRole.USER;
        return user.nivel as UserRole;
      }),
      take(1)
    );
  }
}
