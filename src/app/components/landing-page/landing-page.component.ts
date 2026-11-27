import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing-page',
  standalone: false,
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css'
})
export class LandingPageComponent {
  windyUrl: SafeResourceUrl;
  mapsUrl: SafeResourceUrl;

  constructor(public authService: AuthService, sanitizer: DomSanitizer) {
    this.windyUrl = sanitizer.bypassSecurityTrustResourceUrl(
      'https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=10&overlay=wind&product=ecmwf&level=surface&lat=-12.068&lon=-77.166'
    );
    this.mapsUrl = sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7803.7420737853445!2d-77.14562685760431!3d-12.052393114688916!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9105cb523bc358ef%3A0x19e25a2a04716282!2sPuerto%20del%20Callao!5e0!3m2!1ses-419!2spe!4v1763259500598!5m2!1ses-419!2spe'
    );
  }
}
