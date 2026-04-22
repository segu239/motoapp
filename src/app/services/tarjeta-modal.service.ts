import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

export interface DatosTarjeta {
  titular: string;
  dni: string;
  numero: string;
}

@Injectable({ providedIn: 'root' })
export class TarjetaModalService {

  private readonly styles = `
    <style>
      .tarjeta-form { padding: 0 15px; max-width: 800px; margin: 0 auto; }
      .tarjeta-card {
        background-color: #fcfcfc;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        margin-bottom: 20px;
      }
      .tarjeta-header {
        background-color: #d1ecf1;
        color: #0c5460;
        padding: 15px;
        font-weight: 600;
        border-bottom: 1px solid #bee5eb;
        display: flex;
        align-items: center;
      }
      .tarjeta-header i { margin-right: 10px; }
      .tarjeta-section { padding: 20px; }
      .form-row { display: flex; flex-wrap: wrap; margin-bottom: 15px; }
      .form-group { flex: 1; min-width: 250px; padding: 0 10px; margin-bottom: 15px; }
      .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 600;
        color: #555;
        font-size: 14px;
      }
      .form-control {
        width: 100%;
        padding: 10px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        font-size: 14px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .form-control:focus {
        border-color: #80bdff;
        outline: 0;
        box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
      }
      input[type="number"].form-control { border-left: 3px solid #28a745; }
      input[type="text"].form-control { border-left: 3px solid #007bff; }
      .card-input { border-left: 3px solid #17a2b8 !important; font-weight: 600; }
      .section-title {
        font-size: 16px;
        color: #343a40;
        margin: 15px 0;
        padding-left: 10px;
        border-left: 4px solid #17a2b8;
      }
      @media (max-width: 768px) {
        .form-group { flex: 100%; }
      }
    </style>
  `;

  abrirFormularioTarjeta(opciones: { titulo?: string } = {}): Promise<DatosTarjeta | null> {
    const titulo = opciones.titulo ?? '';

    return Swal.fire({
      title: titulo,
      width: 800,
      html: this.styles + `
        <div class="tarjeta-form">
          <div class="tarjeta-card">
            <div class="tarjeta-header">
              <i class="fa fa-credit-card"></i> Información de la Tarjeta
            </div>
            <div class="tarjeta-section">
              <p style="color:#6c757d;font-size:13px;margin:0 0 15px 10px;">
                <i class="fa fa-info-circle"></i> Solo el <strong>DNI</strong> es obligatorio. El resto de los datos son opcionales.
              </p>
              <h4 class="section-title">Datos del Titular</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="titular"><i class="fa fa-user"></i> Nombre del Titular <span style="color:#6c757d;font-weight:400;">(opcional)</span></label>
                  <input type="text" id="titular" class="form-control" placeholder="Ingrese el nombre completo">
                </div>
                <div class="form-group">
                  <label for="dni"><i class="fa fa-id-card"></i> DNI <span style="color:#dc3545;">*</span></label>
                  <input type="number" id="dni" class="form-control" placeholder="Ingrese el DNI">
                </div>
              </div>

              <h4 class="section-title">Datos de la Tarjeta</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="numero"><i class="fa fa-credit-card"></i> Número de Tarjeta <span style="color:#6c757d;font-weight:400;">(opcional)</span></label>
                  <input type="text" id="numero" class="form-control card-input" inputmode="numeric" pattern="[0-9]*" maxlength="19" placeholder="Entre 4 y 19 dígitos (opcional)">
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      confirmButtonColor: '#17a2b8',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#dc3545',
      focusConfirm: false,
      preConfirm: () => {
        const titular = (document.getElementById('titular') as HTMLInputElement).value;
        const dni = (document.getElementById('dni') as HTMLInputElement).value;
        const numero = (document.getElementById('numero') as HTMLInputElement).value;

        if (!dni) {
          Swal.showValidationMessage('El DNI es obligatorio');
          return false;
        }

        const reNumero = /^[0-9]{4,19}$/;
        const reDni = /^[0-9]{8}$/;
        const reTitular = /^[a-zA-Z ]{1,40}$/;

        if (!reDni.test(dni)) {
          Swal.showValidationMessage('El DNI no es válido. Debe contener exactamente 8 dígitos.');
          return false;
        }
        if (titular && !reTitular.test(titular)) {
          Swal.showValidationMessage('El titular no es válido. Debe contener solo letras y espacios.');
          return false;
        }
        if (numero && !reNumero.test(numero)) {
          Swal.showValidationMessage('El número de tarjeta debe contener entre 4 y 19 dígitos.');
          return false;
        }

        return { titular: titular || '', dni, numero: numero || '' };
      }
    }).then((result) => {
      if (result.value) {
        return result.value as DatosTarjeta;
      }
      return null;
    });
  }
}
