import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['login']);

import { AuthGuard } from './guards/auth.guard';
import { AngularFireAuthGuard, hasCustomClaim, redirectUnauthorizedTo, redirectLoggedInTo } from '@angular/fire/compat/auth-guard';
import {PagesComponent} from './components/pages.component';
import {LoginComponent} from './components/login/login.component';

import {PuntoventaComponent} from './components/puntoventa/puntoventa.component'; 
import {EditclienteComponent} from './components/editcliente/editcliente.component'; 
import { NewclienteComponent } from './components/newcliente/newcliente.component';
import { CondicionventaComponent } from './components/condicionventa/condicionventa.component';
import { ProductosComponent } from './components/productos/productos.component';
import { CalculoproductoComponent } from './components/calculoproducto/calculoproducto.component';
import { CarritoComponent } from './components/carrito/carrito.component';
import { VentaComponent } from './components/venta/venta.component';

import {LoginguardGuard} from './guards/loginguard.guard';
import {SuperGuard} from './guards/super.guard';
import {LogicaGuard} from './guards/logica.guard';
import {AdminGuard} from './guards/admin.guard';

const APP_ROUTES: Routes = [
  
  { path: 'components',component: PagesComponent,
  canActivate:[AngularFireAuthGuard, LoginguardGuard], data: { authGuardPipe: redirectUnauthorizedToLogin },// [LoginguardGuard],
children:[
   { path: 'puntoventa', component: PuntoventaComponent, data :{titulo:'Punto de Venta'} },
    { path: 'editcliente', component: EditclienteComponent, data :{titulo:'Editar Cliente'} },
    { path: 'newcliente', component: NewclienteComponent, data :{titulo:'Nuevo Cliente'} },
    { path: 'condicionventa', component: CondicionventaComponent, data :{titulo:'Condicion de Venta'} },
    { path: 'productos', component: ProductosComponent, data :{titulo:'Productos'} },
    { path: 'calculoproducto', component: CalculoproductoComponent, data :{titulo:'Calculo de Producto'} },
    { path: 'carrito', component: CarritoComponent, data :{titulo:'Carrito'} },
    { path: 'venta', component: VentaComponent, data :{titulo:'Venta'} },
    
    
    
  //{ path: 'puntosmedicion', component: PuntosmedicionComponent, data:{titulo: "Puntos Medicion"} },
  //{ path: 'chart/:keygrupo/:keymedicion/:nombregrupo/:nombrepunto', component: ChartComponent, data :{titulo:'Chart'} },
  //{ path: 'admin', component: AdminComponent, data :{titulo:'Admin'} ,canActivate: [SuperGuard]},
  //{ path: 'noway', component: NowayComponent, data :{titulo:'No permitido'}},
  //{ path: 'working', component: WorkingComponent, data :{titulo:'Working'}},
  // { path: 'alarms', component: AlarmsComponent, data :{titulo:'Alarms'}},
  //{ path: 'managealarms', component: ManagealarmsComponent, data :{titulo:'Manage Alarms'}},
  //{ path: 'customimagenes', component: CustomimagenesComponent, data :{titulo:'Custom Imagenes'},canActivate: [SuperGuard]},
  //{ path: 'configuraciones', component: ConfiguracionesComponent, data :{titulo:'Configuraciones'},canActivate: [SuperGuard]},
  //{ path: 'exportar', component: ExportarComponent, data :{titulo:'Exportar'},canActivate: [AdminGuard]},
  //{ path: 'chartanalisis', component: ChartanalisisComponent, data :{titulo:'Analisis'}},
  //{ path: 'adminusuarios', component: AdminusuariosComponent, data :{titulo:'Admin Usuarios'},canActivate: [AdminGuard]},
  //{ path: 'dbmanager', component: DbmanagerComponent, data :{titulo:'DB manager'},canActivate: [SuperGuard]},
  //{ path: 'dispositivos', component: DispositivosComponent, data :{titulo:'Dispositivos Manager'},canActivate: [SuperGuard]}
  // { path: 'cammesa', component: CammesaComponent, data :{titulo:'Cammesa'} },
  // { path: 'cammesahora', component: CammesahoraComponent, data :{titulo:'Cammesa por Hora'} },
  // { path: 'adusuarios', component: AdusuariosComponent, data :{titulo:'Usuarios'},  canActivate: [AdminGuard] },
  // { path: 'notificaciones', component: NotificacionesComponent, data :{titulo:'Notificaciones'},  canActivate: [AdminGuard] },
  // { path: 'analisis/:cd_et/:distribuidor', component: AnalisisComponent, data :{titulo:'Chart Distribuidor'} },
  // { path: 'eventos', component: EventosComponent, data :{titulo:'Eventos'} },
  // { path: 'scada', component: ScadaComponent, data :{titulo:'Scada'} },







]
},


{ path: 'login', component: LoginComponent },
{ path: '**', pathMatch: 'full', redirectTo: 'login' },
{path: '', pathMatch: 'full', redirectTo: 'login'}

];

@NgModule({
  imports: [RouterModule.forRoot(APP_ROUTES)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
