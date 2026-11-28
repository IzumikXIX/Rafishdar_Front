import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { BitacoraDTO, BitacoraRequestDTO, BitacoraUpdateDTO } from '../models/rafishdar.models';


@Injectable({ providedIn: 'root' })
export class BitacoraService {
  private url = `${environment.apiUrl}/bitacoras`;
  constructor(private http: HttpClient) {}

  listarTodo(): Observable<BitacoraDTO[]> { return this.http.get<BitacoraDTO[]>(this.url); }
  listarPorFaena(idFaena: number): Observable<BitacoraDTO[]> { return this.http.get<BitacoraDTO[]>(`${this.url}/faena/${idFaena}`); }
  buscarPorId(id: number): Observable<BitacoraDTO> { return this.http.get<BitacoraDTO>(`${this.url}/${id}`); }
  insertar(request: BitacoraRequestDTO): Observable<unknown> { return this.http.post<unknown>(this.url, request); }
  actualizar(id: number, dto: BitacoraUpdateDTO): Observable<unknown> { return this.http.put<unknown>(`${this.url}/${id}`, dto); }
  eliminar(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
  verificarDesvio(id: number): Observable<boolean> { return this.http.get<boolean>(`${this.url}/${id}/alerta-desvio`); }
  verificarAlertaIncidencias(idZona: number, keyword: string): Observable<boolean> {
    const params = new HttpParams().set('keyword', keyword);
    return this.http.get<boolean>(`${this.url}/zona/${idZona}/alerta-incidencias`, { params });
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> c0eac0f90093127ac4f1b4de318a3665d4e1d9ad
