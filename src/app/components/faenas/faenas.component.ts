import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { FaenaService } from '../../services/faena.service';
import { EmbarcacionService } from '../../services/embarcacion.service';
import { Embarcacion, FaenaDTO, FaenaUpdateDTO } from '../../models/rafishdar.models';

interface CalendarDayCell {
  day: number;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-faenas',
  standalone: false,
  templateUrl: './faenas.component.html',
  styleUrl: './faenas.component.css'
})
export class FaenasComponent implements OnInit {
  displayedColumns: string[] = ['id', 'embarcacionId', 'fechaHoraSalida', 'fechaHoraLlegada', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<FaenaDTO>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  faenaForm: FormGroup;
  embarcaciones: Embarcacion[] = [];
  filtroEstado = 'TODAS';
  editandoId: number | null = null;
  arrivalEditingId: number | null = null;
  arrivalEdit = '';
  llegadaOriginalPlanificada: string | null = null;
  tiempoPromedioMin = 0;
  guardando = false;

  // Controles amigables para fecha (con mini calendario) + hora (0-12) + AM/PM
  horasDoce: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  minutosOpciones: number[] = [0, 15, 30, 45];
  salidaFecha = '';
  salidaHora12 = 8;
  salidaMinuto = 0;
  salidaPeriodo: 'AM' | 'PM' = 'AM';

  llegadaFecha = '';
  llegadaHora12 = 12;
  llegadaMinuto = 0;
  llegadaPeriodo: 'AM' | 'PM' = 'PM';

  calendarioActivo: 'salida' | 'llegada' | null = null;
  calendarioAno = new Date().getFullYear();
  calendarioMes = new Date().getMonth();
  diasCalendario: CalendarDayCell[] = [];

  private readonly mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private faenaService: FaenaService,
    private embarcacionService: EmbarcacionService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.faenaForm = this.fb.group({
      embarcacionId: [null, [Validators.required]],
      fechaHoraSalidaProgramada: ['', [Validators.required]],
      fechaHoraLlegadaEstimada: ['']
    });
    this.construirCalendario();
  }

  get tituloMesCalendario(): string {
    return `${this.mesesNombres[this.calendarioMes]} ${this.calendarioAno}`;
  }

  ngOnInit(): void {
    this.cargarEmbarcaciones();
    this.cargarFaenas();
    this.faenaService.obtenerTiempoPromedio(this.authService.getUserId()).subscribe({
      next: (t) => { this.tiempoPromedioMin = Number(t) || 0; this.cdr.detectChanges(); },
      error: () => this.tiempoPromedioMin = 0
    });
  }

