export interface TokenDTO {
  token: string;
  id: number;
  authorities: string;
}


export interface AuthorityDTO {
  id?: number;
  name: string;
}

export interface UserDTO {
  id?: number;
  nombres: string;
  apellidos: string;
  correo: string;
  estado?: boolean;
}

export interface UserRegistroDTO {
  nombres: string;
  apellidos: string;
  correo: string;
  password: string;
}

export interface UserActualizarDTO {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
}

export interface UserCambioPasswordDTO {
  userId: number;
  passwordActual: string;
  passwordNueva: string;
}

export interface Embarcacion {
  id?: number;
  nombre: string;
  matricula: string;
  capacidadToneladas: number;
  usuario?: { id: number };
}

export interface ZonaPesca {
  id?: number;
  nombreZona: string;
  latitud: number;
  longitud: number;
  distanciaCostaKm: number;
  radioAreaKm: number;
}

export interface EspeciePezDTO {
  id?: number;
  nombreComun: string;
  nombreCientifico?: string | null;
  estadoVeda: boolean;
}

export interface TemporadaDTO {
  id?: number;
  nombreTemporada: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface CuotaPescaDTO {
  id?: number;
  limiteToneladasIndustrial: number;
  especieId: number;
  temporadaId: number;
  especie?: EspeciePezDTO;
}

export interface CuotaPescaReqUpdDTO {
  id?: number;
  limiteToneladasIndustrial: number;
  especieId: number;
  temporadaId: number;
}

export interface FaenaDTO {
  id?: number;
  fechaHoraSalidaProgramada?: string | null;
  fechaHoraLlegadaEstimada?: string | null;
  fechaHoraSalida?: string | null;
  fechaHoraLlegada?: string | null;
  estado: string;
  usuarioId: number;
  embarcacionId: number;
}

export interface FaenaDetalle {
  id: number;
  fechaHoraSalidaProgramada?: string | null;
  fechaHoraLlegadaEstimada?: string | null;
  fechaHoraSalida?: string | null;
  fechaHoraLlegada?: string | null;
  estado: string;
  usuario?: UserDTO;
  embarcacion?: Embarcacion;
}

export interface FaenaRequestDTO {
  fechaHoraSalidaProgramada: string;
  fechaHoraLlegadaEstimada?: string | null;
  embarcacionId: number;
}

export interface FaenaUpdateDTO {
  fechaHoraSalidaProgramada?: string | null;
  fechaHoraLlegadaEstimada?: string | null;
  embarcacionId?: number | null;
}

export interface BitacoraDTO {
  id?: number;
  latitud: number;
  longitud: number;
  fechaHoraRegistro?: string;
  observaciones: string;
  faenaId: number;
  zonaPescaId?: number | null;
}

export interface BitacoraRequestDTO {
  faenaId: number;
  zonaPescaId?: number | null;
  latitud: number;
  longitud: number;
  observaciones: string;
}

export interface BitacoraUpdateDTO {
  id: number;
  latitud?: number | null;
  longitud?: number | null;
  zonaPescaId?: number | null;
  observaciones?: string | null;
}

export interface DetalleCapturaDTO {
  id?: number;
  volumenKg: number;
  bitacoraId: number;
  especieId: number;
}

export interface DetalleCapturaRequestDTO {
  volumenKg: number;
  bitacoraId?: number;
  especieId: number;
}

export interface CondicionClimatica {
  id?: number;
  temperaturaCelsius: number | null;
  velocidadVientoNudos: number | null;
  estadoOleaje: string;
}

export interface GastoOperativo {
  id?: number;
  galonesCombustible: number;
  costoCombustible: number;
  costoHieloInsumos: number;
}

export interface RecomendacionIA {
  id?: number;
  analisisTexto: string;
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO';
  fechaGeneracion?: string;
  faena?: FaenaDetalle;
}

export interface BitacoraReporte extends BitacoraDTO {
  nombreZona: string;
  capturas: DetalleCapturaDTO[];
  clima: CondicionClimatica | null;
}
