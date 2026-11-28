import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserActualizarDTO, UserDTO } from '../models/rafishdar.models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private url = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  listarTodo(): Observable<UserDTO[]> {
    return this.http.get<UserDTO[]>(this.url);
  }

  buscarPorNombreOApellido(termino: string): Observable<UserDTO[]> {
    const params = new HttpParams().set('termino', termino);
    return this.http.get<UserDTO[]>(`${this.url}/buscar`, { params });
  }

  buscarPorId(id: number): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.url}/${id}`);
  }

  actualizar(dto: UserActualizarDTO): Observable<UserDTO> {
    return this.http.put<UserDTO>(this.url, dto);
  }

  eliminarLogico(id: number): Observable<UserDTO> {
    return this.http.delete<UserDTO>(`${this.url}/${id}`);
  }

  activar(id: number): Observable<UserDTO> {
    return this.http.put<UserDTO>(`${this.url}/${id}/activar`, {});
  }
}
