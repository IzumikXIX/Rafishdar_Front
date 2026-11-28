import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: false,
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent {
  passForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.passForm = this.fb.group({
      passwordActual: ['', [Validators.required]],
      passwordNueva: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  actualizarPassword(): void {
    if (this.passForm.invalid) return;
    const { passwordActual, passwordNueva } = this.passForm.value;

    this.authService.cambiarPassword({
      userId: this.authService.getUserId(),
      passwordActual,
      passwordNueva
    }).subscribe({
      next: () => {
        this.snackBar.open('Contraseña actualizada correctamente.', 'OK', { duration: 3000 });
        this.passForm.reset();
      },
      error: () => {
        this.snackBar.open('La contraseña actual es incorrecta o la nueva es igual a la anterior.', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
