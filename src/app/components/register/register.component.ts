import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  cargando = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;
    const { nombres, apellidos, correo, password, confirmPassword } = this.registerForm.value;

    if (password !== confirmPassword) {
      this.snackBar.open('Las contraseñas no coinciden.', 'Cerrar', { duration: 3500 });
      return;
    }

    this.cargando = true;
    this.authService.register({ nombres, apellidos, correo, password }).subscribe({
      next: () => {
        this.cargando = false;
        this.snackBar.open('Cuenta creada con rol PESCADOR. Ahora puedes iniciar sesión.', 'OK', { duration: 4000 });
        this.router.navigate(['/login']);
      },
      error: () => {
        this.cargando = false;
        this.snackBar.open('No se pudo registrar. Verifica si el correo ya existe.', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
