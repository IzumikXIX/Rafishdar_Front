import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { AuthorityService } from '../../services/authority.service';
import { UserDTO } from '../../models/rafishdar.models';


@Component({
  selector: 'app-usuarios-admin',
  standalone: false,
  templateUrl: './usuarios-admin.component.html',
  styleUrl: './usuarios-admin.component.css'
})
export class UsuariosAdminComponent implements OnInit {
  displayedColumns: string[] = ['id', 'nombres', 'apellidos', 'correo', 'roles', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<UserDTO>([]);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  terminoBusqueda = '';
  userForm: FormGroup;
  editandoId: number | null = null;
  rolesPorUsuario: Record<number, string[]> = {};
  guardando = false;


  constructor(private fb: FormBuilder, private userService: UserService, private authorityService: AuthorityService, private snackBar: MatSnackBar, private cdr: ChangeDetectorRef) {
    this.userForm = this.fb.group({ nombres: ['', [Validators.required, Validators.maxLength(100)]], apellidos: ['', [Validators.required, Validators.maxLength(100)]], correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]] });
  }


  ngOnInit(): void { this.cargarUsuarios(); }


  cargarUsuarios(): void {
    this.userService.listarTodo().subscribe({ next: (users) => this.setUsers(users || []), error: () => { this.dataSource.data = []; this.rolesPorUsuario = {}; } });
  }
  buscar(): void {
    const term = this.terminoBusqueda.trim();
    if (!term) { this.cargarUsuarios(); return; }
    this.userService.buscarPorNombreOApellido(term).subscribe({ next: (users) => this.setUsers(users || []), error: () => { this.dataSource.data = []; this.rolesPorUsuario = {}; } });
  }
  private setUsers(users: UserDTO[]): void {
    this.dataSource.data = users || [];
    if (this.paginator) this.dataSource.paginator = this.paginator; this.cdr.detectChanges();
    const withId = (users || []).filter((u): u is UserDTO & { id: number } => typeof u.id === 'number');
    if (!withId.length) { this.rolesPorUsuario = {}; return; }
    forkJoin(withId.map(user => this.authorityService.listarPorUsuario(user.id).pipe(catchError(() => of([])), map(roles => ({ userId: user.id, roles: (roles || []).map(r => r.name).filter(Boolean) })))))
      .subscribe({ next: (results) => { this.rolesPorUsuario = {}; results.forEach(item => this.rolesPorUsuario[item.userId] = item.roles); } });
  }
  rolesUsuario(id?: number): string[] { return id ? (this.rolesPorUsuario[id] || []) : []; }

  editar(user: UserDTO): void { this.editandoId = user.id ?? null; this.userForm.patchValue({ nombres: user.nombres, apellidos: user.apellidos, correo: user.correo }); }
  cancelarEdicion(): void { this.editandoId = null; this.guardando = false; this.userForm.reset(); }
  guardar(): void {
    if (!this.editandoId || this.userForm.invalid || this.guardando) { this.userForm.markAllAsTouched(); return; }
    this.guardando = true;
    this.userService.actualizar({ id: this.editandoId, ...this.userForm.getRawValue() }).subscribe({ next: () => { this.guardando = false; this.snackBar.open('Datos de usuario actualizados', 'OK', { duration: 2500 }); this.cancelarEdicion(); this.buscar(); }, error: (err) => { this.guardando = false; this.mostrarError(err, 'No se pudo actualizar el usuario'); } });
  }
  cambiarEstadoUsuario(user: UserDTO): void {
    if (!user.id) return;
    const action = user.estado ? 'desactivar' : 'activar';
    if (!confirm(`¿${action === 'desactivar' ? 'Desactivar' : 'Activar'} a ${user.nombres} ${user.apellidos}?`)) return;
    const request$ = user.estado ? this.userService.eliminarLogico(user.id) : this.userService.activar(user.id);
    request$.subscribe({ next: () => { this.snackBar.open(user.estado ? 'Usuario desactivado' : 'Usuario reactivado', 'OK', { duration: 2500 }); this.buscar(); }, error: (err) => this.mostrarError(err, 'No se pudo cambiar el estado del usuario') });
  }
  private mostrarError(err: any, fallback: string): void { const message = typeof err?.error === 'string' ? err.error : err?.error?.['message']; this.snackBar.open(message || fallback, 'Cerrar', { duration: 4000 }); }
}
