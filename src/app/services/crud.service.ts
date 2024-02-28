import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {AngularFireObject,AngularFireList, AngularFireDatabase } from '@angular/fire/compat/database';
import { first, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { switchMap,map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CrudService {

private response!:AngularFireList<any>;

  constructor(private http:HttpClient, private db: AngularFireDatabase)
  {

   }
   // getList(item:any)
   // {
   //
   // return  this.db.list(item).valueChanges(); // /comerciales');
   // }

   getListSnap(item:string) // usado para devolver rubros
   {

   return   this.db.list(item).snapshotChanges();
   //return   this.db.list(item,ref=>ref.orderByChild('fecha_vencimiento')).snapshotChanges();
  }//

  getListSnapFilter(item:string,field:any ,filter:any) // usado para devolver rubros
  {

  return   this.db.list(item, ref => ref.orderByChild(field).equalTo(filter)).snapshotChanges();
  //return   this.db.list(item,ref=>ref.orderByChild('fecha_vencimiento')).snapshotChanges();
 }//
 getListSnapFilterStartEnd(item:string,field:any ,filterstart:any, filterend:any) // usado para devolver rubros
 {

 return   this.db.list(item, ref => ref.orderByChild(field).startAt(filterstart).endAt(filterend)).snapshotChanges();
 //return   this.db.list(item,ref=>ref.orderByChild('fecha_vencimiento')).snapshotChanges();
}//
  getListStateLastOne(item:string)
  {
    return this.db.list(item, ref=> ref.limitToLast(1)).stateChanges();
  }

  push(item:string, data:string)
  {

   return this.db.list(item).push(JSON.parse(data));
  }

  update(item:string,key:string, data:string)
  {
    return this.db.list(item).update(key,JSON.parse(data));
  }
   // getListRubrosEdit(item:string,rubro:string) // usado para devolver subrubros
   // {
   //
   // return   this.db.list(item,ref => ref.orderByChild('boton').equalTo(rubro)).snapshotChanges(); // /comerciales');
   // }
   //
   //
   //
   //
   // editRubro(key:string,boton:string, imagen:string)
   // {
   //  return this.db.list('rubros').update(key,{
   //    boton: boton,
   //    imagen_despleg: imagen,
   //
   //  });
   // }

   remove(item:string,key:string)
   {
    return this.db.list(item).remove(key);
   }

   // removeFilter(item:string,field:string,filter:string)
   // {
   //   this.db.list(item, ref => ref.orderByChild(field).equalTo(filter)).snapshotChanges().
   //   pipe(take(1)).subscribe((resp:any)=>{
   //
   //     console.log("REMOVE:" + resp[0].key);
   //     return this.db.list(item).remove(resp[0].key);
   //
   //   });
   //   //this.db.list(item).remove(key);
   // }

   // removeFilterStartEnd(item:string,field:any ,filterstart:any, filterend:any) // usado para devolver rubros
   // {
   //
   // this.db.list(item, ref => ref.orderByChild(field).startAt(filterstart).endAt(filterend)).snapshotChanges().
   //   pipe(take(1)).subscribe((resp:any)=>{
   //
   //     console.log("REMOVE:" + resp[0].key);
   //     //this.db.list(item).remove(resp[0].key);
   //
   //   });
   //
   // }
  //}//

  //consultar indices 
  // Crear la función que actualiza el número secuencial y lo devuelve
  /* getNumeroSecuencial (key:string): Observable<number> {
    return this.db.object('indices/operacion/' + key ).valueChanges().pipe(
      switchMap( (data: any) => {
        console.log('de service numerosecuancial:' + data.secuencial);
        let nuevoSecuencial = data.secuencial + 1;
        // Aquí necesitas reemplazar 'rutaClave' con la ruta correcta a la que quieres actualizar
        return this.db.object('indices/operacion/' + key).update({secuencial: nuevoSecuencial}).then(() => nuevoSecuencial);
      })
    );
  } */
  getNumeroSecuencial(key: string): Observable<number> {
    return this.db.object('indices/operacion/' + key).valueChanges().pipe(
      map((data: any) => data.secuencial)
    );
  }

  incrementarNumeroSecuencial(key: string, nuevoSecuencial: number): Promise<void> {
    return this.db.object('indices/operacion/' + key).update({ secuencial: nuevoSecuencial });
  }
}

