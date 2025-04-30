import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { DatePipe } from '@angular/common';

import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { DropdownModule } from 'primeng/dropdown';

import { HttpClientModule } from '@angular/common/http';
import {FormsModule,ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { initializeApp,provideFirebaseApp } from '@angular/fire/app';
import { environment } from '../environments/environment';
import { provideAuth,getAuth } from '@angular/fire/auth';
import { provideDatabase,getDatabase } from '@angular/fire/database';
import { provideFunctions,getFunctions } from '@angular/fire/functions';
import { provideMessaging,getMessaging } from '@angular/fire/messaging';
import { provideStorage,getStorage } from '@angular/fire/storage';
import { AngularFireAuthGuard } from '@angular/fire/compat/auth-guard';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';

import { PagesComponent } from './components/pages.component';
import { FooterComponent } from './shared/footer/footer.component';

import { HeaderComponent } from './shared/header/header.component';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { PuntoventaComponent } from './components/puntoventa/puntoventa.component';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { CalendarModule } from 'primeng/calendar';
import { MultiSelectModule } from 'primeng/multiselect';

import { EditclienteComponent } from './components/editcliente/editcliente.component';
import { NewclienteComponent } from './components/newcliente/newcliente.component';
import { CondicionventaComponent } from './components/condicionventa/condicionventa.component';
import { ProductosComponent } from './components/productos/productos.component';
import { CalculoproductoComponent } from './components/calculoproducto/calculoproducto.component';
import { CarritoComponent } from './components/carrito/carrito.component';
import { VentaComponent } from './components/venta/venta.component';
import { FilterPipe } from './pipes/filter.pipe';
import { AnalisispedidosComponent } from './components/analisispedidos/analisispedidos.component';
import { CuentacorrienteComponent } from './components/cuentacorriente/cuentacorriente.component';
import { CabecerasComponent } from './components/cabeceras/cabeceras.component';
import { CondicionventacabComponent } from './components/condicionventacab/condicionventacab.component';
import { AnalisiscajaComponent } from './components/analisiscaja/analisiscaja.component';
import { PedidosComponent } from './components/pedidos/pedidos.component';
import { RecibosComponent } from './components/recibos/recibos.component';
import { GrillaComponent } from './components/grilla/grilla.component';
import { DateFormatPipe } from './pipes/dateformat.pipe';
import { AnalisiscajaprodComponent } from './components/analisiscajaprod/analisiscajaprod.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MovimientoComponent } from './components/movimiento/movimiento.component';
import { StockpedidoComponent } from './components/stockpedido/stockpedido.component';
import { StockreciboComponent } from './components/stockrecibo/stockrecibo.component';
import { PedirStockComponent } from './components/pedir-stock/pedir-stock.component';
import { StockproductopedidoComponent } from './components/stockproductopedido/stockproductopedido.component';
import { StockenvioComponent } from './components/stockenvio/stockenvio.component';
import { DialogService } from 'primeng/dynamicdialog';
import { StockproductoenvioComponent } from './components/stockproductoenvio/stockproductoenvio.component';
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
import { NewtipomonedaComponent } from './components/newtipomoneda/newtipomoneda.component';
import { EdittipomonedaComponent } from './components/edittipomoneda/edittipomoneda.component';
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
import { EditCajaListaComponent } from './components/editcajalista/editcajalista.component';
import { NewCajaListaComponent } from './components/newcajalista/newcajalista.component';

// Nuevos componentes para autenticación
import { Login2Component } from './components/auth/login2/login2.component';
import { UserManagementComponent } from './components/auth/user-management/user-management.component';

// Servicios y Guards
import { AuthService } from './services/auth.service';
import { AuthGuard } from './guards/auth.guard';
import { CajaconceptoComponent } from './components/cajaconcepto/cajaconcepto.component';
import { NewcajaconceptoComponent } from './components/newcajaconcepto/newcajaconcepto.component';
import { EditcajaconceptoComponent } from './components/editcajaconcepto/editcajaconcepto.component';
import { CajamoviComponent } from './components/cajamovi/cajamovi.component';
import { NewCajamoviComponent } from './components/newcajamovi/newcajamovi.component';
import { EditCajamoviComponent } from './components/editcajamovi/editcajamovi.component';


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    PagesComponent,
    FooterComponent,
  
    HeaderComponent,
    SidebarComponent,
    PuntoventaComponent,
    EditclienteComponent,
    NewclienteComponent,
    CondicionventaComponent,
    ProductosComponent,
    CalculoproductoComponent,
    CarritoComponent,
    VentaComponent,
    FilterPipe,
    AnalisispedidosComponent,
    CuentacorrienteComponent,
    CabecerasComponent,
    CondicionventacabComponent,
    AnalisiscajaComponent,
    PedidosComponent,
    RecibosComponent,
    GrillaComponent,
    DateFormatPipe,
    AnalisiscajaprodComponent,
    DashboardComponent,
    MovimientoComponent,
    StockpedidoComponent,
    StockreciboComponent,
    PedirStockComponent,
    StockproductopedidoComponent,
    StockenvioComponent,
    StockproductoenvioComponent,
    EnviostockpendientesComponent,
    EnviodestockrealizadosComponent,
    RubroprincipalComponent,
    NewrubroprincipalComponent,
    EditrubroprincipalComponent,
    RubroComponent,
    NewrubroComponent,
    EditrubroComponent,
    MarcaComponent,
    NewmarcaComponent,
    EditmarcaComponent,
    ArtivaComponent,
    NewartivaComponent,
    ProveedoresComponent,
    NewproveedorComponent,
    EditproveedoresComponent,
    TipomonedaComponent,
    NewtipomonedaComponent,
    EdittipomonedaComponent,
    ValorcambioComponent,
    NewvalorcambioComponent,
    EditvalorcambioComponent,
    ConflistaComponent,
    NewconflistaComponent,
    EditconflistaComponent,
    ArticulosComponent,
    NewarticuloComponent,
    EditarticuloComponent,
    
    // Nuevos componentes
    Login2Component,
    UserManagementComponent,
    CajaListaComponent,
    EditCajaListaComponent,
    NewCajaListaComponent,
    CajaconceptoComponent,
    NewcajaconceptoComponent,
    EditcajaconceptoComponent,
    CajamoviComponent,
    NewCajamoviComponent,
    EditCajamoviComponent,
  ],
  imports: [
    ButtonModule,
    TableModule,
    CalendarModule,
    MultiSelectModule,
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    DynamicDialogModule,
    DropdownModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideDatabase(() => getDatabase()),
    provideFunctions(() => getFunctions()),
    provideMessaging(() => getMessaging()),
    provideStorage(() => getStorage())
  ],
  providers: [DialogService,  DatePipe, AngularFireAuthGuard, { provide: FIREBASE_OPTIONS, useValue: environment.firebase}],
  bootstrap: [AppComponent]
})
export class AppModule { }
