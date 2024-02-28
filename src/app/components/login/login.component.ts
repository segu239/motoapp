import { Component, OnInit } from '@angular/core';
import {NgForm} from '@angular/forms';
import { FormGroup, FormControl, Validators, ValidatorFn } from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {LoginService} from '../../services/login.service';
// // import * as swal from 'sweetalert';
import Swal from 'sweetalert2';

import { CryptoService } from '../../services/crypto.service';
import {CrudService} from '../../services/crud.service';

//import { AngularFireStorage } from '@angular/fire/storage';



import { first, take } from 'rxjs/operators'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  forma:FormGroup;

public validacion:boolean=false;
public mail:string;
public check:boolean=false;

public Email:string;
public password:string;
public errorhttp:string;
public spinerbotoningresar:boolean=true;

public sucursal:string;

  constructor(private _login:LoginService, private router:Router,private _crypto: CryptoService, private _crud: CrudService) 
  { 

  }//

  ngOnInit() {
    if (localStorage.getItem('sddccasdf') != null)
    {
      let check:string= localStorage.getItem('sddccasdf');
      if (check == "true")
      {
        this.check=true;
      }
      else
      {
        this.check=false;
      }
    }

     //console.log("oninit");
    //login con datos guardados--------------------
    if (localStorage.getItem("sddddasdf") !== null && localStorage.getItem("sddeeasdf") !== null)
    {
    let email:any= localStorage.getItem('sddddasdf');//email
    let pass:any= localStorage.getItem('sddeeasdf');//password

 //console.log(email);
  //console.log(pass);

  //console.log("email y pass exists");
  email= this._crypto.decrypt(email);
  pass = this._crypto.decrypt(pass);
  this._login.SignIn(email,pass).then((resp)=>{
    if (resp == true)
    {
      this.router.navigate(['./components/puntoventa']);
    }
    // else
    // {
    //   localStorage.setItem('sddddasdf', null);
    //   localStorage.setItem('sddeeasdf', null);
    // }
  });
}
    // if (email != 'null' && pass != 'null')
    // {

    //}




     this.forma= new FormGroup({

   email: new FormControl(null, [Validators.required, Validators.email]),// primer valor es el valor por defecto,
   password: new FormControl(null, Validators.required)
  });

    }
    // ingresoPromise(email:string)
    // {
    //
    //  let promesa= new Promise((resolve,reject)=>{
    //    this._login.getClientUserByItem('usuarios/cliente','email',email)//this._login.getAdminUserByItem('admin_usuarios','email',email)
    //    .snapshotChanges().subscribe((resp)=>{
    //
    //     resolve(resp);
    //  });
    //  });
    // return promesa;
    //
    // }
  ingresar(f:any)
  {
    if (this.sucursal == null)
    {
      Swal.fire({
        title: 'ERROR',
        text: 'Debe seleccionar una sucursal',
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'OK',
    //cancelButtonText: 'Cancelar'
  });
    }
    else
    {


    localStorage.setItem('sucursal', this.sucursal);

    this.checkPromise().then(()=>{
      console.log("email:" + f.value.email + " pass:" + f.value.password);
      //login online---------------------------------
     this._login.SignIn(f.value.email,f.value.password).then((resp)=>{//("alfredovelazco@catamarca.gov.ar","alfredocamaleon").then(()=>{
       console.log("LOGIN" + resp);
       if (resp == true)
       {
         this._crud.getListSnapFilter('usuarios/cliente','email',f.value.email).pipe(take(1)).subscribe((resp2:any)=>{
           //console.log(resp2[0].payload.val());
           //console.log(JSON.stringify(resp2[0]));
           //localStorage.setItem('sucursal', resp2[0].payload.val().sucursal);
           //localStorage.setItem('cod_ven', resp2[0].payload.val().cod_ven);
           //localStorage.setItem('vendedor', resp2[0].payload.val().vendedor);
            //localStorage.setItem('sucursalNombre',resp2[0].payload.val().sucursalNombre);// sddaaasdf:nombre,
            localStorage.setItem('usernameOp',resp2[0].payload.val().username);
            localStorage.setItem('emailOp',resp2[0].payload.val().email);
           localStorage.setItem('sddffasdf',this._crypto.encrypt(resp2[0].payload.val().nivel));// sddffasdf:nivel,
           localStorage.setItem('sddggasdf',resp2[0].key);//sddggasdf userkey
           f.reset();
           this.router.navigate(['./components/puntoventa']);//this.router.navigate(['./components/dashboard']);
         });

         if (this.check == true)
         {

           localStorage.setItem('sddccasdf',"true");// sddccasdf:check, cdkcdck:true
           localStorage.setItem('sddddasdf',this._crypto.encrypt(f.value.email ));// sddddasdf:mail, cdkcdck:true
           localStorage.setItem('sddeeasdf',this._crypto.encrypt(f.value.password));// sddeeasdf:pass, cdkcdck:true

         }

         else
         {
           localStorage.setItem('sddccasdf',"false");// sddccasdf:check, cdkcdck:true
           localStorage.setItem('sddddasdf',this._crypto.encrypt(null ));// sddddasdf:mail, cdkcdck:true
           localStorage.setItem('sddeeasdf',this._crypto.encrypt(null));// sddeeasdf:pass, cdkcdck:true
         }

      }
      else
      {
        localStorage.setItem('sddddasdf',this._crypto.encrypt(null ));// sddddasdf:mail, cdkcdck:true
        localStorage.setItem('sddeeasdf',this._crypto.encrypt(null));// sddeeasdf:pass, cdkcdck:true

        f.reset();
        Swal.fire({
                   title: 'ERROR',
                   text: 'email o usuario incorrectos',
                   icon: 'error',
                   showCancelButton: true,
                   confirmButtonColor: '#3085d6',
                   cancelButtonColor: '#d33',
                   confirmButtonText: 'OK',
               //cancelButtonText: 'Cancelar'
             });
      }

     })

    });



  }

  }

  async forgot()
{
  const { value: email } = await Swal.fire({
  title: 'Input email address',
  input: 'email',
  inputLabel: 'Your email address',
  inputPlaceholder: 'Enter your email address'
})

if (email) {
  this._login.ForgotPassword(email);
  // Swal.fire(`Entered email: ${email}`)
}
}

checkPromise()
{
  let promise= new Promise ((resolve,reject)=>{

    if (this.check == true)
    {
      localStorage.setItem('sddccasdf',"true");
    }
    else
    {
      localStorage.setItem('sddccasdf',"false");
    }

    resolve(1);
  });
  return promise;

}

onSelectionChange(event:any)
{
  this.sucursal=event.target.value;
  //console.log(this.sucursal);
}
}
