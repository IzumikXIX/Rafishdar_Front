import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { FaenaService } from '../../services/faena.service';
import { BitacoraService } from '../../services/bitacora.service';
import { ZonaPescaService } from '../../services/zona-pesca.service';
import { NormativaService } from '../../services/normativa.service';
import { OperacionAnaliticaService } from '../../services/operacion-analitica.service';
import {
  BitacoraDTO,
  BitacoraReporte,
  BitacoraRequestDTO,
  BitacoraUpdateDTO,
  CondicionClimatica,
  DetalleCapturaDTO,
  DetalleCapturaRequestDTO,
  EspeciePezDTO,
  FaenaDetalle,
  GastoOperativo,
  RecomendacionIA,
  ZonaPesca
} from '../../models/rafishdar.models';


@Component({
  selector: 'app-faena-detalle',
  standalone: false,
  templateUrl: './faena-detalle.component.html',
  styleUrl: './faena-detalle.component.css'
})
export class FaenaDetalleComponent implements OnInit {
  faenaId = 0;
  faena: FaenaDetalle | null = null;
  bitacoras: BitacoraDTO[] = [];
  zonas: ZonaPesca[] = [];
  especies: EspeciePezDTO[] = [];
  cargando = true;
  cargandoBitacoras = true;
  errorFaena = '';
  errorBitacoras = '';


  bitacoraActiva: BitacoraDTO | null = null;
  capturasBitacora: DetalleCapturaDTO[] = [];
  porcentajeIncidental = 0;
  cargandoCapturas = false;
  cargandoClima = false;
  private seleccionBitacoraToken = 0;
  private capturasCache = new Map<number, DetalleCapturaDTO[]>();
  private climaCache = new Map<number, CondicionClimatica | null>();
  private incidentalCache = new Map<number, number>();
  climaId: number | null = null;
  climaRegistrado = false;
  climaForm: CondicionClimatica = this.climaInicial();

  nuevaBitacora = { zonaPescaId: null as number | null, latitud: null as number | null, longitud: null as number | null, observaciones: '' };
  editandoBitacora = false;
  bitacoraEditForm: BitacoraUpdateDTO = { id: 0, latitud: 0, longitud: 0, zonaPescaId: null, observaciones: '' };
  keywordIncidencia = 'peligro';
  alertaIncidencia: boolean | null = null;

  nuevaCaptura = { especieId: null as number | null, volumenKg: 0 };
  capturaEditId: number | null = null;
  capturaEditVolumen = 0;

  gastoForm: GastoOperativo = { galonesCombustible: 0, costoCombustible: 0, costoHieloInsumos: 0 };
  tieneGasto = false;
  guardandoGasto = false;
  recomendacion: RecomendacionIA | null = null;
  generandoIA = false;
  selectedTabIndex = 0;


  mostrarFormUltimaBitacora = false;
  ultimaBitacora = { zonaPescaId: null as number | null, latitud: null as number | null, longitud: null as number | null, observaciones: '' };
  reportVisible = false;
  reportLoading = false;
  reportItems: BitacoraReporte[] = [];


  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private faenaService: FaenaService,
    private bitacoraService: BitacoraService,
    private zonaService: ZonaPescaService,
    private normativaService: NormativaService,
    private analiticaService: OperacionAnaliticaService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  /** El rol técnico puede inspeccionar faenas, pero no modificarlas. */
  get soloLectura(): boolean {
    return this.authService.hasAuthority('TECNICO') && !this.authService.hasAuthority('ADMIN');
  }

  /** ADMIN y TECNICO consultan por faena; el PESCADOR filtra por su propio usuario. */
  get omitirUsuarioEnLecturas(): boolean {
    return this.soloLectura || this.authService.hasAuthority('ADMIN');
  }

