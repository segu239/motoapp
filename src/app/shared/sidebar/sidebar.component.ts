import { Component, OnInit } from '@angular/core';
import {LoginService} from '../../services/login.service';
@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
public nombreCliente:string;
  constructor(private _login:LoginService)
  {
    this.nombreCliente=localStorage.getItem('usernameOp');
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
}
}

