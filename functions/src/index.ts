import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

initializeApp();

// ─── Helpers ───

interface RTDBUser {
  key: string;
  nivel: string;
  email: string;
}

async function findUserByAuthUid(authUid: string): Promise<RTDBUser | null> {
  const db = getDatabase();
  const snapshot = await db.ref('usuarios/cliente')
    .orderByChild('authUid')
    .equalTo(authUid)
    .once('value');
  const data = snapshot.val();
  if (!data) return null;
  const key = Object.keys(data)[0];
  return { key, nivel: data[key].nivel || 'none', email: data[key].email || '' };
}

function requireAdminOrSuper(nivel: string): void {
  if (nivel !== 'super' && nivel !== 'admin') {
    throw new HttpsError('permission-denied', 'Permisos insuficientes');
  }
}

function enforceHierarchy(callerNivel: string, targetNivel: string, action: string): void {
  if (targetNivel === 'super' && callerNivel !== 'super') {
    throw new HttpsError('permission-denied',
      `Solo usuarios super pueden ${action} a otro super`);
  }
  if (callerNivel === 'admin' && targetNivel !== 'admin' && targetNivel !== 'user' && targetNivel !== 'none') {
    throw new HttpsError('permission-denied', 'Permisos insuficientes para este nivel de usuario');
  }
}

function enforceCreationHierarchy(callerNivel: string, requestedNivel: string): void {
  if (requestedNivel === 'super' && callerNivel !== 'super') {
    throw new HttpsError('permission-denied', 'Solo super puede crear usuarios con nivel super');
  }
  if (requestedNivel === 'admin' && callerNivel !== 'super') {
    throw new HttpsError('permission-denied', 'Solo super puede crear usuarios con nivel admin');
  }
}

// ─── Cloud Function principal ───

interface ManageUserData {
  action: 'updateCredentials' | 'deleteUser' | 'createUser' | 'updateNivel';
  authUid?: string;
  newPassword?: string;
  newEmail?: string;
  newNivel?: string;
  email?: string;
  password?: string;
  nombre?: string;
  apellido?: string;
  nivel?: string;
  telefono?: string;
  username?: string;
  sucursalesPermitidas?: number[];
}

export const adminManageUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'No autenticado');
  }

  const caller = await findUserByAuthUid(request.auth.uid);
  if (!caller) {
    throw new HttpsError('permission-denied', 'Caller no encontrado en BD');
  }
  requireAdminOrSuper(caller.nivel);

  const data = request.data as ManageUserData;
  const auth = getAuth();
  const db = getDatabase();

  try {
    switch (data.action) {

      // ── Actualizar credenciales ──
      case 'updateCredentials': {
        if (!data.authUid) {
          throw new HttpsError('invalid-argument', 'authUid es requerido');
        }

        const target = await findUserByAuthUid(data.authUid);
        if (!target) {
          throw new HttpsError('not-found',
            'El usuario target no existe en la base de datos. No se permite operar sobre UIDs sin registro en RTDB.');
        }

        enforceHierarchy(caller.nivel, target.nivel, 'modificar');

        const updatePayload: { password?: string; email?: string } = {};
        if (data.newPassword) {
          if (data.newPassword.length < 6) {
            throw new HttpsError('invalid-argument', 'Contraseña: mínimo 6 caracteres');
          }
          updatePayload.password = data.newPassword;
        }
        if (data.newEmail) {
          if (!data.newEmail.includes('@')) {
            throw new HttpsError('invalid-argument', 'Email inválido');
          }
          updatePayload.email = data.newEmail;
        }
        if (Object.keys(updatePayload).length === 0) {
          throw new HttpsError('invalid-argument', 'Debe indicar newPassword y/o newEmail');
        }

        await auth.updateUser(data.authUid, updatePayload);
        return { success: true, message: 'Credenciales actualizadas' };
      }

      // ── Eliminar usuario ──
      case 'deleteUser': {
        if (!data.authUid) {
          throw new HttpsError('invalid-argument', 'authUid es requerido');
        }

        if (data.authUid === request.auth.uid) {
          throw new HttpsError('failed-precondition', 'No puede eliminarse a sí mismo');
        }

        const target = await findUserByAuthUid(data.authUid);
        if (!target) {
          throw new HttpsError('not-found', 'El usuario target no existe en la base de datos.');
        }

        enforceHierarchy(caller.nivel, target.nivel, 'eliminar');

        if (target.nivel === 'super') {
          const allSupers = await db.ref('usuarios/cliente')
            .orderByChild('nivel').equalTo('super').once('value');
          if (allSupers.numChildren() <= 1) {
            throw new HttpsError('failed-precondition', 'No se puede eliminar al último super');
          }
        }

        await auth.deleteUser(data.authUid);
        await db.ref(`usuarios/cliente/${target.key}`).remove();

        return { success: true, message: 'Usuario eliminado de Auth y RTDB' };
      }

      // ── Crear usuario ──
      case 'createUser': {
        if (!data.email || !data.password) {
          throw new HttpsError('invalid-argument', 'email y password son requeridos');
        }
        if (data.password.length < 6) {
          throw new HttpsError('invalid-argument', 'Contraseña: mínimo 6 caracteres');
        }

        const requestedNivel = data.nivel || 'user';
        enforceCreationHierarchy(caller.nivel, requestedNivel);

        const newUser = await auth.createUser({
          email: data.email,
          password: data.password,
        });

        await db.ref('usuarios/cliente').push({
          authUid: newUser.uid,
          apellido: data.apellido || '',
          email: data.email,
          nivel: requestedNivel,
          nombre: data.nombre || '',
          password: data.password,
          telefono: data.telefono || '',
          username: data.username || data.nombre || '',
          sucursalesPermitidas: data.sucursalesPermitidas || [],
        });

        return { success: true, authUid: newUser.uid, message: 'Usuario creado' };
      }

      // ── Cambiar nivel ──
      case 'updateNivel': {
        if (!data.authUid || !data.newNivel) {
          throw new HttpsError('invalid-argument', 'authUid y newNivel son requeridos');
        }

        const validNiveles = ['super', 'admin', 'user', 'none'];
        if (!validNiveles.includes(data.newNivel)) {
          throw new HttpsError('invalid-argument', `Nivel inválido: ${data.newNivel}`);
        }

        const target = await findUserByAuthUid(data.authUid);
        if (!target) {
          throw new HttpsError('not-found', 'Usuario no encontrado en RTDB');
        }

        enforceHierarchy(caller.nivel, target.nivel, 'cambiar nivel de');
        enforceCreationHierarchy(caller.nivel, data.newNivel);

        if (data.authUid === request.auth.uid && data.newNivel !== caller.nivel) {
          throw new HttpsError('failed-precondition', 'No puede cambiar su propio nivel');
        }

        await db.ref(`usuarios/cliente/${target.key}/nivel`).set(data.newNivel);

        return { success: true, message: `Nivel actualizado a ${data.newNivel}` };
      }

      default:
        throw new HttpsError('invalid-argument', `Acción desconocida: ${data.action}`);
    }
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', 'Usuario no existe en Firebase Auth');
    }
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'El email ya está en uso por otra cuenta');
    }
    throw new HttpsError('internal', error.message || 'Error interno');
  }
});