  formatearFechaVisual(isoDate: string): string {
    if (!isoDate) return '';
    const partes = isoDate.split('-');
    if (partes.length !== 3) return isoDate;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  toggleCalendario(target: 'salida' | 'llegada'): void {
    if (this.calendarioActivo === target) {
      this.calendarioActivo = null;
      return;
    }
    const baseIso = target === 'salida' ? this.salidaFecha : this.llegadaFecha;
    if (baseIso) {
      const partes = baseIso.split('-').map(Number);
      if (partes.length === 3 && partes[0] && partes[1] && partes[2]) {
        this.calendarioAno = partes[0];
        this.calendarioMes = partes[1] - 1;
        this.construirCalendario();
      }
    }
    this.calendarioActivo = target;
  }

  cambiarMesCalendario(delta: number): void {
    let mes = this.calendarioMes + delta;
    let ano = this.calendarioAno;
    if (mes < 0) {
      mes = 11;
      ano -= 1;
    } else if (mes > 11) {
      mes = 0;
      ano += 1;
    }
    this.calendarioMes = mes;
    this.calendarioAno = ano;
    this.construirCalendario();
  }

  seleccionarFechaCalendario(isoDate: string): void {
    if (this.calendarioActivo === 'salida') {
      this.salidaFecha = isoDate;
      this.sincronizarSalida();
    } else if (this.calendarioActivo === 'llegada') {
      this.llegadaFecha = isoDate;
      this.sincronizarLlegada();
    }
    this.calendarioActivo = null;
  }

  seleccionarHoyCalendario(): void {
    const hoy = new Date();
    this.calendarioAno = hoy.getFullYear();
    this.calendarioMes = hoy.getMonth();
    this.construirCalendario();
    const hoyIso = this.formatearIso(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    this.seleccionarFechaCalendario(hoyIso);
  }

  private construirCalendario(): void {
    const hoy = new Date();
    const hoyIso = this.formatearIso(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const primerDia = new Date(this.calendarioAno, this.calendarioMes, 1);
    const offsetInicio = (primerDia.getDay() + 6) % 7;
    const diasEnMes = new Date(this.calendarioAno, this.calendarioMes + 1, 0).getDate();
    const diasMesAnterior = new Date(this.calendarioAno, this.calendarioMes, 0).getDate();

    const celdas: CalendarDayCell[] = [];
    for (let i = offsetInicio - 1; i >= 0; i--) {
      const d = diasMesAnterior - i;
      const prevMonth = this.calendarioMes === 0 ? 11 : this.calendarioMes - 1;
      const prevYear = this.calendarioMes === 0 ? this.calendarioAno - 1 : this.calendarioAno;
      const iso = this.formatearIso(prevYear, prevMonth, d);
      celdas.push({ day: d, iso, inMonth: false, isToday: iso === hoyIso });
    }
    for (let d = 1; d <= diasEnMes; d++) {
      const iso = this.formatearIso(this.calendarioAno, this.calendarioMes, d);
      celdas.push({ day: d, iso, inMonth: true, isToday: iso === hoyIso });
    }
    const restante = (7 - (celdas.length % 7)) % 7;
    for (let d = 1; d <= restante; d++) {
      const nextMonth = this.calendarioMes === 11 ? 0 : this.calendarioMes + 1;
      const nextYear = this.calendarioMes === 11 ? this.calendarioAno + 1 : this.calendarioAno;
      const iso = this.formatearIso(nextYear, nextMonth, d);
      celdas.push({ day: d, iso, inMonth: false, isToday: iso === hoyIso });
    }
    this.diasCalendario = celdas;
  }

  private formatearIso(ano: number, mesIdx: number, dia: number): string {
    return `${ano}-${String(mesIdx + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  sincronizarSalida(): void {
    if (!this.salidaFecha) {
      this.faenaForm.patchValue({ fechaHoraSalidaProgramada: '' });
      this.faenaForm.get('fechaHoraSalidaProgramada')?.markAsTouched();
      return;
    }
    const isoDateTime = this.combinarFechaHora12(this.salidaFecha, Number(this.salidaHora12), Number(this.salidaMinuto), this.salidaPeriodo);
    this.faenaForm.patchValue({ fechaHoraSalidaProgramada: isoDateTime });
  }

  sincronizarLlegada(): void {
    if (!this.llegadaFecha) {
      this.faenaForm.patchValue({ fechaHoraLlegadaEstimada: '' });
      return;
    }
    const isoDateTime = this.combinarFechaHora12(this.llegadaFecha, Number(this.llegadaHora12), Number(this.llegadaMinuto), this.llegadaPeriodo);
    this.faenaForm.patchValue({ fechaHoraLlegadaEstimada: isoDateTime });
  }

  limpiarLlegada(): void {
    this.llegadaFecha = '';
    this.faenaForm.patchValue({ fechaHoraLlegadaEstimada: '' });
  }

  private combinarFechaHora12(fechaIso: string, hora12: number, minuto: number, periodo: 'AM' | 'PM'): string {
    let horas24 = hora12 % 12;
    if (periodo === 'PM') {
      horas24 += 12;
    }
    return `${fechaIso}T${String(horas24).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;
  }

  private aplicarIsoAEstadoSalida(isoString?: string | null): void {
    if (!isoString) {
      this.salidaFecha = '';
      this.salidaHora12 = 8;
      this.salidaMinuto = 0;
      this.salidaPeriodo = 'AM';
      return;
    }
    const clean = isoString.slice(0, 16);
    const [f, t] = clean.split('T');
    this.salidaFecha = f || '';
    if (t) {
      const [hStr, mStr] = t.split(':');
      const h24 = Number(hStr || 0);
      this.salidaMinuto = Number(mStr || 0);
      this.salidaPeriodo = h24 >= 12 ? 'PM' : 'AM';
      this.salidaHora12 = h24 % 12;
    }
  }

  private aplicarIsoAEstadoLlegada(isoString?: string | null): void {
    if (!isoString) {
      this.llegadaFecha = '';
      this.llegadaHora12 = 12;
      this.llegadaMinuto = 0;
      this.llegadaPeriodo = 'PM';
      return;
    }
    const clean = isoString.slice(0, 16);
    const [f, t] = clean.split('T');
    this.llegadaFecha = f || '';
    if (t) {
      const [hStr, mStr] = t.split(':');
      const h24 = Number(hStr || 12);
      this.llegadaMinuto = Number(mStr || 0);
      this.llegadaPeriodo = h24 >= 12 ? 'PM' : 'AM';
      this.llegadaHora12 = h24 % 12;
    }
  }

  cargarEmbarcaciones(): void {
    const obs$ = this.authService.hasAuthority('ADMIN') ? this.embarcacionService.listarTodas() : this.embarcacionService.listarPorUsuario(this.authService.getUserId());
    obs$.subscribe({ next: (list) => { this.embarcaciones = list || []; this.cdr.detectChanges(); }, error: () => this.embarcaciones = [] });
  }


  cargarFaenas(): void {
    const userId = this.authService.getUserId();
    const admin = this.authService.hasAuthority('ADMIN');
    const obs$ = admin
      ? this.faenaService.listarTodo()
      : this.filtroEstado !== 'TODAS'
        ? this.faenaService.listarPorUsuarioYEstado(userId, this.filtroEstado)
        : this.faenaService.listarPorUsuario(userId);
    obs$.subscribe({
      next: (data) => {
        const list = data || [];
        this.dataSource.data = admin && this.filtroEstado !== 'TODAS' ? list.filter(f => f.estado === this.filtroEstado) : list;
        if (this.paginator) this.dataSource.paginator = this.paginator; this.cdr.detectChanges();
      },
      error: () => this.dataSource.data = []
    });
  }


  guardarFaena(): void {
    this.sincronizarSalida();
    this.sincronizarLlegada();
    if (this.faenaForm.invalid || this.guardando) { this.faenaForm.markAllAsTouched(); return; }
    const val = this.faenaForm.getRawValue();
    const salida = this.toBackendDateTime(val.fechaHoraSalidaProgramada);
    const llegada = val.fechaHoraLlegadaEstimada
      ? this.toBackendDateTime(val.fechaHoraLlegadaEstimada)
      : (this.editandoId !== null ? this.llegadaOriginalPlanificada : null);
    if (llegada && llegada <= salida) {
      this.snackBar.open('La llegada estimada debe ser posterior a la salida programada.', 'Cerrar', { duration: 3500 });
      return;
    }
    this.guardando = true;
    if (this.editandoId !== null) {
      const update: FaenaUpdateDTO = {
        embarcacionId: Number(val.embarcacionId),
        fechaHoraSalidaProgramada: salida,
        fechaHoraLlegadaEstimada: llegada
      };
      this.faenaService.actualizarPlanificada(this.editandoId, update).subscribe({
        next: () => this.onSaved('Planificación de faena actualizada'),
        error: (err) => this.onError(err, 'No se pudo actualizar la faena')
      });
    } else {
      this.faenaService.insertar({
        embarcacionId: Number(val.embarcacionId),
        fechaHoraSalidaProgramada: salida,
        fechaHoraLlegadaEstimada: llegada
      }).subscribe({
        next: () => this.onSaved('Faena planificada registrada'),
        error: (err) => this.onError(err, 'No se pudo planificar la faena')
      });
    }
  }


  editarPlanificada(faena: FaenaDTO): void {
    this.editandoId = faena.id ?? null;
    const salidaRef = faena.fechaHoraSalidaProgramada || faena.fechaHoraSalida || '';
    const llegadaRef = faena.fechaHoraLlegadaEstimada || faena.fechaHoraLlegada || null;
    this.llegadaOriginalPlanificada = llegadaRef ? this.toBackendDateTime(llegadaRef) : null;
    this.aplicarIsoAEstadoSalida(salidaRef);
    this.aplicarIsoAEstadoLlegada(llegadaRef);
    this.calendarioActivo = null;
    this.faenaForm.patchValue({
      embarcacionId: faena.embarcacionId,
      fechaHoraSalidaProgramada: this.toLocalInput(salidaRef),
      fechaHoraLlegadaEstimada: llegadaRef ? this.toLocalInput(llegadaRef) : ''
    });
  }


  cancelarEdicion(): void {
    this.editandoId = null;
    this.llegadaOriginalPlanificada = null;
    this.guardando = false;
    this.calendarioActivo = null;
    this.salidaFecha = '';
    this.salidaHora12 = 8;
    this.salidaMinuto = 0;
    this.salidaPeriodo = 'AM';
    this.llegadaFecha = '';
    this.llegadaHora12 = 12;
    this.llegadaMinuto = 0;
    this.llegadaPeriodo = 'PM';
    this.faenaForm.reset({ embarcacionId: null, fechaHoraSalidaProgramada: '', fechaHoraLlegadaEstimada: '' });
  }


  iniciarFaena(id: number): void {
    this.faenaService.iniciarFaena(id).subscribe({
      next: () => { this.snackBar.open('Faena iniciada', 'OK', { duration: 2500 }); this.cargarFaenas(); },
      error: (err) => this.snackBar.open(err?.error?.['message'] || 'No se pudo iniciar la faena', 'Cerrar', { duration: 4000 })
    });
  }


  revertirPlanificada(id: number): void {
    if (!confirm(`¿Revertir la faena #${id} a Planificada?`)) return;
    this.faenaService.revertirPlanificada(id).subscribe({
      next: () => { this.snackBar.open('Faena revertida a Planificada', 'OK', { duration: 2500 }); this.cargarFaenas(); },
      error: (err) => this.snackBar.open(err?.error?.['message'] || 'No se puede revertir si ya tiene bitácoras', 'Cerrar', { duration: 4000 })
    });
  }


  editarLlegada(faena: FaenaDTO): void {
    this.arrivalEditingId = faena.id ?? null;
    const ref = faena.fechaHoraLlegadaEstimada || faena.fechaHoraLlegada || '';
    this.arrivalEdit = ref ? this.toLocalInput(ref) : '';
  }
  cancelarLlegada(): void { this.arrivalEditingId = null; this.arrivalEdit = ''; }
  guardarLlegada(faena: FaenaDTO): void {
    if (!faena.id || !this.arrivalEdit) { this.snackBar.open('Ingresa una fecha de llegada estimada.', 'Cerrar', { duration: 3000 }); return; }
    const arrival = this.toBackendDateTime(this.arrivalEdit);
    const salidaRef = faena.fechaHoraSalida || faena.fechaHoraSalidaProgramada || '';
    if (salidaRef && arrival <= salidaRef) { this.snackBar.open('La llegada estimada debe ser posterior a la salida.', 'Cerrar', { duration: 3500 }); return; }
    this.faenaService.actualizarEnCurso(faena.id, { fechaHoraLlegadaEstimada: arrival }).subscribe({
      next: () => { this.snackBar.open('Llegada estimada actualizada', 'OK', { duration: 2500 }); this.cancelarLlegada(); this.cargarFaenas(); },
      error: (err) => this.snackBar.open(err?.error?.['message'] || 'No se pudo actualizar la llegada estimada', 'Cerrar', { duration: 4000 })
    });
  }


  eliminarFaena(id: number): void {
    if (!confirm(`¿Eliminar la faena planificada #${id}?`)) return;
    this.faenaService.eliminarPlanificada(id).subscribe({
      next: () => { this.snackBar.open('Faena planificada eliminada', 'OK', { duration: 2500 }); this.cargarFaenas(); },
      error: (err) => this.snackBar.open(err?.error?.['message'] || 'Solo se pueden eliminar faenas planificadas', 'Cerrar', { duration: 3500 })
    });
  }


  obtenerNombreEmbarcacion(id: number): string { const emb = this.embarcaciones.find(e => e.id === id); return emb ? `${emb.nombre} · ${emb.matricula}` : `Embarcación #${id}`; }
  claseEstado(estado: string): string { return 'status-' + estado.replace(/\s+/g, '-'); }
  private onSaved(message: string): void { this.guardando = false; this.snackBar.open(message, 'OK', { duration: 2500 }); this.cancelarEdicion(); this.cargarFaenas(); }
  private onError(err: any, fallback: string): void { this.guardando = false; this.snackBar.open(err?.error?.['message'] || `${fallback}. Revisa fechas y posibles solapamientos.`, 'Cerrar', { duration: 4500 }); }
  private toBackendDateTime(value: string): string { return value.length === 16 ? `${value}:00` : value; }
  private toLocalInput(value: string): string { return value ? value.slice(0, 16) : ''; }
}