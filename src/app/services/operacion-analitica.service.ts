import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CondicionClimatica, DetalleCapturaDTO, DetalleCapturaRequestDTO, GastoOperativo, RecomendacionIA } from '../models/rafishdar.models';


@Injectable({ providedIn: 'root' })
export class OperacionAnaliticaService {
    private base = environment.apiUrl;
    constructor(private http: HttpClient) {}


    // Capturas: registros, actualizaciones y métricas
    listarCapturas(): Observable<DetalleCapturaDTO[]> { return this.http.get<DetalleCapturaDTO[]>(`${this.base}/detalles-captura`); }
    listarCapturasPorBitacora(idBitacora: number): Observable<DetalleCapturaDTO[]> { return this.http.get<DetalleCapturaDTO[]>(`${this.base}/detalles-captura/bitacoras/${idBitacora}`); }
    insertarCaptura(idBitacora: number, dto: DetalleCapturaRequestDTO): Observable<DetalleCapturaDTO> { return this.http.post<DetalleCapturaDTO>(`${this.base}/detalles-captura/bitacoras/${idBitacora}`, dto); }
    actualizarCaptura(idDetalle: number, nuevoVolumen: number): Observable<DetalleCapturaDTO> {
        const params = new HttpParams().set('nuevoVolumen', String(nuevoVolumen));
        return this.http.put<DetalleCapturaDTO>(`${this.base}/detalles-captura/${idDetalle}`, null, { params });
    }
    eliminarCaptura(idDetalle: number): Observable<void> { return this.http.delete<void>(`${this.base}/detalles-captura/${idDetalle}`); }
    volumenTotalUsuario(idUsuario: number, inicio: string, fin: string): Observable<number> {
        const params = new HttpParams().set('inicio', inicio).set('fin', fin);
        return this.http.get<number>(`${this.base}/detalles-captura/volumen-total/usuario/${idUsuario}`, { params });
    }
    volumenEspecieUsuario(idUsuario: number, idEspecie: number, inicio: string, fin: string): Observable<number> {
        const params = new HttpParams().set('idEspecie', String(idEspecie)).set('inicio', inicio).set('fin', fin);
        return this.http.get<number>(`${this.base}/detalles-captura/volumen-especie/usuario/${idUsuario}`, { params });
    }
    topZonasEspecie(idEspecie: number): Observable<number[]> { return this.http.get<number[]>(`${this.base}/detalles-captura/top-zonas/especie/${idEspecie}`); }
    porcentajeIncidental(idBitacora: number): Observable<number> { return this.http.get<number>(`${this.base}/detalles-captura/bitacoras/${idBitacora}/porcentaje-incidental`); }

    // Clima: una condición por bitácora
    listarClimas(): Observable<CondicionClimatica[]> { return this.http.get<CondicionClimatica[]>(`${this.base}/condiciones-climaticas`); }
    consultarClimaPorId(id: number): Observable<CondicionClimatica> { return this.http.get<CondicionClimatica>(`${this.base}/condiciones-climaticas/${id}`); }
    consultarClimaBitacora(bitacoraId: number, usuarioId?: number): Observable<CondicionClimatica> {
        let params = new HttpParams();
        if (usuarioId !== undefined && usuarioId !== null) params = params.set('usuarioId', String(usuarioId));
        return this.http.get<CondicionClimatica>(`${this.base}/bitacoras/${bitacoraId}/condicion-climatica`, { params });
    }
    guardarClimaBitacora(idBitacora: number, dto: CondicionClimatica): Observable<CondicionClimatica> { return this.http.post<CondicionClimatica>(`${this.base}/condiciones-climaticas/bitacoras/${idBitacora}`, dto); }
    actualizarClima(idClima: number, dto: CondicionClimatica): Observable<CondicionClimatica> { return this.http.put<CondicionClimatica>(`${this.base}/condiciones-climaticas/${idClima}`, dto); }
    eliminarClima(idClima: number): Observable<void> { return this.http.delete<void>(`${this.base}/condiciones-climaticas/${idClima}`); }
    listarClimasPeligrosos(umbralNudos = 30): Observable<CondicionClimatica[]> {
        const params = new HttpParams().set('umbralNudos', String(umbralNudos));
        return this.http.get<CondicionClimatica[]>(`${this.base}/condiciones-climaticas/peligrosas`, { params });
    }
    promedioTempZona(zonaId: number): Observable<number> {
        const params = new HttpParams().set('zonaId', String(zonaId));
        return this.http.get<number>(`${this.base}/condiciones-climaticas/promedio-temperatura`, { params });
    }

