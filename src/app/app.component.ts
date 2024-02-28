import { Component,OnInit } from '@angular/core';
declare function init_plugins();
declare var jQuery:any;
declare var $:any;//
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'motoapp';

  ngOnInit()
  {
    console.log("APP COMPONENTS");
      init_plugins();


  }
}
