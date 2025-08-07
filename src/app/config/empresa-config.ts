export interface EmpresaConfig {
  logo?: string;
  texto?: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
}

export function getEmpresaConfig(): EmpresaConfig {
  const sucursal = sessionStorage.getItem('sucursal');
  
  if (sucursal === '5') {
    // Configuración para sucursal mayorista
    return {
      texto: 'MAYORISTA',
      direccion: 'Vicario Segura 587',
      ciudad: 'Capital - Catamarca',
      telefono: '3834602493',
      email: 'rcarepuestos697@gmail.com'
    };
  }
  
  // Configuración por defecto para todas las demás sucursales
  return {
    logo: 'assets/images/motomatch-logo.jpg',
    direccion: 'Vicario Segura 587',
    ciudad: 'Capital - Catamarca',
    telefono: '3834061575',
    email: 'motomatch01@gmail.com'
  };
}