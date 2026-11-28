import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CuotaPescaDTO, CuotaPescaReqUpdDTO, EspeciePezDTO, TemporadaDTO } from '../models/rafishdar.models';


@Injectable({ providedIn: 'root' })
export class NormativaService {
  private base = environment.apiUrl;
  constructor(private http: HttpClient) {}


  listarEspecies(): Observable<EspeciePezDTO[]> { return this.http.get<EspeciePezDTO[]>(`${this.base}/especies`); }
  buscarEspeciePorId(id: number): Observable<EspeciePezDTO> { return this.http.get<EspeciePezDTO>(`${this.base}/especies/${id}`); }
  listarEspeciesPorVeda(estado: boolean): Observable<EspeciePezDTO[]> { return this.http.get<EspeciePezDTO[]>(`${this.base}/especies/veda/${estado}`); }
  buscarEspecie(nombreComun: string): Observable<EspeciePezDTO[]> {
    const params = new HttpParams().set('nombreComun', nombreComun);
    return this.http.get<EspeciePezDTO[]>(`${this.base}/especies/buscar`, { params });
  }
  insertarEspecie(dto: EspeciePezDTO): Observable<EspeciePezDTO> { return this.http.post<EspeciePezDTO>(`${this.base}/especies`, dto); }
  actualizarEspecie(dto: EspeciePezDTO): Observable<EspeciePezDTO> {
    if (!dto.id) throw new Error('El ID de la especie es obligatorio para actualizar.');
    const { id, nombreComun, nombreCientifico, estadoVeda } = dto;
    return this.http.put<EspeciePezDTO>(`${this.base}/especies/${id}`, { nombreComun, nombreCientifico, estadoVeda });
  }
  eliminarEspecie(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/especies/${id}`); }

  listarTemporadas(): Observable<TemporadaDTO[]> { return this.http.get<TemporadaDTO[]>(`${this.base}/temporadas`); }
  buscarTemporadaPorId(id: number): Observable<TemporadaDTO> { return this.http.get<TemporadaDTO>(`${this.base}/temporadas/${id}`); }
  listarTemporadasVigentes(): Observable<TemporadaDTO[]> { return this.http.get<TemporadaDTO[]>(`${this.base}/temporadas/vigentes`); }
  buscarTemporadasSuperpuestas(inicio: string, fin: string): Observable<TemporadaDTO[]> {
    const params = new HttpParams().set('inicio', inicio).set('fin', fin);
    return this.http.get<TemporadaDTO[]>(`${this.base}/temporadas/superpuestas`, { params });
  }
  insertarTemporada(dto: TemporadaDTO): Observable<TemporadaDTO> { return this.http.post<TemporadaDTO>(`${this.base}/temporadas`, dto); }
  actualizarTemporada(dto: TemporadaDTO): Observable<TemporadaDTO> {
    if (!dto.id) throw new Error('El ID de la temporada es obligatorio para actualizar.');
    const { id, nombreTemporada, fechaInicio, fechaFin } = dto;
    return this.http.put<TemporadaDTO>(`${this.base}/temporadas/${id}`, { nombreTemporada, fechaInicio, fechaFin });
  }
  eliminarTemporada(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/temporadas/${id}`); }

  listarCuotas(): Observable<CuotaPescaDTO[]> { return this.http.get<CuotaPescaDTO[]>(`${this.base}/cuotas-pesca`); }
  buscarCuotaPorId(id: number): Observable<CuotaPescaDTO> { return this.http.get<CuotaPescaDTO>(`${this.base}/cuotas-pesca/${id}`); }
  listarCuotasPorEspecie(especieId: number): Observable<CuotaPescaDTO[]> { return this.http.get<CuotaPescaDTO[]>(`${this.base}/cuotas-pesca/especie/${especieId}`); }
  listarCuotasPorTemporada(temporadaId: number): Observable<CuotaPescaDTO[]> { return this.http.get<CuotaPescaDTO[]>(`${this.base}/cuotas-pesca/temporada/${temporadaId}`); }
  listarCuotasPorTemporadaConEspecie(temporadaId: number): Observable<CuotaPescaDTO[]> { return this.http.get<CuotaPescaDTO[]>(`${this.base}/cuotas-pesca/temporada/${temporadaId}/especies`); }
  buscarCuotaPorEspecieYTemporada(especieId: number, temporadaId: number): Observable<CuotaPescaDTO> { return this.http.get<CuotaPescaDTO>(`${this.base}/cuotas-pesca/especie/${especieId}/temporada/${temporadaId}`); }
  insertarCuota(dto: CuotaPescaReqUpdDTO): Observable<CuotaPescaDTO> { return this.http.post<CuotaPescaDTO>(`${this.base}/cuotas-pesca`, dto); }
  actualizarCuota(dto: CuotaPescaReqUpdDTO): Observable<CuotaPescaDTO> {
    if (!dto.id) throw new Error('El ID de la cuota es obligatorio para actualizar.');
    return this.http.put<CuotaPescaDTO>(`${this.base}/cuotas-pesca/${dto.id}`, { limiteToneladasIndustrial: dto.limiteToneladasIndustrial });
  }
  eliminarCuota(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/cuotas-pesca/${id}`); }
}
