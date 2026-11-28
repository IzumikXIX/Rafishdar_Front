import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { NormativaService } from '../../services/normativa.service';
import { CuotaPescaDTO, CuotaPescaReqUpdDTO, EspeciePezDTO, TemporadaDTO } from '../../models/rafishdar.models';


@Component({
  selector: 'app-normativa',
  standalone: false,
  templateUrl: './normativa.component.html',
  styleUrl: './normativa.component.css'
})
export class NormativaComponent implements OnInit {
  especies: EspeciePezDTO[] = [];
  temporadas: TemporadaDTO[] = [];
  temporadasVisibles: TemporadaDTO[] = [];
  temporadasVigentes = false;
  cuotas: CuotaPescaDTO[] = [];
  temporadaFiltroCuota: number | null = null;
  especieFiltroCuota: number | null = null;
  busquedaEspecie = '';
  especieEditId: number | null = null;
  temporadaEditId: number | null = null;
  cuotaEditId: number | null = null;
  especieForm: FormGroup;
  temporadaForm: FormGroup;
  cuotaForm: FormGroup;
  consultandoSuperposicion = false;

  constructor(private fb: FormBuilder, public authService: AuthService, private normativaService: NormativaService, private snackBar: MatSnackBar, private cdr: ChangeDetectorRef) {
    this.especieForm = this.fb.group({ nombreComun: ['', [Validators.required, Validators.maxLength(100)]], nombreCientifico: [''], estadoVeda: [false] });
    this.temporadaForm = this.fb.group({ nombreTemporada: ['', [Validators.required, Validators.maxLength(100)]], fechaInicio: ['', [Validators.required]], fechaFin: ['', [Validators.required]] });
    this.cuotaForm = this.fb.group({ especieId: [null, [Validators.required]], temporadaId: [null, [Validators.required]], limiteToneladasIndustrial: [null, [Validators.required, Validators.min(0.01)]] });
  }


  ngOnInit(): void { this.cargarEspecies(); this.cargarTemporadas(); this.cargarCuotas(); }


  cargarEspecies(): void { this.normativaService.listarEspecies().subscribe({ next: (data) => { this.especies = data || []; this.cdr.detectChanges(); }, error: () => this.especies = [] }); }
  filtrarVeda(enVeda: boolean): void { this.normativaService.listarEspeciesPorVeda(enVeda).subscribe({ next: (data) => { this.especies = data || []; this.cdr.detectChanges(); }, error: () => this.especies = [] }); }
  buscarEspeciePorNombre(): void {
    if (!this.busquedaEspecie.trim()) { this.cargarEspecies(); return; }
    this.normativaService.buscarEspecie(this.busquedaEspecie.trim()).subscribe({ next: (data) => { this.especies = data || []; this.cdr.detectChanges(); }, error: () => this.especies = [] });
  }
  guardarEspecie(): void {
    if (this.especieForm.invalid) { this.especieForm.markAllAsTouched(); return; }
    const payload: EspeciePezDTO = { ...this.especieForm.getRawValue(), id: this.especieEditId ?? undefined, nombreComun: String(this.especieForm.value.nombreComun).trim(), nombreCientifico: String(this.especieForm.value.nombreCientifico || '').trim() || null };
    const request$ = this.especieEditId ? this.normativaService.actualizarEspecie(payload) : this.normativaService.insertarEspecie(payload);
    request$.subscribe({ next: () => { this.snackBar.open(this.especieEditId ? 'Especie actualizada' : 'Especie registrada', 'OK', { duration: 2500 }); this.cancelarEdicionEspecie(); this.cargarEspecies(); }, error: (err) => this.mostrarError(err, 'No se pudo guardar la especie') });
  }
  editarEspecie(especie: EspeciePezDTO): void { this.especieEditId = especie.id ?? null; this.especieForm.patchValue({ nombreComun: especie.nombreComun, nombreCientifico: especie.nombreCientifico, estadoVeda: especie.estadoVeda }); }
  cancelarEdicionEspecie(): void { this.especieEditId = null; this.especieForm.reset({ estadoVeda: false }); }
  cambiarEstadoVeda(especie: EspeciePezDTO): void {
    this.normativaService.actualizarEspecie({ ...especie, estadoVeda: !especie.estadoVeda }).subscribe({ next: () => { this.snackBar.open('Estado de veda actualizado', 'OK', { duration: 2500 }); this.cargarEspecies(); }, error: (err) => this.mostrarError(err, 'No se pudo actualizar el estado de veda') });
  }
  eliminarEspecie(id: number): void { if (!confirm('¿Eliminar esta especie?')) return; this.normativaService.eliminarEspecie(id).subscribe({ next: () => { this.snackBar.open('Especie eliminada', 'OK', { duration: 2500 }); this.cargarEspecies(); }, error: (err) => this.mostrarError(err, 'No se puede eliminar la especie si tiene capturas o cuotas asociadas') }); }


