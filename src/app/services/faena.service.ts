import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BitacoraRequestDTO, FaenaDTO, FaenaDetalle, FaenaRequestDTO, FaenaUpdateDTO } from '../models/rafishdar.models';


@Injectable({ providedIn: 'root' })
export class FaenaService {
  private url = `${environment.apiUrl}/faenas`;
  constructor(private http: HttpClient) {}


  listarTodo(): Observable<FaenaDTO[]> { return this.http.get<FaenaDTO[]>(this.url); }
  listarPorUsuario(idUsuario: number): Observable<FaenaDTO[]> { return this.http.get<FaenaDTO[]>(`${this.url}/usuario/${idUsuario}`); }
  listarPorUsuarioYEstado(idUsuario: number, estado: string): Observable<FaenaDTO[]> {
    return this.http.get<FaenaDTO[]>(`${this.url}/usuario/${idUsuario}/estado/${encodeURIComponent(estado)}`);
  }
  buscarPorId(id: number): Observable<FaenaDetalle> { return this.http.get<FaenaDetalle>(`${this.url}/${id}`); }
  insertar(request: FaenaRequestDTO): Observable<FaenaDetalle> { return this.http.post<FaenaDetalle>(this.url, request); }
  iniciarFaena(id: number): Observable<FaenaDetalle> { return this.http.put<FaenaDetalle>(`${this.url}/${id}/estado/en-curso`, {}); }
  revertirPlanificada(id: number): Observable<FaenaDetalle> { return this.http.put<FaenaDetalle>(`${this.url}/${id}/revertir-planificada`, {}); }
  actualizarPlanificada(id: number, dto: FaenaUpdateDTO): Observable<FaenaDetalle> { return this.http.put<FaenaDetalle>(`${this.url}/${id}/planificada`, dto); }
  actualizarEnCurso(id: number, dto: FaenaUpdateDTO): Observable<FaenaDetalle> { return this.http.put<FaenaDetalle>(`${this.url}/${id}/en-curso`, dto); }
  finalizarFaena(id: number, ultimaBitacora: boolean, request?: BitacoraRequestDTO): Observable<FaenaDetalle> {
    const params = new HttpParams().set('ultimaBitacora', String(ultimaBitacora));
    return this.http.put<FaenaDetalle>(`${this.url}/${id}/finalizar`, ultimaBitacora ? request : null, { params });
  }
  eliminarPlanificada(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
  obtenerTiempoPromedio(idUsuario: number, inicio?: string, fin?: string): Observable<number> {
    let params = new HttpParams();
    if (inicio && fin) params = params.set('inicio', inicio).set('fin', fin);
    return this.http.get<number>(`${this.url}/usuario/${idUsuario}/tiempo-promedio`, { params });
  }
}