// ─── Backfill de authUid (one-time, bootstrap independiente) ───

export const backfillAuthUids = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'No autenticado');
  }

  const callerEmail = request.auth.token.email;
  if (!callerEmail) {
    throw new HttpsError('permission-denied', 'Caller sin email en token');
  }

  const db = getDatabase();
  const callerSnap = await db.ref('usuarios/cliente')
    .orderByChild('email')
    .equalTo(callerEmail)
    .once('value');
  const callerData = callerSnap.val();

  if (!callerData) {
    throw new HttpsError('permission-denied', 'Caller no encontrado en BD');
  }

  const callerKey = Object.keys(callerData)[0];
  if (callerData[callerKey].nivel !== 'super') {
    throw new HttpsError('permission-denied', 'Solo super puede ejecutar backfill');
  }

  const auth = getAuth();
  const snapshot = await db.ref('usuarios/cliente').once('value');
  const users = snapshot.val();
  const results: Array<{ email: string; status: string; authUid?: string; error?: string }> = [];

  for (const [key, userData] of Object.entries(users as Record<string, any>)) {
    if (userData.authUid) {
      results.push({ email: userData.email, status: 'already_has_uid', authUid: userData.authUid });
      continue;
    }
    if (!userData.email) {
      results.push({ email: '(sin email)', status: 'skipped_no_email' });
      continue;
    }
    try {
      const authUser = await auth.getUserByEmail(userData.email);
      await db.ref(`usuarios/cliente/${key}/authUid`).set(authUser.uid);
      results.push({ email: userData.email, status: 'backfilled', authUid: authUser.uid });
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        results.push({ email: userData.email, status: 'not_in_auth' });
      } else {
        results.push({ email: userData.email, status: 'error', error: err.code || err.message });
      }
    }
  }

  if (!callerData[callerKey].authUid) {
    await db.ref(`usuarios/cliente/${callerKey}/authUid`).set(request.auth.uid);
  }

  return {
    total: results.length,
    backfilled: results.filter(r => r.status === 'backfilled').length,
    notInAuth: results.filter(r => r.status === 'not_in_auth').length,
    errors: results.filter(r => r.status === 'error').length,
    results
  };
});

// ─── Migración de usuario ───

export const adminMigrateUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'No autenticado');
  }

  const caller = await findUserByAuthUid(request.auth.uid);
  if (!caller) {
    throw new HttpsError('permission-denied', 'Caller no encontrado en BD');
  }
  requireAdminOrSuper(caller.nivel);

  const { email, password, rtdbKey } = request.data as {
    email: string;
    password: string;
    rtdbKey: string;
  };

  if (!email || !password || !rtdbKey) {
    throw new HttpsError('invalid-argument', 'email, password y rtdbKey son requeridos');
  }

  const db = getDatabase();
  const auth = getAuth();

  const targetSnap = await db.ref(`usuarios/cliente/${rtdbKey}`).once('value');
  const targetData = targetSnap.val();

  if (!targetData) {
    throw new HttpsError('not-found', `No existe registro en RTDB con key ${rtdbKey}`);
  }

  if (targetData.email !== email) {
    throw new HttpsError('invalid-argument',
      `El email proporcionado (${email}) no coincide con el registro RTDB (${targetData.email})`);
  }

  if (targetData.nivel) {
    enforceHierarchy(caller.nivel, targetData.nivel, 'migrar');
  }

  try {
    let authUid: string;
    try {
      const existing = await auth.getUserByEmail(email);
      authUid = existing.uid;
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        const newUser = await auth.createUser({ email, password });
        authUid = newUser.uid;
      } else {
        throw err;
      }
    }

    await db.ref(`usuarios/cliente/${rtdbKey}/authUid`).set(authUid);

    return { success: true, authUid, message: 'Usuario migrado' };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'El email ya existe en Auth con otra cuenta');
    }
    throw new HttpsError('internal', error.message || 'Error en migración');
  }
});