  cargarTemporadas(): void { this.normativaService.listarTemporadas().subscribe({ next: (data) => { this.temporadas = data || []; this.temporadasVisibles = [...this.temporadas]; this.cdr.detectChanges(); this.temporadasVigentes = false; if (this.temporadas.length && !this.temporadaFiltroCuota) this.temporadaFiltroCuota = this.temporadas[0].id ?? null; }, error: () => { this.temporadas = []; this.temporadasVisibles = []; } }); }
  filtrarTemporadasVigentes(): void { this.normativaService.listarTemporadasVigentes().subscribe({ next: (data) => { this.temporadasVisibles = data || []; this.temporadasVigentes = true; }, error: () => { this.temporadasVisibles = []; this.temporadasVigentes = true; } }); }
  guardarTemporada(): void {
    if (this.temporadaForm.invalid) { this.temporadaForm.markAllAsTouched(); return; }
    const inicio = String(this.temporadaForm.value.fechaInicio);
    const fin = String(this.temporadaForm.value.fechaFin);
    if (inicio > fin) { this.snackBar.open('La fecha de fin debe ser igual o posterior al inicio.', 'Cerrar', { duration: 3500 }); return; }
    this.consultandoSuperposicion = true;
    this.normativaService.buscarTemporadasSuperpuestas(inicio, fin).subscribe({
      next: (overlaps) => {
        const conflicting = (overlaps || []).filter(t => Number(t.id) !== Number(this.temporadaEditId));
        this.consultandoSuperposicion = false;
        if (conflicting.length) { this.snackBar.open(`El rango se superpone con: ${conflicting.map(t => t.nombreTemporada).join(', ')}`, 'Cerrar', { duration: 5000 }); return; }
        this.persistirTemporada();
      },
      error: () => { this.consultandoSuperposicion = false; this.snackBar.open('No se pudo validar el rango. El backend también verificará la superposición al guardar.', 'Cerrar', { duration: 4000 }); this.persistirTemporada(); }
    });
  }
  private persistirTemporada(): void {
    const payload: TemporadaDTO = { ...this.temporadaForm.getRawValue(), id: this.temporadaEditId ?? undefined };
    const request$ = this.temporadaEditId ? this.normativaService.actualizarTemporada(payload) : this.normativaService.insertarTemporada(payload);
    request$.subscribe({ next: () => { this.snackBar.open(this.temporadaEditId ? 'Temporada actualizada' : 'Temporada registrada', 'OK', { duration: 2500 }); this.cancelarEdicionTemporada(); this.cargarTemporadas(); }, error: (err) => this.mostrarError(err, 'No se pudo guardar la temporada. Verifica que no se superponga con otra.') });
  }
  editarTemporada(temporada: TemporadaDTO): void { this.temporadaEditId = temporada.id ?? null; this.temporadaForm.patchValue({ nombreTemporada: temporada.nombreTemporada, fechaInicio: temporada.fechaInicio, fechaFin: temporada.fechaFin }); }
  cancelarEdicionTemporada(): void { this.temporadaEditId = null; this.temporadaForm.reset(); this.consultandoSuperposicion = false; }
  eliminarTemporada(id: number): void { if (!confirm('¿Eliminar esta temporada?')) return; this.normativaService.eliminarTemporada(id).subscribe({ next: () => { this.snackBar.open('Temporada eliminada', 'OK', { duration: 2500 }); this.cargarTemporadas(); this.cargarCuotas(); }, error: (err) => this.mostrarError(err, 'No se puede eliminar la temporada si tiene cuotas asociadas') }); }


