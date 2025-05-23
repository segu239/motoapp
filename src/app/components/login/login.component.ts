import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { FormGroup, FormControl, Validators, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginService } from '../../services/login.service';
import Swal from 'sweetalert2';
import { CryptoService } from '../../services/crypto.service';
import { CrudService } from '../../services/crud.service';
import { first, take } from 'rxjs/operators'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  forma: FormGroup;
  public validacion: boolean = false;
  public mail: string;
  public check: boolean = false;
  public Email: string;
  public password: string;
  public errorhttp: string;
  public spinerbotoningresar: boolean = true;
  public sucursal: string;
  constructor(private _login: LoginService, private router: Router, private _crypto: CryptoService, private _crud: CrudService) {

  }//
  ngOnInit() {
    if (sessionStorage.getItem('sddccasdf') != null) {
      let check: string = sessionStorage.getItem('sddccasdf');
      if (check == "true") {
        this.check = true;
      }
      else {
        this.check = false;
      }
    }
    //login con datos guardados--------------------
    if (sessionStorage.getItem("sddddasdf") !== null && sessionStorage.getItem("sddeeasdf") !== null) {
      let email: any = sessionStorage.getItem('sddddasdf');//email
      let pass: any = sessionStorage.getItem('sddeeasdf');//password
      email = this._crypto.decrypt(email);
      pass = this._crypto.decrypt(pass);
      this._login.SignIn(email, pass).then((resp) => {
        if (resp == true) {
          this.router.navigate(['./components/puntoventa']);
        }
      });
    }
    this.forma = new FormGroup({
      email: new FormControl(null, [Validators.required, Validators.email]),// primer valor es el valor por defecto,
      password: new FormControl(null, Validators.required)
    });
  }
  ingresar(f: any) {
    if (this.sucursal == null) {
      Swal.fire({
        title: 'ERROR',
        text: 'Debe seleccionar una sucursal',
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'OK',
      });
    }
    else {
      sessionStorage.setItem('sucursal', this.sucursal);
      this.checkPromise().then(() => {
        console.log("email:" + f.value.email + " pass:" + f.value.password);
        //login online---------------------------------
        this._login.SignIn(f.value.email, f.value.password).then((resp) => {
          console.log("LOGIN" + resp);
          if (resp == true) {
            this._crud.getListSnapFilter('usuarios/cliente', 'email', f.value.email).pipe(take(1)).subscribe((resp2: any) => {
              sessionStorage.setItem('usernameOp', resp2[0].payload.val().username);
              sessionStorage.setItem('emailOp', resp2[0].payload.val().email);
              sessionStorage.setItem('sddffasdf', this._crypto.encrypt(resp2[0].payload.val().nivel));// sddffasdf:nivel,
              sessionStorage.setItem('sddggasdf', resp2[0].key);//sddggasdf userkey
              f.reset();
              this.router.navigate(['./components/puntoventa']);//this.router.navigate(['./components/dashboard']);
            });
            if (this.check == true) {
              sessionStorage.setItem('sddccasdf', "true");// sddccasdf:check, cdkcdck:true
              sessionStorage.setItem('sddddasdf', this._crypto.encrypt(f.value.email));// sddddasdf:mail, cdkcdck:true
              sessionStorage.setItem('sddeeasdf', this._crypto.encrypt(f.value.password));// sddeeasdf:pass, cdkcdck:true
            }
            else {
              sessionStorage.setItem('sddccasdf', "false");// sddccasdf:check, cdkcdck:true
              sessionStorage.setItem('sddddasdf', this._crypto.encrypt(null));// sddddasdf:mail, cdkcdck:true
              sessionStorage.setItem('sddeeasdf', this._crypto.encrypt(null));// sddeeasdf:pass, cdkcdck:true
            }
          }
          else {
            sessionStorage.setItem('sddddasdf', this._crypto.encrypt(null));// sddddasdf:mail, cdkcdck:true
            sessionStorage.setItem('sddeeasdf', this._crypto.encrypt(null));// sddeeasdf:pass, cdkcdck:true
            f.reset();
            Swal.fire({
              title: 'ERROR',
              text: 'email o usuario incorrectos',
              icon: 'error',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'OK',
            });
          }
        })
      });
    }
  }
  async forgot() {
    const { value: email } = await Swal.fire({
      title: 'Input email address',
      input: 'email',
      inputLabel: 'Your email address',
      inputPlaceholder: 'Enter your email address'
    })
    if (email) {
      this._login.ForgotPassword(email);
    }
  }

  checkPromise() {
    let promise = new Promise((resolve, reject) => {
      if (this.check == true) {
        sessionStorage.setItem('sddccasdf', "true");
      }
      else {
        sessionStorage.setItem('sddccasdf', "false");
      }
      resolve(1);
    });
    return promise;
  }
  onSelectionChange(event: any) {
    this.sucursal = event.target.value;
  }
}
