import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ChatbotResponse {
  respuesta: string;
  tipo: 'model' | string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private readonly url = `${environment.apiUrl}/chatbot`;

  constructor(private readonly http: HttpClient) {}

  conversar(historial: ChatMessage[], usuarioId?: number): Observable<ChatbotResponse> {
    let params = new HttpParams();
    if (usuarioId && Number.isInteger(usuarioId) && usuarioId > 0) {
      params = params.set('usuarioId', String(usuarioId));
    }
    return this.http.post<ChatbotResponse>(`${this.url}/conversar-con-datos`, {
      historial: historial.slice(-30)
    }, { params });
  }
}
