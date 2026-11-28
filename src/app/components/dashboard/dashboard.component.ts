import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FaenaService } from '../../services/faena.service';
import { OperacionAnaliticaService } from '../../services/operacion-analitica.service';
import { NormativaService } from '../../services/normativa.service';
import { ZonaPescaService } from '../../services/zona-pesca.service';
import { CondicionClimatica, EspeciePezDTO, FaenaDTO, RecomendacionIA, ZonaPesca } from '../../models/rafishdar.models';


@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  volumenTotalMes = 0;
  gastosTotalMes = 0;
  promedioGastoFaena = 0;
  tiempoPromedioMin = 0;
  faenasEnCurso: FaenaDTO[] = [];
  alertasAltoRiesgo: RecomendacionIA[] = [];
  climasPeligrosos: CondicionClimatica[] = [];
  especies: EspeciePezDTO[] = [];
  zonas: ZonaPesca[] = [];
  especieConsultaId: number | null = null;
  volumenEspecie = 0;
  zonasTopIds: number[] = [];
  zonasTopNombres: ZonaPesca[] = [];
  fechaInicio = '';
  fechaFin = '';
  consultandoVolumenEspecie = false;

  constructor(
    public authService: AuthService,
    private faenaService: FaenaService,
    private analiticaService: OperacionAnaliticaService,
    private normativaService: NormativaService,
    private zonaService: ZonaPescaService,
    private cdr: ChangeDetectorRef
  ) {}


  ngOnInit(): void {
    const ahora = new Date();
    const hace30 = new Date();
    hace30.setDate(ahora.getDate() - 30);
    this.fechaInicio = this.dateOnly(hace30);
    this.fechaFin = this.dateOnly(ahora);
    const inicio = this.localDateTime(hace30);
    const fin = this.localDateTime(ahora);
    const userId = this.authService.getUserId();

    this.zonaService.listar().subscribe({
      next: (list) => {
        this.zonas = list || [];
        this.mapTopZoneNames();
        this.cdr.detectChanges();
      }
    });

    this.normativaService.listarEspecies().subscribe({
      next: (list) => {
        this.especies = list || [];
        this.especieConsultaId = this.especies[0]?.id ?? null;
        if (this.especieConsultaId && (this.authService.hasAuthority('PESCADOR') || this.authService.hasAuthority('ADMIN'))) {
          this.consultarVolumenEspecie();
        }
        this.cdr.detectChanges();
      }
    });

    if (this.authService.hasAuthority('PESCADOR') || this.authService.hasAuthority('ADMIN')) {
      this.analiticaService.volumenTotalUsuario(userId, inicio, fin).subscribe({
        next: (v) => { this.volumenTotalMes = Number(v) || 0; this.cdr.detectChanges(); },
        error: () => { this.volumenTotalMes = 0; this.cdr.detectChanges(); }
      });
      this.analiticaService.totalGastosUsuario(userId, inicio, fin).subscribe({
        next: (g) => { this.gastosTotalMes = Number(g) || 0; this.cdr.detectChanges(); },
        error: () => { this.gastosTotalMes = 0; this.cdr.detectChanges(); }
      });
      this.analiticaService.promedioGastosUsuario(userId, inicio, fin).subscribe({
        next: (p) => { this.promedioGastoFaena = Number(p) || 0; this.cdr.detectChanges(); },
        error: () => { this.promedioGastoFaena = 0; this.cdr.detectChanges(); }
      });
      this.faenaService.obtenerTiempoPromedio(userId).subscribe({
        next: (t) => { this.tiempoPromedioMin = Number(t) || 0; this.cdr.detectChanges(); },
        error: () => { this.tiempoPromedioMin = 0; this.cdr.detectChanges(); }
      });
      const activeTrips$ = this.authService.hasAuthority('ADMIN')
        ? this.faenaService.listarTodo()
        : this.faenaService.listarPorUsuarioYEstado(userId, 'En curso');
      activeTrips$.subscribe({
        next: (f) => {
          this.faenasEnCurso = this.authService.hasAuthority('ADMIN') ? (f || []).filter(x => x.estado === 'En curso') : (f || []);
          this.cdr.detectChanges();
        },
        error: () => { this.faenasEnCurso = []; this.cdr.detectChanges(); }
      });
      this.analiticaService.listarClimasPeligrosos(30).subscribe({
        next: (c) => { this.climasPeligrosos = c || []; this.cdr.detectChanges(); },
        error: () => { this.climasPeligrosos = []; this.cdr.detectChanges(); }
      });
    }
    if (this.authService.hasAuthority('TECNICO') || this.authService.hasAuthority('ADMIN')) {
      this.analiticaService.listarAltoRiesgoRecientes(48).subscribe({
        next: (r) => { this.alertasAltoRiesgo = r || []; this.cdr.detectChanges(); },
        error: () => { this.alertasAltoRiesgo = []; this.cdr.detectChanges(); }
      });
    }
  }


  consultarVolumenEspecie(): void {
    if (!this.especieConsultaId || !this.fechaInicio || !this.fechaFin) return;
    const inicio = `${this.fechaInicio}T00:00:00`;
    const fin = `${this.fechaFin}T23:59:59`;
    if (inicio > fin) return;
    this.consultandoVolumenEspecie = true;
    this.analiticaService.volumenEspecieUsuario(this.authService.getUserId(), this.especieConsultaId, inicio, fin).subscribe({
      next: (value) => { this.volumenEspecie = Number(value) || 0; this.consultandoVolumenEspecie = false; this.cdr.detectChanges(); },
      error: () => { this.volumenEspecie = 0; this.consultandoVolumenEspecie = false; this.cdr.detectChanges(); }
    });
    this.analiticaService.topZonasEspecie(this.especieConsultaId).subscribe({
      next: (ids) => {
        this.zonasTopIds = ids || [];
        this.mapTopZoneNames();
        this.cdr.detectChanges();
      },
      error: () => { this.zonasTopIds = []; this.zonasTopNombres = []; this.cdr.detectChanges(); }
    });
  }


  private mapTopZoneNames(): void {
    this.zonasTopNombres = this.zonasTopIds
      .map(id => this.zonas.find(z => Number(z.id) === Number(id)))
      .filter((z): z is ZonaPesca => !!z);
  }
  nombreEmbarcacion(id: number): string { return `Embarcación #${id}`; }
  dateOnly(value: Date): string { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
  localDateTime(value: Date): string { return `${this.dateOnly(value)}T${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}:${String(value.getSeconds()).padStart(2, '0')}`; }
}