    // Gastos operativos
    listarGastos(): Observable<GastoOperativo[]> { return this.http.get<GastoOperativo[]>(`${this.base}/gastos-operativos`); }
    buscarGastoFaena(idFaena: number): Observable<GastoOperativo> { return this.http.get<GastoOperativo>(`${this.base}/gastos-operativos/faenas/${idFaena}/gasto`); }
    insertarGastoFaena(idFaena: number, dto: GastoOperativo): Observable<GastoOperativo> { return this.http.post<GastoOperativo>(`${this.base}/gastos-operativos/faenas/${idFaena}/gasto`, dto); }
    actualizarGastoFaena(idFaena: number, dto: GastoOperativo): Observable<GastoOperativo> { return this.http.put<GastoOperativo>(`${this.base}/gastos-operativos/faenas/${idFaena}/gasto`, dto); }
    eliminarGastoFaena(idFaena: number): Observable<void> { return this.http.delete<void>(`${this.base}/gastos-operativos/faenas/${idFaena}/gasto`); }
    totalGastosUsuario(idUsuario: number, inicio: string, fin: string): Observable<number> {
        const params = new HttpParams().set('inicio', inicio).set('fin', fin);
        return this.http.get<number>(`${this.base}/gastos-operativos/total/usuario/${idUsuario}`, { params });
    }
    promedioGastosUsuario(idUsuario: number, inicio: string, fin: string): Observable<number> {
        const params = new HttpParams().set('inicio', inicio).set('fin', fin);
        return this.http.get<number>(`${this.base}/gastos-operativos/promedio/usuario/${idUsuario}`, { params });
    }
    eficienciaCombustibleZona(idZona: number, diasAtras = 30): Observable<number> {
        const params = new HttpParams().set('diasAtras', String(diasAtras));
        return this.http.get<number>(`${this.base}/gastos-operativos/eficiencia/zona/${idZona}`, { params });
    }

    // Recomendación IA
    listarRecomendaciones(): Observable<RecomendacionIA[]> { return this.http.get<RecomendacionIA[]>(`${this.base}/recomendaciones-ia`); }
    buscarRecomendacionPorId(id: number): Observable<RecomendacionIA> { return this.http.get<RecomendacionIA>(`${this.base}/recomendaciones-ia/${id}`); }
    insertarRecomendacion(dto: RecomendacionIA): Observable<RecomendacionIA> { return this.http.post<RecomendacionIA>(`${this.base}/recomendaciones-ia`, dto); }
    actualizarRecomendacion(dto: RecomendacionIA): Observable<RecomendacionIA> { return this.http.put<RecomendacionIA>(`${this.base}/recomendaciones-ia`, dto); }
    eliminarRecomendacion(id: number): Observable<void> { return this.http.delete<void>(`${this.base}/recomendaciones-ia/${id}`); }
    consultarIAFaena(faenaId: number, usuarioId?: number): Observable<RecomendacionIA> {
        let params = new HttpParams();
        if (usuarioId !== undefined && usuarioId !== null) params = params.set('usuarioId', String(usuarioId));
        return this.http.get<RecomendacionIA>(`${this.base}/recomendaciones-ia/faenas/${faenaId}`, { params });
    }
    generarIAFaena(faenaId: number, usuarioId: number): Observable<RecomendacionIA> {
        const params = new HttpParams().set('usuarioId', String(usuarioId));
        return this.http.post<RecomendacionIA>(`${this.base}/recomendaciones-ia/faenas/${faenaId}`, null, { params });
    }
    regenerarIAFaena(faenaId: number, usuarioId: number): Observable<RecomendacionIA> {
        const params = new HttpParams().set('usuarioId', String(usuarioId));
        return this.http.put<RecomendacionIA>(`${this.base}/recomendaciones-ia/faenas/${faenaId}`, null, { params });
    }
    listarAltoRiesgoRecientes(horas = 24): Observable<RecomendacionIA[]> {
        const params = new HttpParams().set('horas', String(horas));
        return this.http.get<RecomendacionIA[]>(`${this.base}/recomendaciones-ia/alto-riesgo`, { params });
    }
}
