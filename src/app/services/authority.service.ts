import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthorityDTO } from '../models/rafishdar.models';


@Injectable({ providedIn: 'root' })
export class AuthorityService {
  private url = `${environment.apiUrl}/authorities`;
  constructor(private http: HttpClient) {}

  listarTodo(): Observable<AuthorityDTO[]> { return this.http.get<AuthorityDTO[]>(this.url); }
  listarPorUsuario(userId: number): Observable<AuthorityDTO[]> { return this.http.get<AuthorityDTO[]>(`${this.url}/user/${userId}`); }
}
