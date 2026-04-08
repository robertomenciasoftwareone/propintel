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
    /* ── CSS Design Tokens ── */
    :root {
      --brand:        #0052FF;
      --brand-deep:   #0041CC;
      --brand-light:  #EEF4FF;
      --emerald:      #00B5A3;
      --gold:         #C59400;
      --gold-light:   #F0D060;
      --carmine:      #E11D48;
      --ink:          #0F172A;
      --ink-mid:      #64748B;
      --ink-pale:     #94A3B8;
      --surface:      #FFFFFF;
      --surface-tint: #F8FAFF;
      --shadow-luxury: 0 24px 80px -12px rgba(0,52,255,0.10), 0 8px 32px -8px rgba(0,0,0,0.06);
      --shadow-float:  0 40px 120px -20px rgba(0,52,255,0.15), 0 12px 40px -8px rgba(0,0,0,0.08);
      --radius-card:   24px;
      --radius-btn:    14px;
    }

    .page {
      min-height: 100vh;
      background: radial-gradient(ellipse 120% 60% at 50% -8%, #EEF4FF 0%, #F4F7FF 35%, #FAFBFF 60%, #FFFFFF 80%);
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
