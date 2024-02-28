import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import {LoginService} from '../services/login.service';
import { CryptoService } from '../services/crypto.service';

@Injectable({
  providedIn: 'root'
})
export class LoginguardGuard implements CanActivate {

    private login:boolean=false;
    private a:boolean=false;
constructor(private router:Router, private _login:LoginService, private _crypto: CryptoService){}
  canActivate(): boolean {
  
    let a=localStorage.getItem('sddffasdf');
    a= this._crypto.decrypt(a);
    if(a== 'super' || a == "admin" || a=="user")
  {
    this.login=true;

  }
  else
  {
    this.login=false;
    this.router.navigate(['/login']);
  }

  return this.login;
  }

  // canActivate(): Promise<boolean>{

   // this.promise().then((resp:any)=>{
   //   if (resp != "fallo")
   //   {
   //     localStorage.setItem('logica',resp);
   //     return true;
   //   }
   //   else
   //   {
   //     return false;
   //   }
   // },()=>{return false} );
   // return new Promise((resolve) => {
     // this._crud.getListSnap('configuraciones').pipe(take(1)).subscribe((resp:any)=>{
     //   let logica=resp[0].payload.val().positivoalto;
     //   localStorage.setItem('logica',logica);
     //   resolve(true);
     //
     // }, (error)=>{resolve(false)});

   // });

   // }

}
