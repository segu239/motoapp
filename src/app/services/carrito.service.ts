import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private itemsEnCarrito: any[] = [];
  private carritoSubject = new BehaviorSubject<any[]>(this.itemsEnCarrito);

  constructor() {
    this.actualizarCarrito();
  }

  get carritoObservable() {
    return this.carritoSubject.asObservable();
  }

  public actualizarCarrito() {
    const carritoData = localStorage.getItem('carrito');
    if (carritoData) {
      this.itemsEnCarrito = JSON.parse(carritoData);
      this.carritoSubject.next(this.itemsEnCarrito);
    }
  }

 
  // Agregar otros métodos para modificar el carrito y emitir cambios

  agregarItemCarritoJson(clave: string, valor: any): void {
    // Obtener el valor actual para la clave, si existe
    let items = localStorage.getItem(clave);
  
    let array: any[] = [];
    if (items) {
      // Si la clave existe, convertir de JSON a array
      array = JSON.parse(items);
    }
  
    // Agregar el nuevo valor al array
    array.push(valor);
  
    // Guardar el array actualizado en localStorage como una cadena JSON
    localStorage.setItem(clave, JSON.stringify(array));
    this.actualizarCarrito();
  } 
}
