import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AngularFireObject, AngularFireList, AngularFireDatabase } from '@angular/fire/compat/database';
import { first, take } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CrudService {

  private response!: AngularFireList<any>;

  constructor(private http: HttpClient, private db: AngularFireDatabase) {
  }
  getListSnap(item: string) // usado para devolver rubros
  {
    return this.db.list(item).snapshotChanges();
  }//
  getListSnapFilter(item: string, field: any, filter: any) // usado para devolver rubros
  {
    return this.db.list(item, ref => ref.orderByChild(field).equalTo(filter)).snapshotChanges();
  }//
  getListSnapFilterStartEnd(item: string, field: any, filterstart: any, filterend: any) // usado para devolver rubros
  {
    return this.db.list(item, ref => ref.orderByChild(field).startAt(filterstart).endAt(filterend)).snapshotChanges();
  }//
  getListStateLastOne(item: string) {
    return this.db.list(item, ref => ref.limitToLast(1)).stateChanges();
  }
  push(item: string, data: string) {
    return this.db.list(item).push(JSON.parse(data));
  }
  update(item: string, key: string, data: string) {
    return this.db.list(item).update(key, JSON.parse(data));
  }
  remove(item: string, key: string) {
    return this.db.list(item).remove(key);
  }
  getNumeroSecuencial(key: string): Observable<number> {
    return this.db.object('indices/operacion/' + key).valueChanges().pipe(
      map((data: any) => data.secuencial)
    );
  }
  incrementarNumeroSecuencial(key: string, nuevoSecuencial: number): Promise<void> {
    return this.db.object('indices/operacion/' + key).update({ secuencial: nuevoSecuencial });
  }
}

