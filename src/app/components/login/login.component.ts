import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  cargando = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  autocompletarDemo(email: string, password: string): void {
    this.loginForm.patchValue({ email, password });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;
    this.cargando = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.cargando = false;
        this.snackBar.open('¡Bienvenido a Rafishdar!', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.cargando = false;
        const message = err?.status === 0
          ? 'No se pudo conectar con el backend. Verifica que Spring Boot esté ejecutándose en http://localhost:8080.'
          : err?.status === 401
            ? 'Correo o contraseña incorrectos, o cuenta desactivada.'
            : err?.error?.message || 'No se pudo iniciar sesión. Revisa el backend y vuelve a intentarlo.';
        this.snackBar.open(message, 'Cerrar', { duration: 5000 });
      }
    });
  }
}
