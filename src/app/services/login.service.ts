import { Injectable } from '@angular/core';
import { AngularFireAuth } from "@angular/fire/compat/auth";
import {AngularFireObject,AngularFireList, AngularFireDatabase } from '@angular/fire/compat/database';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginService {//
  userData: any; // Save logged in user data

  //public getLogged = new Subject();

  private response!:AngularFireList<any>;

  constructor(
    //public afs: AngularFirestore,   // Inject Firestore service
    public afAuth: AngularFireAuth, // Inject Firebase auth service
    // private http:HttpClient,
    private db: AngularFireDatabase
    //public router: Router,
    //public ngZone: NgZone // NgZone service to remove outside scope warning
  ) {


   }
   // registerUser(nombre:string,apellido:string,email:string,password:string)
   // {
   //  return this.db.list('admin_usuarios').push({
   //    nombre: nombre,
   //    apellido: apellido,
   //    email: email,
   //    password:password,
   //    nivel:'0'
   //
   //  });
   // }
   editUser(key:string,nombre:string,apellido:string,email:string,password:string,nivel:string)
   {
    return this.db.list('usuarios/cliente').update(key,{
      nombre: nombre,
      apellido: apellido,
      email: email,
      password:password,
      nivel:nivel

    });
   }

   removeUser(key:string)
   {
    return this.db.list('usuarios/cliente').remove(key);
   }
   getAdminUserByItem(item:any,child:string,value:string) // usado para devolver email
   {

   return  this.response=this.db.list(item,ref => ref.orderByChild(child).equalTo(value)); // /comerciales');
   }
   getClientUserByItem(item:any,child:string,value:string) // usado para devolver email
   {

   return  this.response=this.db.list(item,ref => ref.orderByChild(child).equalTo(value)); // /comerciales');
   }
   getAdminUser(item:any)
   {
     return this.db.list(item).snapshotChanges();
   }

   //firebase-----------------------
   SignIn(email:string, password:string) {

    return this.afAuth.signInWithEmailAndPassword(email, password)
      .then((result:any) => {
        return true;
        /* if (result.user.emailVerified == true)
        {

          return true;
        }
        else
        {

          return false;
        } */
      }).catch((error:any) => {
        return error.message;//window.alert(error.message)
      })
  }

  // Sign up with email/password
  SignUp(email:string , password:string ) {
    return this.afAuth.createUserWithEmailAndPassword(email, password)
      .then((result:any) => {
        /* Call the SendVerificaitonMail() function when new user sign
        up and returns promise */
        this.SendVerificationMail();

        return result;
      //  this.SetUserData(result.user);
      }).catch((error:any) => {
        return error.message;//window.alert(error.message)
      })
  }

  // Send email verfificaiton when new user sign up
  SendVerificationMail() {
    return this.afAuth.currentUser//.sendEmailVerification()
    .then((u:any) => {
      u.sendEmailVerification()
      //this.router.navigate(['verify-email-address']);
    })
  }

  // Reset Forggot password
  ForgotPassword(passwordResetEmail:string) {
    return this.afAuth.sendPasswordResetEmail(passwordResetEmail)
    .then(() => {
      window.alert('Se envio un correo para hacer el cambio, revise el spam.');
    }).catch((error) => {
      window.alert(error)
    })
  }

  // Returns true when user is looged in and email is verified
  get isLoggedIn(): boolean {
    const user = JSON.parse(localStorage.getItem('user')!);
    return (user !== null && user.emailVerified !== false) ? true : false;

  }



  setUserData(apellido:string, email:string,nombre:string,password:string,telefono:string)
  {
    return this.db.list('usuarios/cliente').push({

    apellido: apellido,
    email: email,
    nivel:"none",
    nombre: nombre,
    password:password,//
    telefono: telefono,
    });
  }

  signOut()
  {
    return this.afAuth.signOut();
  }
}

