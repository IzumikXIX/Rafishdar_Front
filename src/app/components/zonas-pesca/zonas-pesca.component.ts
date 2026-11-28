import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { ZonaPescaService } from '../../services/zona-pesca.service';
import { NormativaService } from '../../services/normativa.service';
import { BitacoraService } from '../../services/bitacora.service';
import { OperacionAnaliticaService } from '../../services/operacion-analitica.service';
import { EspeciePezDTO, ZonaPesca } from '../../models/rafishdar.models';


@Component({
    selector: 'app-zonas-pesca',
    standalone: false,
    templateUrl: './zonas-pesca.component.html',
    styleUrl: './zonas-pesca.component.css'
    })
    export class ZonasPescaComponent implements OnInit {
    displayedColumns: string[] = ['id', 'nombreZona', 'coordenadas', 'distanciaCostaKm', 'radioAreaKm', 'acciones'];
    dataSource = new MatTableDataSource<ZonaPesca>([]);
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    zonasTodas: ZonaPesca[] = [];
    especies: EspeciePezDTO[] = [];
    distanciaMax = 20;
    especieTopId: number | null = null;
    mesTop = new Date().getMonth() + 1;
    top3Zonas: ZonaPesca[] = [];
    zonaSeleccionadaId: number | null = null;
    eficienciaKgGalon: number | null = null;
    tempPromedioZona: number | null = null;
    keywordAlerta = 'peligro';
    alertaIncidencia: boolean | null = null;
    zonaForm: FormGroup;
    editandoId: number | null = null;
    cargando = false;

    constructor(
        private fb: FormBuilder,
        public authService: AuthService,
        private zonaService: ZonaPescaService,
        private normativaService: NormativaService,
        private bitacoraService: BitacoraService,
        private analiticaService: OperacionAnaliticaService,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        this.zonaForm = this.fb.group({
        nombreZona: ['', [Validators.required, Validators.maxLength(100)]],
        latitud: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
        longitud: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
        distanciaCostaKm: [null, [Validators.required, Validators.min(0)]],
        radioAreaKm: [null, [Validators.required, Validators.min(0.5)]]
        });
    }


    ngOnInit(): void {
        this.cargarZonas();
        this.normativaService.listarEspecies().subscribe({
        next: (list) => { this.especies = list || []; this.especieTopId = this.especies[0]?.id ?? null; },
        error: () => this.especies = []
        });
    }


    cargarZonas(): void {
        this.cargando = true;
        this.zonaService.listar().subscribe({
        next: (list) => {
            this.cargando = false;
            this.zonasTodas = list || [];
            this.dataSource.data = this.zonasTodas;
            if (this.paginator) this.dataSource.paginator = this.paginator; this.cdr.detectChanges();
            if (this.zonasTodas.length && (!this.zonaSeleccionadaId || !this.zonasTodas.some(z => Number(z.id) === Number(this.zonaSeleccionadaId)))) {
            this.zonaSeleccionadaId = this.zonasTodas[0].id ?? null;
            this.consultarIndicadoresZona();
            } else if (!this.zonasTodas.length) {
            this.zonaSeleccionadaId = null; this.eficienciaKgGalon = null; this.tempPromedioZona = null; this.alertaIncidencia = null;
            }
        },
        error: () => { this.cargando = false; this.zonasTodas = []; this.dataSource.data = []; this.zonaSeleccionadaId = null; this.snackBar.open('No se pudo cargar el catálogo de zonas.', 'Cerrar', { duration: 3500 }); }
        });
    }


    filtrarCercanas(): void {
        if (!Number.isFinite(this.distanciaMax) || this.distanciaMax < 0) { this.snackBar.open('Ingresa una distancia válida, mayor o igual a cero.', 'Cerrar', { duration: 3000 }); return; }
        this.zonaService.listarCercanas(this.distanciaMax).subscribe({
        next: (list) => { this.dataSource.data = list || []; this.snackBar.open(`Mostrando zonas a ≤ ${this.distanciaMax} km de la costa`, 'OK', { duration: 2500 }); },
        error: (err) => this.mostrarError(err, 'No se pudo consultar las zonas cercanas')
        });
    }


    consultarTop3(): void {
        if (!this.especieTopId || this.mesTop < 1 || this.mesTop > 12) { this.snackBar.open('Selecciona una especie y un mes válido.', 'Cerrar', { duration: 3000 }); return; }
        this.zonaService.listarTop3(this.especieTopId, this.mesTop).subscribe({
        next: (list) => { this.top3Zonas = list || []; if (!this.top3Zonas.length) this.snackBar.open('Sin registros históricos para esa especie y mes.', 'Cerrar', { duration: 3000 }); },
        error: (err) => { this.top3Zonas = []; this.mostrarError(err, 'No se pudo consultar el ranking de zonas'); }
        });
    }


    consultarIndicadoresZona(): void {
        if (!this.zonaSeleccionadaId || !this.keywordAlerta.trim()) { this.alertaIncidencia = null; return; }
        const zoneId = this.zonaSeleccionadaId;
        this.analiticaService.eficienciaCombustibleZona(zoneId, 60).subscribe({ next: (value) => this.eficienciaKgGalon = Number(value) || 0, error: () => this.eficienciaKgGalon = null });
        this.analiticaService.promedioTempZona(zoneId).subscribe({ next: (value) => { const numeric = Number(value); this.tempPromedioZona = Number.isFinite(numeric) ? numeric : null; }, error: () => this.tempPromedioZona = null });
        this.bitacoraService.verificarAlertaIncidencias(zoneId, this.keywordAlerta.trim()).subscribe({ next: (value) => this.alertaIncidencia = !!value, error: () => this.alertaIncidencia = null });
    }


    guardarZona(): void {
        if (this.zonaForm.invalid) { this.zonaForm.markAllAsTouched(); return; }
        const value = this.zonaForm.getRawValue();
        const payload: ZonaPesca = { nombreZona: String(value.nombreZona).trim(), latitud: Number(value.latitud), longitud: Number(value.longitud), distanciaCostaKm: Number(value.distanciaCostaKm), radioAreaKm: Number(value.radioAreaKm), id: this.editandoId ?? undefined };
        const request$ = this.editandoId ? this.zonaService.actualizar(payload) : this.zonaService.insertar(payload);
        request$.subscribe({
        next: () => { this.snackBar.open(this.editandoId ? 'Zona de pesca actualizada' : 'Zona de pesca creada', 'OK', { duration: 2500 }); this.cancelarEdicion(); this.cargarZonas(); },
        error: (err) => this.mostrarError(err, 'No se pudo guardar la zona (verifica nombre y coordenadas)')
        });
    }
    editarZona(zone: ZonaPesca): void { this.editandoId = zone.id ?? null; this.zonaForm.patchValue(zone); }
    cancelarEdicion(): void { this.editandoId = null; this.zonaForm.reset(); }
    eliminarZona(id: number): void {
        if (!confirm(`¿Eliminar la zona de pesca #${id}?`)) return;
        this.zonaService.eliminar(id).subscribe({
        next: () => { this.snackBar.open('Zona eliminada', 'OK', { duration: 2500 }); this.cargarZonas(); },
        error: (err) => this.mostrarError(err, 'No se puede eliminar la zona porque tiene bitácoras asociadas')
        });
    }
    private mostrarError(err: any, fallback: string): void { const message = typeof err?.error === 'string' ? err.error : err?.error?.['message']; this.snackBar.open(message || fallback, 'Cerrar', { duration: 4000 }); }
}
