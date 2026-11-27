import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { EmbarcacionService } from '../../services/embarcacion.service';
import { Embarcacion } from '../../models/rafishdar.models';


@Component({
  selector: 'app-embarcaciones',
  standalone: false,
  templateUrl: './embarcaciones.component.html',
  styleUrl: './embarcaciones.component.css'
})
export class EmbarcacionesComponent implements OnInit {
  displayedColumns: string[] = ['id', 'nombre', 'matricula', 'capacidadToneladas', 'acciones'];
  dataSource = new MatTableDataSource<Embarcacion>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  embForm: FormGroup;
  editandoId: number | null = null;
  matriculaOriginal = '';
  filtro = '';
  guardando = false;


  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private embarcacionService: EmbarcacionService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.embForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(80)]],
      matricula: ['', [Validators.required, Validators.maxLength(25), Validators.pattern(/^[A-Za-z0-9-]+$/)]],
      capacidadToneladas: [null, [Validators.required, Validators.min(0.1), Validators.max(100000)]]
    });
    this.dataSource.filterPredicate = (row, filter) => `${row.nombre} ${row.matricula}`.toLowerCase().includes(filter);
  }


  ngOnInit(): void { this.cargarEmbarcaciones(); }


  cargarEmbarcaciones(): void {
    const obs$ = this.authService.hasAuthority('ADMIN')
      ? this.embarcacionService.listarTodas()
      : this.embarcacionService.listarPorUsuario(this.authService.getUserId());
    obs$.subscribe({
      next: (data) => {
        this.dataSource.data = data || [];
        if (this.paginator) this.dataSource.paginator = this.paginator; this.cdr.detectChanges();
        this.aplicarFiltro();
      },
      error: () => { this.dataSource.data = []; }
    });
  }


  aplicarFiltro(): void { this.dataSource.filter = this.filtro.trim().toLowerCase(); }


  guardar(): void {
    if (this.embForm.invalid || this.guardando) {
      this.embForm.markAllAsTouched();
      return;
    }
    const formValue = this.embForm.getRawValue();
    const matricula = String(formValue.matricula).trim().toUpperCase();
    const payload: Embarcacion = {
      nombre: String(formValue.nombre).trim(),
      matricula,
      capacidadToneladas: Number(formValue.capacidadToneladas),
      usuario: this.editandoId === null ? { id: this.authService.getUserId() } : undefined
    };
    this.guardando = true;

    const validarMatricula = this.editandoId !== null && matricula === this.matriculaOriginal
      ? null
      : this.embarcacionService.existeMatricula(matricula);

    if (!validarMatricula) {
      this.persistir(payload);
      return;
    }
    validarMatricula.subscribe({
      next: (existe) => {
        if (existe) {
          this.guardando = false;
          this.snackBar.open('La matrícula ya se encuentra registrada. Verifica el código antes de continuar.', 'Cerrar', { duration: 4000 });
          return;
        }
        this.persistir(payload);
      },
      error: () => {
        // Si el endpoint de validación falla, se deja que el backend valide al guardar.
        this.persistir(payload);
      }
    });
  }


  private persistir(payload: Embarcacion): void {
    if (this.editandoId !== null) {
      payload.id = this.editandoId;
      this.embarcacionService.actualizar(payload).subscribe({
        next: () => this.guardado('Embarcación actualizada'),
        error: (err) => this.errorGuardado(err, 'No se pudo actualizar la embarcación')
      });
    } else {
      this.embarcacionService.insertar(payload).subscribe({
        next: () => this.guardado('Embarcación registrada'),
        error: (err) => this.errorGuardado(err, 'No se pudo registrar la embarcación')
      });
    }
  }


  private guardado(mensaje: string): void {
    this.guardando = false;
    this.snackBar.open(mensaje, 'OK', { duration: 2500 });
    this.cancelarEdicion();
    this.cargarEmbarcaciones();
  }


  private errorGuardado(err: any, fallback: string): void {
    this.guardando = false;
    const mensaje = err?.error?.['message'] || `${fallback}. Revisa la matrícula o los datos ingresados.`;
    this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 });
  }


  editar(emb: Embarcacion): void {
    this.editandoId = emb.id ?? null;
    this.matriculaOriginal = String(emb.matricula || '').trim().toUpperCase();
    this.embForm.patchValue({ nombre: emb.nombre, matricula: emb.matricula, capacidadToneladas: emb.capacidadToneladas });
  }


  cancelarEdicion(): void {
    this.editandoId = null;
    this.matriculaOriginal = '';
    this.guardando = false;
    this.embForm.reset();
  }


  eliminar(id: number): void {
    if (!confirm(`¿Eliminar la embarcación #${id}? Esta acción no se puede deshacer.`)) return;
    this.embarcacionService.eliminar(id).subscribe({
      next: () => { this.snackBar.open('Embarcación eliminada', 'OK', { duration: 2500 }); this.cargarEmbarcaciones(); },
      error: (err) => this.snackBar.open(err?.error?.['message'] || 'No se puede eliminar una embarcación con faenas asociadas', 'Cerrar', { duration: 4000 })
    });
  }
}