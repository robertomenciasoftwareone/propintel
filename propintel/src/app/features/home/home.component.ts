import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LandingNavbarComponent } from '../../shared/components/landing/landing-navbar.component';
import { LandingHeroComponent } from '../../shared/components/landing/landing-hero.component';
import { LandingPricingComponent } from '../../shared/components/landing/landing-pricing.component';
import { LandingFooterComponent } from '../../shared/components/landing/landing-footer.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    LandingNavbarComponent,
    LandingHeroComponent,
    LandingPricingComponent,
    LandingFooterComponent,
  ],
  template: `
    <div class="page">
      <app-landing-navbar />
      <app-landing-hero />
      <app-landing-pricing />
      <app-landing-footer />
    </div>
  `,
  styles: [`
    .page {
      min-height: 100vh;
      background: #ffffff;
    }
  `]
})
export class HomeComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }
}
