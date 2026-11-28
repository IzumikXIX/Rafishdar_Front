import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { EmbarcacionesComponent } from './components/embarcaciones/embarcaciones.component';
import { FaenasComponent } from './components/faenas/faenas.component';
import { FaenaDetalleComponent } from './components/faena-detalle/faena-detalle.component';
import { ZonasPescaComponent } from './components/zonas-pesca/zonas-pesca.component';
import { NormativaComponent } from './components/normativa/normativa.component';
import { UsuariosAdminComponent } from './components/usuarios-admin/usuarios-admin.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';

const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'perfil', component: PerfilComponent, canActivate: [AuthGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  {
    path: 'embarcaciones',
    component: EmbarcacionesComponent,
    canActivate: [AuthGuard],
    data: { roles: ['PESCADOR', 'ADMIN'] }
  },
  {
    path: 'faenas',
    component: FaenasComponent,
    canActivate: [AuthGuard],
    data: { roles: ['PESCADOR', 'ADMIN'] }
  },
  {
    path: 'faenas/:id',
    component: FaenaDetalleComponent,
    canActivate: [AuthGuard],
    data: { roles: ['PESCADOR', 'ADMIN', 'TECNICO'] }
  },
  {
    path: 'zonas-pesca',
    component: ZonasPescaComponent,
    canActivate: [AuthGuard],
    data: { roles: ['PESCADOR', 'ADMIN'] }
  },
  {
    path: 'normativa',
    component: NormativaComponent,
    canActivate: [AuthGuard],
    data: { roles: ['PESCADOR', 'ADMIN'] }
  },
  {
    path: 'chatbot',
    component: ChatbotComponent,
    canActivate: [AuthGuard],
    data: { roles: ['PESCADOR', 'ADMIN', 'TECNICO'] }
  },
  {
    path: 'admin/usuarios',
    component: UsuariosAdminComponent,
    canActivate: [AuthGuard],
    data: { roles: ['ADMIN'] }
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
