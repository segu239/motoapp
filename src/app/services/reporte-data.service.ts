import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cajamovi } from '../interfaces/cajamovi';

@Injectable({
  providedIn: 'root'
})
export class ReporteDataService {
  // Usar un Map para almacenar datos por sesión/usuario
  private reporteDataMap = new Map<string, BehaviorSubject<Cajamovi[] | null>>();
  
  constructor() { }

  private getSessionId(): string {
    // Generar un ID único de sesión si no existe
    let sessionId = sessionStorage.getItem('reporteSessionId');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('reporteSessionId', sessionId);
    }
    return sessionId;
  }

  private getSubject(): BehaviorSubject<Cajamovi[] | null> {
    const sessionId = this.getSessionId();
    if (!this.reporteDataMap.has(sessionId)) {
      this.reporteDataMap.set(sessionId, new BehaviorSubject<Cajamovi[] | null>(null));
    }
    return this.reporteDataMap.get(sessionId)!;
  }

  public get reporteData$() {
    return this.getSubject().asObservable();
  }

  setReporteData(data: Cajamovi[]): void {
    console.log('ReporteDataService - Guardando datos para sesión:', this.getSessionId());
    this.getSubject().next(data);
  }

  getReporteData(): Cajamovi[] | null {
    return this.getSubject().value;
  }

  clearReporteData(): void {
    console.log('ReporteDataService - Limpiando datos para sesión:', this.getSessionId());
    this.getSubject().next(null);
  }

  // Limpiar datos antiguos para evitar memory leaks
  cleanupOldSessions(): void {
    const currentSessionId = this.getSessionId();
    // Mantener solo la sesión actual y limpiar las demás
    this.reporteDataMap.forEach((_, sessionId) => {
      if (sessionId !== currentSessionId) {
        this.reporteDataMap.delete(sessionId);
      }
    });
  }
}