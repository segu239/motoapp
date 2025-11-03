import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'sucursalNombre'
})
export class SucursalNombrePipe implements PipeTransform {

  /**
   * Mapeo de Firebase values a nombres de sucursales
   * Este mapeo corresponde a los valores almacenados en Firebase
   */
  private mapeoSucursales: { [key: number]: string } = {
    1: 'Casa Central',
    2: 'Valle Viejo',
    3: 'Guemes',
    4: 'Deposito',
    5: 'Mayorista'
  };

  /**
   * Transforma un valor numérico de sucursal a su nombre correspondiente
   * @param value - Número de sucursal (1-5) o string que representa el número
   * @returns Nombre de la sucursal o "Sucursal {value}" si no se encuentra
   */
  transform(value: number | string | null | undefined): string {
    // Manejar valores nulos o indefinidos
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    // Convertir a número si es string
    const num = typeof value === 'string' ? parseInt(value, 10) : value;

    // Validar que sea un número válido
    if (isNaN(num)) {
      return 'N/A';
    }

    // Retornar el nombre mapeado o un valor por defecto
    return this.mapeoSucursales[num] || `Sucursal ${value}`;
  }
}
