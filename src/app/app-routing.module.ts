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
import { CuentacorrienteComponent } from './components/cuentacorriente/cuentacorriente.component';
import { CabecerasComponent } from './components/cabeceras/cabeceras.component';
import { AnalisiscajaComponent } from './components/analisiscaja/analisiscaja.component';
import { AnalisiscajaprodComponent } from './components/analisiscajaprod/analisiscajaprod.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MovimientoComponent } from './components/movimiento/movimiento.component';
import { StockpedidoComponent } from './components/stockpedido/stockpedido.component';
import { StockreciboComponent } from './components/stockrecibo/stockrecibo.component';
import { PedirStockComponent } from './components/pedir-stock/pedir-stock.component';
import { StockenvioComponent } from './components/stockenvio/stockenvio.component';
import { EnviostockpendientesComponent } from './components/enviostockpendientes/enviostockpendientes.component';
import { EnviodestockrealizadosComponent } from './components/enviodestockrealizados/enviodestockrealizados.component';
import { RubroprincipalComponent } from './components/rubroprincipal/rubroprincipal.component';
import { NewrubroprincipalComponent } from './components/newrubroprincipal/newrubroprincipal.component';
import { EditrubroprincipalComponent } from './components/editrubroprincipal/editrubroprincipal.component';
import { RubroComponent } from './components/rubro/rubro.component';
import { NewrubroComponent } from './components/newrubro/newrubro.component';
import { EditrubroComponent } from './components/editrubro/editrubro.component';
import { MarcaComponent } from './components/marca/marca.component';
import { NewmarcaComponent } from './components/newmarca/newmarca.component';
import { EditmarcaComponent } from './components/editmarca/editmarca.component';
import { ArtivaComponent } from './components/artiva/artiva.component';
import { NewartivaComponent } from './components/newartiva/newartiva.component';
import { ProveedoresComponent } from './components/proveedores/proveedores.component';
import { NewproveedorComponent } from './components/newproveedor/newproveedor.component';
import { EditproveedoresComponent } from './components/editproveedores/editproveedores.component';
import { TipomonedaComponent } from './components/tipomoneda/tipomoneda.component';
import { EdittipomonedaComponent } from './components/edittipomoneda/edittipomoneda.component'; 
import { NewtipomonedaComponent } from './components/newtipomoneda/newtipomoneda.component';
import { ValorcambioComponent } from './components/valorcambio/valorcambio.component';
import { NewvalorcambioComponent } from './components/newvalorcambio/newvalorcambio.component';
import { EditvalorcambioComponent } from './components/editvalorcambio/editvalorcambio.component';
import { ConflistaComponent } from './components/conflista/conflista.component';
import { NewconflistaComponent } from './components/newconflista/newconflista.component';
import { EditconflistaComponent } from './components/editconflista/editconflista.component';
import { ArticulosComponent } from './components/articulos/articulos.component';
import { NewarticuloComponent } from './components/newarticulo/newarticulo.component';
import { EditarticuloComponent } from './components/editarticulo/editarticulo.component';


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
    { path: 'cuentacorriente', component: CuentacorrienteComponent, data: {titulo: 'Pagos CC'} },
    { path: 'cabeceras', component: CabecerasComponent, data: {titulo: "CC"} }, 
    {path: 'analisiscaja', component: AnalisiscajaComponent, data: {titulo: "Analisis Caja"} },
    {path: 'analisiscajaprod', component: AnalisiscajaprodComponent, data: {titulo: "Analisis Caja Prod"} },
    {path: 'dashboard', component: DashboardComponent, data: {titulo: "Dashboard"} },
    {path: 'movimiento', component: MovimientoComponent, data: {titulo: "Movimiento"} },
    {path: 'stockpedido', component: StockpedidoComponent, data: {titulo: "Stock Pedido"} },
    {path: 'stockrecibo', component: StockreciboComponent, data: {titulo: "Stock Recibo"} },
    {path: 'pedir-stock', component: PedirStockComponent, data: {titulo: "Pedir Stock"} },
    {path: 'stockenvio', component: StockenvioComponent, data: {titulo: "Enviar Stock"} },
    {path: 'enviostockpendientes', component: EnviostockpendientesComponent, data: {titulo: "Envios Pendientes"} },
    { path: 'enviodestockrealizados', component: EnviodestockrealizadosComponent, data: { titulo: "Envios Realizados" } },
    { path: 'rubroprincipal', component: RubroprincipalComponent, data: { titulo: "Rubro Principal" } },
    { path: 'newrubroprincipal', component: NewrubroprincipalComponent, data: { titulo: "Nuevo Rubro Principal" } },
    {path: 'editrubroprincipal', component: EditrubroprincipalComponent, data: { titulo: "Editar Rubro Principal" } },
    {path: 'rubro', component: RubroComponent, data: { titulo: "Rubro" } },
    {path: 'newrubro', component: NewrubroComponent, data: { titulo: "Nuevo Rubro" } },
    {path: 'editrubro', component: EditrubroComponent, data: { titulo: "Editar Rubro" } },
    {path: 'marca', component: MarcaComponent, data: { titulo: "Marca" }},
    {path: 'newmarca', component: NewmarcaComponent, data: { titulo: "Nueva Marca" } },
    {path: 'editmarca', component: EditmarcaComponent, data: { titulo: "Editar Marca" } },
    {path: 'artiva', component: ArtivaComponent, data: { titulo: "Art Iva" } },
    {path: 'newartiva', component: NewartivaComponent, data: { titulo: "Nuevo Art Iva" } },
    {path: 'proveedores', component: ProveedoresComponent, data: { titulo: "Proveedores" } },
    {path: 'newproveedor', component: NewproveedorComponent, data: { titulo: "Nuevo Proveedor" } },
    { path: 'editproveedores', component: EditproveedoresComponent, data: { titulo: "Editar Proveedor" } },
    { path: 'tipomoneda', component: TipomonedaComponent, data: { titulo: "Tipo Moneda" } },
    { path: 'newtipomoneda', component: NewtipomonedaComponent, data: { titulo: "Nuevo Tipo Moneda" } },
    { path: 'edittipomoneda', component: EdittipomonedaComponent, data: { titulo: "Editar Tipo Moneda" }},
    { path: 'valorcambio', component: ValorcambioComponent, data: { titulo: "Valor Cambio" } },
  { path: 'newvalorcambio', component: NewvalorcambioComponent, data: { titulo: "Nuevo Valor Cambio" } },
  {path: 'editvalorcambio', component: EditvalorcambioComponent, data: { titulo: "Editar Valor Cambio" } },
  {path: 'conflista', component: ConflistaComponent, data: { titulo: "Conflista" } },
  { path: 'newconflista', component: NewconflistaComponent, data: { titulo: "Nuevo Conflista" } },
  { path: 'editconflista', component: EditconflistaComponent, data: { titulo: "Editar Conflista" } },
  {path: 'articulo', component: ArticulosComponent, data: { titulo: "Articulos" } },
  { path: 'newarticulo', component: NewarticuloComponent, data: { titulo: "Nuevo Articulo" } },
  { path: 'editarticulo', component: EditarticuloComponent, data: { titulo: "Editar Articulo" } },
  
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
