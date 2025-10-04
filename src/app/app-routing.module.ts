import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['login2']);

import { AuthGuard } from './guards/auth.guard';
import { AngularFireAuthGuard, hasCustomClaim, redirectUnauthorizedTo, redirectLoggedInTo } from '@angular/fire/compat/auth-guard';
import {PagesComponent} from './components/pages.component';
import {LoginComponent} from './components/login/login.component';

//nuevo login
import {Login2Component} from './components/auth/login2/login2.component';
import {UserManagementComponent} from './components/auth/user-management/user-management.component';

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
import { CajaListaComponent } from './components/cajalista/cajalista.component';
import { NewCajaListaComponent } from './components/newcajalista/newcajalista.component';
import { EditCajaListaComponent } from './components/editcajalista/editcajalista.component';
import { CajaconceptoComponent } from './components/cajaconcepto/cajaconcepto.component';
import { NewcajaconceptoComponent } from './components/newcajaconcepto/newcajaconcepto.component';
import { EditcajaconceptoComponent } from './components/editcajaconcepto/editcajaconcepto.component';
import { CajamoviComponent } from './components/cajamovi/cajamovi.component';
import { NewCajamoviComponent } from './components/newcajamovi/newcajamovi.component';
import { EditCajamoviComponent } from './components/editcajamovi/editcajamovi.component';
import { SucursalesComponent } from './components/sucursales/sucursales.component';
import { NopermitidoComponent } from './components/nopermitido/nopermitido.component';
import { ReporteComponent } from './components/reporte/reporte.component';
import { HistorialventasComponent } from './components/historialventas/historialventas.component';
import { Historialventas2Component } from './components/historialventas2/historialventas2.component';
import { CambioPreciosComponent } from './components/cambioprecios/cambioprecios.component';


//nuevouser role
import { UserRole } from './interfaces/user';

import {LoginguardGuard} from './guards/loginguard.guard';
import {SuperGuard} from './guards/super.guard';
import {LogicaGuard} from './guards/logica.guard';
import {AdminGuard} from './guards/admin.guard';

const APP_ROUTES: Routes = [
  
  { path: 'components',component: PagesComponent,
  canActivate:[AuthGuard], data: { roles: [UserRole.SUPER, UserRole.ADMIN, UserRole.USER] },
children:[
   { path: 'puntoventa', component: PuntoventaComponent, data :{titulo:'Punto de Venta'} },
    { path: 'historialventas', component: HistorialventasComponent, data :{titulo:'Historial de Ventas'} },
    { path: 'historialventas2', component: Historialventas2Component, data :{titulo:'Historial de Ventas (Facturas)'} },
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
    {path: 'cajalista', component: CajaListaComponent, data: { titulo: "Cajalista" } },
    { path: 'newcajalista', component: NewCajaListaComponent, data: { titulo: "Nuevo Cajalista" } },
    { path: 'editcajalista', component: EditCajaListaComponent, data: { titulo: "Editar Cajalista" } },
    {path: 'cajaconcepto', component: CajaconceptoComponent, data: { titulo: "Cajaconcepto" } },
    { path: 'newcajaconcepto', component: NewcajaconceptoComponent, data: { titulo: "Nuevo Cajaconcepto" } },
    { path: 'editcajaconcepto', component: EditcajaconceptoComponent, data: { titulo: "Editar Cajaconcepto" } },
    {path: 'cajamovi', component: CajamoviComponent, data: { titulo: "Cajamovi" } },
    { path: 'newcajamovi', component: NewCajamoviComponent, data: { titulo: "Nuevo Cajamovi" } },
    { path: 'editcajamovi', component: EditCajamoviComponent, data: { titulo: "Editar Cajamovi" } },
    { path: 'reporte', component: ReporteComponent, data: { titulo: "Reporte de Movimientos" } },
    { path: 'sucursales', component: SucursalesComponent, canActivate: [AuthGuard], data: { titulo: "Sucursales", roles: [UserRole.SUPER, UserRole.ADMIN] } },
    // Nuevas rutas para la administración de usuarios
    { path: 'user-management', component: UserManagementComponent, canActivate: [AuthGuard], data: { titulo: "Administración de Usuarios", roles: [UserRole.SUPER, UserRole.ADMIN] } },
    // Ruta para cambio masivo de precios - solo SUPER y ADMIN
    { path: 'cambioprecios', component: CambioPreciosComponent, canActivate: [AuthGuard], data: { titulo: "Cambio Masivo de Precios", roles: [UserRole.SUPER, UserRole.ADMIN] } },
]
},

// Rutas para autenticación
// { path: 'login', component: LoginComponent }, // Ruta comentada - ya no se usa, todo redirige a login2
{ path: 'login2', component: Login2Component },
{ path: 'nopermitido', component: NopermitidoComponent },
{ path: '**', pathMatch: 'full', redirectTo: 'login2' },
{path: '', pathMatch: 'full', redirectTo: 'login2'}

];

@NgModule({
  imports: [RouterModule.forRoot(APP_ROUTES)],
  exports: [RouterModule]
})
export class AppRoutingModule { }