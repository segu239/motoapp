import { Component, OnInit } from '@angular/core';
//import {AdminGuard} from '../../services/guards/admin.guard';
import {LoginService} from '../../services/login.service';
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
public nombreCliente:string;
//public visibleButton:boolean;
  constructor(private _login:LoginService)//constructor(private _adminGuard:AdminGuard)
  {
    this.nombreCliente=localStorage.getItem('usernameOp');
    //lectura de nivel para permisos-----
    // if(localStorage.getItem("nivel")=="0")
    // {
    //   this.visibleButton = false;
    // }
    // else if(localStorage.getItem("nivel")=="1")
    // {
    //   this.visibleButton = true;
    // }
    //-------------------------------------
   }

  ngOnInit(): void {
  }

salir()
{
  localStorage.setItem('sddccasdf',null);
  localStorage.setItem('sddddasdf',null);
  localStorage.setItem('sddeeasdf',null);
  localStorage.setItem('sddffasdf',null);
  this._login.signOut().then((resp:any)=>console.log(resp));
  //this._adminGuard.login= false;
}
}