  ngOnInit(): void {
    this.faenaId = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(this.faenaId) || this.faenaId <= 0) {
      this.errorFaena = 'El identificador de la faena no es válido.';
      this.cargando = false;
      return;
    }
    this.zonaService.listar().subscribe({ next: (list) => { this.zonas = list || []; this.cdr.detectChanges(); }, error: () => { this.zonas = []; this.cdr.detectChanges(); } });
    this.normativaService.listarEspecies().subscribe({ next: (list) => { this.especies = list || []; this.cdr.detectChanges(); }, error: () => { this.especies = []; this.cdr.detectChanges(); } });
    this.cargarDatosFaena();
  }


  cargarDatosFaena(): void {
    this.cargando = true;
    this.cargandoBitacoras = true;
    this.errorBitacoras = '';
    this.seleccionBitacoraToken++;
    this.capturasCache.clear();
    this.climaCache.clear();
    this.incidentalCache.clear();

    // La faena se carga de forma independiente para que no espere a los registros relacionados.
    this.faenaService.buscarPorId(this.faenaId).subscribe({
      next: (faena) => { this.faena = faena; this.cargando = false; this.errorFaena = ''; this.cdr.detectChanges(); },
      error: (err) => { this.faena = null; this.cargando = false; this.errorFaena = err?.error?.['message'] || 'No se pudo cargar la faena.'; this.cdr.detectChanges(); }
    });


    // Preferir el endpoint filtrado. El fallback mantiene compatibilidad con backends anteriores.
    this.bitacoraService.listarPorFaena(this.faenaId).pipe(
      catchError((err) => {
        if (err?.status === 404) {
          console.warn('Backend sin endpoint de bitácoras por faena; usando listado general. Actualiza el backend para mejorar el rendimiento.');
          return this.bitacoraService.listarTodo().pipe(catchError(() => { this.errorBitacoras = 'No se pudieron cargar las bitácoras.'; return of([]); }));
        }
        this.errorBitacoras = 'No se pudieron cargar las bitácoras.';
        return of([]);
      })
    ).subscribe({
      next: (list) => {
        this.cargandoBitacoras = false;
        const selectedId = this.bitacoraActiva?.id;
        this.bitacoras = (list || []).filter(b => Number(b.faenaId) === Number(this.faenaId)).sort((a, b) => (a.fechaHoraRegistro || '').localeCompare(b.fechaHoraRegistro || ''));
        const active = this.bitacoras.find(b => Number(b.id) === Number(selectedId)) || this.bitacoras[0] || null;
        if (active) this.seleccionarBitacora(active);
        else { this.bitacoraActiva = null; this.capturasBitacora = []; this.climaId = null; this.climaRegistrado = false; this.cargandoCapturas = false; this.cargandoClima = false; this.climaForm = this.climaInicial(); }
        this.cdr.detectChanges();
      },
      error: () => { this.cargandoBitacoras = false; this.bitacoras = []; this.bitacoraActiva = null; this.capturasBitacora = []; }
    });

    this.analiticaService.buscarGastoFaena(this.faenaId).subscribe({
      next: (g) => { this.gastoForm = g || this.gastoInicial(); this.tieneGasto = !!g; this.cdr.detectChanges(); },
      error: () => { this.gastoForm = this.gastoInicial(); this.tieneGasto = false; }
    });
    const usuarioIdIA = this.omitirUsuarioEnLecturas ? undefined : this.authService.getUserId();
    this.analiticaService.consultarIAFaena(this.faenaId, usuarioIdIA).pipe(catchError(() => of(null))).subscribe(rec => {
      this.recomendacion = rec || null;
      this.cdr.detectChanges();
    });
  }

  iniciarFaena(): void {
    if (this.soloLectura) return;
    this.faenaService.iniciarFaena(this.faenaId).subscribe({
      next: () => { this.snackBar.open('Faena iniciada', 'OK', { duration: 2500 }); this.cargarDatosFaena(); },
      error: (err) => this.mostrarError(err, 'No se pudo iniciar la faena')
    });
  }


  finalizarFaena(): void {
    if (this.soloLectura) return;
    if (!confirm('¿Finalizar esta faena? La operación quedará registrada como Finalizada.')) return;
    this.faenaService.finalizarFaena(this.faenaId, false).subscribe({
      next: () => { this.snackBar.open('Faena finalizada correctamente', 'OK', { duration: 2500 }); this.cargarDatosFaena(); this.mostrarFormUltimaBitacora = false; },
      error: (err) => this.mostrarError(err, 'No se pudo finalizar la faena')
    });
  }


  finalizarConUltimaBitacora(): void {
    if (this.soloLectura) return;
    if (!this.ultimaBitacora.zonaPescaId) { this.snackBar.open('Selecciona la zona para la bitácora final.', 'Cerrar', { duration: 3500 }); return; }
    if (this.ultimaBitacora.latitud === null || this.ultimaBitacora.longitud === null) { this.snackBar.open('Ingresa latitud y longitud para la última bitácora.', 'Cerrar', { duration: 3500 }); return; }
    if (!this.validarCoordenadas(this.ultimaBitacora.latitud, this.ultimaBitacora.longitud)) return;
    const request: BitacoraRequestDTO = { faenaId: this.faenaId, zonaPescaId: this.ultimaBitacora.zonaPescaId, latitud: Number(this.ultimaBitacora.latitud), longitud: Number(this.ultimaBitacora.longitud), observaciones: this.ultimaBitacora.observaciones.trim() };
    this.faenaService.finalizarFaena(this.faenaId, true, request).subscribe({
      next: () => { this.snackBar.open('Bitácora final registrada y faena finalizada', 'OK', { duration: 3000 }); this.cargarDatosFaena(); this.mostrarFormUltimaBitacora = false; },
      error: (err) => this.mostrarError(err, 'No se pudo registrar la última bitácora o finalizar la faena')
    });
  }


  registrarBitacora(): void {
    if (this.soloLectura) return;
    if (this.faena?.estado !== 'En curso') { this.snackBar.open('Solo una faena en curso puede registrar bitácoras.', 'Cerrar', { duration: 3500 }); return; }
    if (!this.bitacoras.length && !this.nuevaBitacora.zonaPescaId) { this.snackBar.open('La primera bitácora debe tener una zona de pesca.', 'Cerrar', { duration: 3500 }); return; }
    if (this.nuevaBitacora.latitud === null || this.nuevaBitacora.longitud === null) { this.snackBar.open('Ingresa latitud y longitud para la bitácora.', 'Cerrar', { duration: 3500 }); return; }
    if (!this.validarCoordenadas(this.nuevaBitacora.latitud, this.nuevaBitacora.longitud)) return;
    this.bitacoraService.insertar({ faenaId: this.faenaId, zonaPescaId: this.nuevaBitacora.zonaPescaId, latitud: Number(this.nuevaBitacora.latitud), longitud: Number(this.nuevaBitacora.longitud), observaciones: this.nuevaBitacora.observaciones.trim() }).subscribe({
      next: () => { this.snackBar.open('Bitácora registrada', 'OK', { duration: 2500 }); this.nuevaBitacora.observaciones = ''; this.cargarDatosFaena(); },
      error: (err) => this.mostrarError(err, 'No se pudo registrar la bitácora')
    });
  }


  eliminarBitacora(id: number): void {
    if (this.soloLectura) return;
    if (!confirm(`¿Eliminar la bitácora #${id}?`)) return;
    this.bitacoraService.eliminar(id).subscribe({
      next: () => { this.snackBar.open('Bitácora eliminada', 'OK', { duration: 2500 }); this.editandoBitacora = false; this.cargarDatosFaena(); },
      error: (err) => this.mostrarError(err, 'No se pudo eliminar la bitácora')
    });
  }


  editarBitacora(b: BitacoraDTO): void {
    if (this.soloLectura) return;
    this.bitacoraEditForm = { id: b.id || 0, latitud: b.latitud, longitud: b.longitud, zonaPescaId: b.zonaPescaId ?? null, observaciones: b.observaciones || '' };
    this.editandoBitacora = true;
  }
  cancelarEdicionBitacora(): void { this.editandoBitacora = false; }
  guardarEdicionBitacora(): void {
    if (this.soloLectura) return;
    if (!this.bitacoraEditForm.id) return;
    if (!this.validarCoordenadas(Number(this.bitacoraEditForm.latitud), Number(this.bitacoraEditForm.longitud))) return;
    this.bitacoraService.actualizar(this.bitacoraEditForm.id, this.bitacoraEditForm).subscribe({
      next: () => { this.snackBar.open('Bitácora actualizada', 'OK', { duration: 2500 }); this.editandoBitacora = false; this.cargarDatosFaena(); },
      error: (err) => this.mostrarError(err, 'No se pudo actualizar la bitácora')
    });
  }


  verificarDesvio(idBitacora: number): void {
    this.bitacoraService.verificarDesvio(idBitacora).subscribe({
      next: (desvio) => this.snackBar.open(desvio ? 'Alerta: la posición supera el radio permitido de la zona.' : 'Posición segura: dentro del radio permitido.', 'Cerrar', { duration: 4500 }),
      error: (err) => this.mostrarError(err, 'No se pudo verificar el desvío')
    });
  }

  verificarIncidencia(): void {
    if (!this.bitacoraActiva?.zonaPescaId || !this.keywordIncidencia.trim()) return;
    this.bitacoraService.verificarAlertaIncidencias(this.bitacoraActiva.zonaPescaId, this.keywordIncidencia.trim()).subscribe({
      next: (alerta) => { this.alertaIncidencia = alerta; this.snackBar.open(alerta ? `Se detectaron coincidencias de "${this.keywordIncidencia}" en las últimas 48 horas.` : 'No se encontraron coincidencias recientes.', 'Cerrar', { duration: 4000 }); },
      error: (err) => this.mostrarError(err, 'No se pudo consultar la alerta de incidencias')
    });
  }


  seleccionarBitacora(b: BitacoraDTO): void {
    this.bitacoraActiva = b;
    this.editandoBitacora = false;
    this.alertaIncidencia = null;
    this.porcentajeIncidental = 0;
    this.climaId = null;
    this.climaRegistrado = false;
    this.climaForm = this.climaInicial();
    const id = Number(b.id);
    const token = ++this.seleccionBitacoraToken;
    if (!id) { this.cargandoCapturas = false; this.cargandoClima = false; return; }

    // Cache local para que volver a seleccionar un registro no repita llamadas HTTP.
    if (this.capturasCache.has(id)) {
      this.capturasBitacora = this.capturasCache.get(id) || [];
      this.cargandoCapturas = false;
    } else {
      this.capturasBitacora = [];
      this.cargandoCapturas = true;
      this.analiticaService.listarCapturasPorBitacora(id).pipe(catchError(() => of([]))).subscribe(capturas => {
        this.capturasCache.set(id, capturas || []);
        if (token === this.seleccionBitacoraToken) { this.capturasBitacora = capturas || []; this.cargandoCapturas = false; this.cdr.detectChanges(); }
      });
    }

    const cachedClimate = this.climaCache.get(id);
    if (this.climaCache.has(id)) {
      this.cargandoClima = false;
      this.aplicarClima(cachedClimate || null);
    } else {
      this.cargandoClima = true;
      this.analiticaService.consultarClimaBitacora(id, this.omitirUsuarioEnLecturas ? undefined : this.authService.getUserId()).pipe(catchError(() => of(null))).subscribe(clima => {
        this.climaCache.set(id, clima || null);
        if (token === this.seleccionBitacoraToken) { this.aplicarClima(clima || null); this.cargandoClima = false; this.cdr.detectChanges(); }
      });
    }

    if (this.incidentalCache.has(id)) {
      this.porcentajeIncidental = this.incidentalCache.get(id) || 0;
    } else {
      this.analiticaService.porcentajeIncidental(id).pipe(catchError(() => of(0))).subscribe(pct => {
        const value = Number(pct) || 0;
        this.incidentalCache.set(id, value);
        if (token === this.seleccionBitacoraToken) { this.porcentajeIncidental = value; this.cdr.detectChanges(); }
      });
    }
  }


  private aplicarClima(clima: CondicionClimatica | null): void {
    this.climaId = clima?.id ?? null;
    this.climaRegistrado = !!clima;
    this.climaForm = clima ? { temperaturaCelsius: clima.temperaturaCelsius, velocidadVientoNudos: clima.velocidadVientoNudos, estadoOleaje: clima.estadoOleaje } : this.climaInicial();
  }

  agregarCaptura(): void {
    if (this.soloLectura) return;
    const bitacoraId = this.bitacoraActiva?.id;
    if (!bitacoraId || !this.nuevaCaptura.especieId || Number(this.nuevaCaptura.volumenKg) <= 0) { this.snackBar.open('Selecciona una especie e ingresa un volumen mayor a cero.', 'Cerrar', { duration: 3500 }); return; }
    const request: DetalleCapturaRequestDTO = { bitacoraId, especieId: Number(this.nuevaCaptura.especieId), volumenKg: Number(this.nuevaCaptura.volumenKg) };
    this.analiticaService.insertarCaptura(bitacoraId, request).subscribe({
      next: () => { this.snackBar.open('Captura registrada y validada contra la cuota vigente', 'OK', { duration: 3000 }); this.nuevaCaptura.volumenKg = 0; this.invalidarCacheBitacora(this.bitacoraActiva!.id!); this.seleccionarBitacora(this.bitacoraActiva!); },
      error: (err) => this.mostrarError(err, 'La captura no se pudo registrar. Verifica la cuota o temporada vigente.')
    });
  }


  iniciarEdicionCaptura(captura: DetalleCapturaDTO): void {
    if (this.soloLectura) return; this.capturaEditId = captura.id ?? null; this.capturaEditVolumen = Number(captura.volumenKg) || 0; }
  cancelarEdicionCaptura(): void { this.capturaEditId = null; this.capturaEditVolumen = 0; }
  guardarEdicionCaptura(): void {
    if (this.soloLectura) return;
    if (!this.capturaEditId || this.capturaEditVolumen <= 0) { this.snackBar.open('El volumen debe ser mayor a cero.', 'Cerrar', { duration: 3000 }); return; }
    this.analiticaService.actualizarCaptura(this.capturaEditId, this.capturaEditVolumen).subscribe({
      next: () => { this.snackBar.open('Volumen de captura actualizado', 'OK', { duration: 2500 }); this.cancelarEdicionCaptura(); if (this.bitacoraActiva) { this.invalidarCacheBitacora(this.bitacoraActiva.id!); this.seleccionarBitacora(this.bitacoraActiva); } },
      error: (err) => this.mostrarError(err, 'No se pudo actualizar la captura')
    });
  }
  eliminarCaptura(id: number): void {
    if (this.soloLectura) return;
    if (!confirm('¿Eliminar este detalle de captura?')) return;
    this.analiticaService.eliminarCaptura(id).subscribe({
      next: () => { this.snackBar.open('Captura eliminada', 'OK', { duration: 2500 }); if (this.bitacoraActiva) { this.invalidarCacheBitacora(this.bitacoraActiva.id!); this.seleccionarBitacora(this.bitacoraActiva); } },
      error: (err) => this.mostrarError(err, 'No se pudo eliminar la captura')
    });
  }


  guardarClima(): void {
    if (this.soloLectura) return;
    if (!this.bitacoraActiva?.id) return;
    if (this.climaForm.temperaturaCelsius === null || this.climaForm.temperaturaCelsius === undefined || this.climaForm.velocidadVientoNudos === null || this.climaForm.velocidadVientoNudos === undefined || !this.climaForm.estadoOleaje.trim()) { this.snackBar.open('Completa temperatura, velocidad del viento y estado del oleaje.', 'Cerrar', { duration: 3500 }); return; }
    if (!Number.isFinite(Number(this.climaForm.temperaturaCelsius)) || !Number.isFinite(Number(this.climaForm.velocidadVientoNudos)) || Number(this.climaForm.velocidadVientoNudos) < 0) { this.snackBar.open('Ingresa valores numéricos válidos y una velocidad de viento no negativa.', 'Cerrar', { duration: 3500 }); return; }
    const payload: CondicionClimatica = { temperaturaCelsius: Number(this.climaForm.temperaturaCelsius), velocidadVientoNudos: Number(this.climaForm.velocidadVientoNudos), estadoOleaje: this.climaForm.estadoOleaje };
    const request$ = this.climaId ? this.analiticaService.actualizarClima(this.climaId, payload) : this.analiticaService.guardarClimaBitacora(this.bitacoraActiva.id, payload);
    request$.subscribe({
      next: (clima) => {
        if (clima?.id !== undefined) this.climaId = clima.id;
        if (this.bitacoraActiva?.id) {
          const climaCacheado: CondicionClimatica = this.climaId === null ? payload : { ...payload, id: this.climaId };
          this.climaCache.set(this.bitacoraActiva.id, climaCacheado);
        }
        this.climaRegistrado = true;
        this.snackBar.open('Condición climática guardada', 'OK', { duration: 2500 });
      },
      error: (err) => this.mostrarError(err, 'No se pudo guardar la condición climática')
    });
  }
  eliminarClima(): void {
    if (this.soloLectura) return;
    if (!this.climaId || !confirm('¿Eliminar el registro climático de esta bitácora?')) return;
    this.analiticaService.eliminarClima(this.climaId).subscribe({ next: () => { if (this.bitacoraActiva?.id) this.climaCache.set(this.bitacoraActiva.id, null); this.climaId = null; this.climaRegistrado = false; this.climaForm = this.climaInicial(); this.snackBar.open('Registro climático eliminado', 'OK', { duration: 2500 }); }, error: (err) => this.mostrarError(err, 'No se pudo eliminar el clima') });
  }


  guardarGasto(): void {
    if (this.soloLectura) return;
    if (this.guardandoGasto) return;
    if (this.gastoForm.galonesCombustible < 0 || this.gastoForm.costoCombustible < 0 || this.gastoForm.costoHieloInsumos < 0) { this.snackBar.open('Los gastos y consumos no pueden ser negativos.', 'Cerrar', { duration: 3500 }); return; }
    this.guardandoGasto = true;
    const payload: GastoOperativo = { galonesCombustible: Number(this.gastoForm.galonesCombustible), costoCombustible: Number(this.gastoForm.costoCombustible), costoHieloInsumos: Number(this.gastoForm.costoHieloInsumos) };
    const request$ = this.tieneGasto ? this.analiticaService.actualizarGastoFaena(this.faenaId, payload) : this.analiticaService.insertarGastoFaena(this.faenaId, payload);
    request$.subscribe({ next: () => { this.tieneGasto = true; this.guardandoGasto = false; this.snackBar.open('Gastos operativos guardados', 'OK', { duration: 2500 }); }, error: (err) => { this.guardandoGasto = false; this.mostrarError(err, 'No se pudieron guardar los gastos'); } });
  }
  eliminarGasto(): void {
    if (this.soloLectura) return;
    if (!this.tieneGasto || !confirm('¿Eliminar los gastos operativos de esta faena?')) return;
    this.analiticaService.eliminarGastoFaena(this.faenaId).subscribe({ next: () => { this.tieneGasto = false; this.gastoForm = this.gastoInicial(); this.snackBar.open('Gastos eliminados', 'OK', { duration: 2500 }); }, error: (err) => this.mostrarError(err, 'No se pudieron eliminar los gastos') });
  }


  abrirRecomendacionIA(): void {
    this.selectedTabIndex = 2;
    if (this.recomendacion || this.generandoIA) return;
    this.generandoIA = true;
    this.cdr.detectChanges();
    const usuarioId = this.omitirUsuarioEnLecturas ? undefined : this.authService.getUserId();
    this.analiticaService.consultarIAFaena(this.faenaId, usuarioId).pipe(
      catchError(() => of(null)),
      switchMap(rec => {
        if (rec && rec.analisisTexto) return of(rec);
        if (this.soloLectura) return of(null);
        return this.analiticaService.generarIAFaena(this.faenaId, this.authService.getUserId());
      })
    ).subscribe({
      next: (rec) => {
        this.recomendacion = rec || null;
        this.generandoIA = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.generandoIA = false;
        this.cdr.detectChanges();
        this.mostrarError(err, 'No se pudo generar la recomendación IA');
      }
    });
  }
  generarIA(): void {
    if (this.soloLectura) return;
    this.generandoIA = true;
    this.analiticaService.generarIAFaena(this.faenaId, this.authService.getUserId()).subscribe({ next: (rec) => { this.recomendacion = rec; this.generandoIA = false; this.cdr.detectChanges(); this.snackBar.open('Análisis de riesgo IA generado', 'OK', { duration: 2500 }); }, error: (err) => { this.generandoIA = false; this.cdr.detectChanges(); this.mostrarError(err, 'No se pudo generar la recomendación IA'); } });
  }
  regenerarIA(): void {
    if (this.soloLectura) return;
    this.generandoIA = true;
    this.analiticaService.regenerarIAFaena(this.faenaId, this.authService.getUserId()).subscribe({ next: (rec) => { this.recomendacion = rec; this.generandoIA = false; this.cdr.detectChanges(); this.snackBar.open('Recomendación actualizada con los datos recientes', 'OK', { duration: 2500 }); }, error: (err) => { this.generandoIA = false; this.cdr.detectChanges(); this.mostrarError(err, 'No se pudo regenerar la recomendación'); } });
  }


  generarReporte(): void {
    if (this.reportLoading || this.cargandoBitacoras) return;
    this.reportLoading = true;
    this.reportVisible = false;
    const zonas$ = this.zonas.length ? of(this.zonas) : this.zonaService.listar().pipe(catchError(() => of([])));
    zonas$.subscribe({ next: (zones) => { this.zonas = zones || []; this.recopilarDatosReporte(); }, error: () => this.recopilarDatosReporte() });
  }
  private recopilarDatosReporte(): void {
    if (!this.bitacoras.length) { this.reportItems = []; this.reportVisible = true; this.reportLoading = false; return; }
    const userId = this.authService.getUserId();
    const requests = this.bitacoras.map(b => {
      const id = b.id;
      if (!id) return of({ bitacora: b, capturas: [] as DetalleCapturaDTO[], clima: null as CondicionClimatica | null });
      return forkJoin({
        capturas: this.analiticaService.listarCapturasPorBitacora(id).pipe(catchError(() => of([]))),
        clima: this.analiticaService.consultarClimaBitacora(id, this.omitirUsuarioEnLecturas ? undefined : userId).pipe(catchError(() => of(null)))
      }).pipe(map(data => ({ bitacora: b, capturas: data.capturas || [], clima: data.clima || null })));
    });
    forkJoin(requests).subscribe({
      next: (data) => { this.reportItems = data.map(item => ({ ...item.bitacora, nombreZona: this.nombreZona(item.bitacora.zonaPescaId), capturas: item.capturas, clima: item.clima })); this.reportVisible = true; this.reportLoading = false; },
      error: () => { this.reportLoading = false; this.snackBar.open('No se pudo recopilar toda la información para el reporte.', 'Cerrar', { duration: 3500 }); }
    });
  }
  imprimirReporte(): void { window.print(); }
  cerrarReporte(): void { this.reportVisible = false; }


  nombreZona(id?: number | null): string { if (!id) return 'Zona no asignada'; return this.zonas.find(z => Number(z.id) === Number(id))?.nombreZona || `Zona #${id}`; }
  nombreEspecie(id: number): string { const species = this.especies.find(e => Number(e.id) === Number(id)); if (!species) return `Especie #${id}`; return species.estadoVeda ? `${species.nombreComun} · EN VEDA` : species.nombreComun; }
  claseEstado(estado: string): string { return 'status-' + estado.replace(/\s+/g, '-'); }
  fechaReporte(): string { return new Date().toLocaleString('es-PE'); }
  get volumenTotalReporte(): number { return this.reportItems.reduce((total, item) => total + item.capturas.reduce((sum, capture) => sum + Number(capture.volumenKg || 0), 0), 0); }
  get cantidadCapturasReporte(): number { return this.reportItems.reduce((total, item) => total + item.capturas.length, 0); }
  private invalidarCacheBitacora(id: number): void { this.capturasCache.delete(id); this.climaCache.delete(id); this.incidentalCache.delete(id); }
  private climaInicial(): CondicionClimatica { return { temperaturaCelsius: null, velocidadVientoNudos: null, estadoOleaje: '' }; }
  private gastoInicial(): GastoOperativo { return { galonesCombustible: 0, costoCombustible: 0, costoHieloInsumos: 0 }; }
  private validarCoordenadas(latitud: number, longitud: number): boolean { if (!Number.isFinite(latitud) || !Number.isFinite(longitud) || latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) { this.snackBar.open('Ingresa coordenadas válidas (latitud entre -90 y 90; longitud entre -180 y 180).', 'Cerrar', { duration: 4000 }); return false; } return true; }
  private mostrarError(err: any, fallback: string): void { const message = typeof err?.error === 'string' ? err.error : err?.error?.['message']; this.snackBar.open(message || fallback, 'Cerrar', { duration: 4000 }); }

  logoFallback(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.style.visibility = 'hidden';
  }

}