import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import {LoginService} from '../services/login.service';
import { CryptoService } from '../services/crypto.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

    private login:boolean=false;
    private a:boolean=false;

constructor(private router:Router, private _login:LoginService, private _crypto: CryptoService){}
  canActivate(): boolean {
    let a=localStorage.getItem('sddffasdf');
    a= this._crypto.decrypt(a);
    if(a== 'super' || a== 'admin')
  {
    this.login=true;

  }
  else
  {
    this.login=false;
    this.router.navigate(['./components/noway']);
  }
  return this.login;
  }

}
