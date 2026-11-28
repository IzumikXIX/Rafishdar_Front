import { NgModule, provideZoneChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { MaterialModule } from './shared/material/material.module';
import { TokenInterceptor } from './interceptors/token.interceptor';

import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
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

@NgModule({
  declarations: [
    App,
    NavbarComponent,
    FooterComponent,
    LandingPageComponent,
    LoginComponent,
    RegisterComponent,
    PerfilComponent,
    DashboardComponent,
    EmbarcacionesComponent,
    FaenasComponent,
    FaenaDetalleComponent,
    ZonasPescaComponent,
    NormativaComponent,
    UsuariosAdminComponent,
    ChatbotComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    AppRoutingModule
  ],
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true }
  ],
  bootstrap: [App]
})
export class AppModule {}