  cargarCuotas(): void { this.normativaService.listarCuotas().subscribe({ next: (data) => { this.cuotas = data || []; this.cdr.detectChanges(); }, error: () => this.cuotas = [] }); }
  filtrarCuotas(): void {
    const especieId = this.especieFiltroCuota;
    const temporadaId = this.temporadaFiltroCuota;
    if (especieId && temporadaId) {
      this.normativaService.buscarCuotaPorEspecieYTemporada(especieId, temporadaId).subscribe({ next: (quota) => this.cuotas = quota ? [quota] : [], error: () => this.cuotas = [] });
    } else if (especieId) {
      this.normativaService.listarCuotasPorEspecie(especieId).subscribe({ next: (list) => this.cuotas = list || [], error: () => this.cuotas = [] });
    } else if (temporadaId) {
      this.normativaService.listarCuotasPorTemporadaConEspecie(temporadaId).subscribe({ next: (list) => this.cuotas = list || [], error: () => this.cuotas = [] });
    } else this.cargarCuotas();
  }
  guardarCuota(): void {
    if (this.cuotaForm.invalid) { this.cuotaForm.markAllAsTouched(); return; }
    const payload: CuotaPescaReqUpdDTO = { ...this.cuotaForm.getRawValue(), id: this.cuotaEditId ?? undefined, especieId: Number(this.cuotaForm.value.especieId), temporadaId: Number(this.cuotaForm.value.temporadaId), limiteToneladasIndustrial: Number(this.cuotaForm.value.limiteToneladasIndustrial) };
    const request$ = this.cuotaEditId ? this.normativaService.actualizarCuota(payload) : this.normativaService.insertarCuota(payload);
    request$.subscribe({ next: () => { this.snackBar.open(this.cuotaEditId ? 'Cuota actualizada' : 'Cuota asignada', 'OK', { duration: 2500 }); this.cancelarEdicionCuota(); this.cargarCuotas(); }, error: (err) => this.mostrarError(err, 'No se pudo guardar la cuota. Puede que ya exista para esa especie y temporada.') });
  }
  editarCuota(cuota: CuotaPescaDTO): void { this.cuotaEditId = cuota.id ?? null; this.cuotaForm.patchValue({ especieId: cuota.especieId, temporadaId: cuota.temporadaId, limiteToneladasIndustrial: cuota.limiteToneladasIndustrial }); }
  cancelarEdicionCuota(): void { this.cuotaEditId = null; this.cuotaForm.reset(); }
  eliminarCuota(id: number): void { if (!confirm('¿Eliminar esta cuota?')) return; this.normativaService.eliminarCuota(id).subscribe({ next: () => { this.snackBar.open('Cuota eliminada', 'OK', { duration: 2500 }); this.cargarCuotas(); }, error: (err) => this.mostrarError(err, 'No se pudo eliminar la cuota') }); }

  nombreEspecie(id: number): string { return this.especies.find(e => Number(e.id) === Number(id))?.nombreComun || `Especie #${id}`; }
  nombreTemporada(id: number): string { return this.temporadas.find(t => Number(t.id) === Number(id))?.nombreTemporada || `Temporada #${id}`; }
  private mostrarError(err: any, fallback: string): void { const message = typeof err?.error === 'string' ? err.error : err?.error?.['message']; this.snackBar.open(message || fallback, 'Cerrar', { duration: 4000 }); }
}
