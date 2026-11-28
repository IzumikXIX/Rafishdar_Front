import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenDTO, UserCambioPasswordDTO, UserDTO, UserRegistroDTO } from '../models/rafishdar.models';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private url = `${environment.apiUrl}/users`;


  constructor(private http: HttpClient) {}


  login(email: string, password: string): Observable<TokenDTO> {
    // Elimina credenciales antiguas para que nunca interfieran con el nuevo login.
    this.logout();
    const normalizedEmail = email.trim().toLowerCase();

    return this.http.post<TokenDTO>(`${this.url}/login`, {
      email: normalizedEmail,
      password
    }).pipe(
      map((res) => {
        if (!res?.token || !Number.isFinite(Number(res.id)) || Number(res.id) <= 0) {
          throw new Error('El backend no devolvió un token de sesión válido.');
        }
        return res;
      }),
      tap((res) => {
        localStorage.setItem('rafishdar_token', res.token);
        localStorage.setItem('rafishdar_userId', String(res.id));
        localStorage.setItem('rafishdar_authorities', res.authorities || '');
        localStorage.setItem('rafishdar_email', normalizedEmail);
      })
    );
  }


  register(dto: UserRegistroDTO): Observable<UserDTO> {
    return this.http.post<UserDTO>(`${this.url}/register`, dto);
  }


  cambiarPassword(dto: UserCambioPasswordDTO): Observable<void> {
    return this.http.put<void>(`${this.url}/password`, dto);
  }


  logout(): void {
    localStorage.removeItem('rafishdar_token');
    localStorage.removeItem('rafishdar_userId');
    localStorage.removeItem('rafishdar_authorities');
    localStorage.removeItem('rafishdar_email');
  }


  getToken(): string | null { return localStorage.getItem('rafishdar_token'); }
  getUserId(): number { return Number(localStorage.getItem('rafishdar_userId') || 0); }
  getUserEmail(): string { return localStorage.getItem('rafishdar_email') || ''; }
  getAuthorities(): string { return localStorage.getItem('rafishdar_authorities') || ''; }


  getAuthorityList(): string[] {
    return this.getAuthorities().replace(/[\[\]]/g, '').split(/[\s,]+/).filter(Boolean);
  }


  hasAuthority(role: string): boolean { return this.getAuthorityList().includes(role); }
  isLoggedIn(): boolean { return !!this.getToken(); }
}
