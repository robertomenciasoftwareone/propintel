export interface UrbiAUser {
  email: string;
  nombre: string;
  registradoEn: Date;
}

export interface BusquedaFiltros {
  municipio: string;
  barrio?: string;
  m2Min?: number;
  m2Max?: number;
  precioMaximo: number;
  habitaciones?: number;
  banos?: number;
  exterior?: boolean;
  ascensor?: boolean;
  planta?: string;
}

export interface ResultadoBusqueda {
  id: number;
  latAprox: number;
  lonAprox: number;
  latExacta?: number;
  lonExacta?: number;
  precioTotal: number;
  precioM2: number | null;
  superficieM2: number | null;
  habitaciones: number | null;
  tipoInmueble: string | null;
  semaforoColor: 'rojo' | 'amarillo' | 'verde';
  semaforoPct: number;
  precioMedioZona: number;
  titulo?: string;
  fuente?: string;
  url?: string;
  distrito?: string;
}
