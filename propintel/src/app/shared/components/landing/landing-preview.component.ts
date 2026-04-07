import { Component } from '@angular/core';

@Component({
  selector: 'app-landing-preview',
  standalone: true,
  template: `
    <section class="preview">
      <div class="copy">
        <p class="label">Vista del producto</p>
        <h2>El mapa que te dice si el precio es justo</h2>
        <p>
          Cada inmueble muestra su precio y un semáforo que lo compara con la
          transacción notarial real de la zona. Detecta oportunidades al instante,
          sin necesidad de ser experto inmobiliario.
        </p>
        <div class="legend">
          <div class="leg-item">
            <span class="dot green"></span>
            <span>Precio justo o por debajo del mercado</span>
          </div>
          <div class="leg-item">
            <span class="dot yellow"></span>
            <span>Precio en línea con el mercado (±10%)</span>
          </div>
          <div class="leg-item">
            <span class="dot red"></span>
            <span>Precio por encima del mercado</span>
          </div>
        </div>
      </div>
      <div class="mockup">
        <div class="topbar">
          <span></span><span></span><span></span>
          <div class="url-bar">urbia.es/mapa-resultados</div>
        </div>
        <div class="map-area">
          <!-- Simulated map background -->
          <div class="map-bg"></div>
          <!-- Property pins -->
          <div class="pin pin-green" style="top:28%;left:38%">
            <div class="pin-price">320k</div>
            <div class="pin-tag green-tag">🟢 -8%</div>
          </div>
          <div class="pin pin-yellow" style="top:45%;left:55%">
            <div class="pin-price">415k</div>
            <div class="pin-tag yellow-tag">🟡 +3%</div>
          </div>
          <div class="pin pin-red" style="top:60%;left:32%">
            <div class="pin-price">590k</div>
            <div class="pin-tag red-tag">🔴 +22%</div>
          </div>
          <div class="pin pin-green" style="top:38%;left:68%">
            <div class="pin-price">278k</div>
            <div class="pin-tag green-tag">🟢 -14%</div>
          </div>
          <!-- Cluster -->
          <div class="cluster" style="top:70%;left:62%">7</div>
          <!-- Transport stop -->
          <div class="metro-stop" style="top:50%;left:46%">M</div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .preview {
      margin-top: 34px;
      display: grid;
      grid-template-columns: 1fr 1.4fr;
      gap: 28px;
      align-items: center;
      padding: 28px;
      border-radius: 24px;
      border: 1px solid #d5e4f7;
      background: linear-gradient(180deg, #fafdff, #f2f8ff);
    }
    .label {
      margin: 0;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-weight: 700;
      color: #2d6caf;
    }
    h2 { margin: 6px 0 10px; color: #142d4a; font-size: clamp(22px, 3.5vw, 32px); line-height: 1.2; }
    .copy > p { margin: 0 0 18px; color: #567090; line-height: 1.6; font-size: 14px; }
    .legend { display: flex; flex-direction: column; gap: 8px; }
    .leg-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #4a6280; }
    .dot {
      width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0;
    }
    .dot.green { background: #22c55e; }
    .dot.yellow { background: #f59e0b; }
    .dot.red { background: #ef4444; }

    /* Mockup */
    .mockup {
      border: 1px solid #d4e3f6;
      border-radius: 18px;
      background: white;
      overflow: hidden;
      box-shadow: 0 18px 40px rgba(20, 68, 126, 0.14);
    }
    .topbar {
      height: 38px;
      border-bottom: 1px solid #e4edf9;
      padding: 0 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      background: #f8fbff;
    }
    .topbar > span {
      width: 9px; height: 9px; border-radius: 50%; background: #d5e4f7;
    }
    .url-bar {
      margin-left: 8px;
      background: #edf4ff;
      border: 1px solid #cfe0f7;
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 11px;
      color: #4d6a8a;
      font-family: monospace;
    }
    .map-area {
      position: relative;
      height: 280px;
      overflow: hidden;
    }
    .map-bg {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(rgba(200,220,245,0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(200,220,245,0.3) 1px, transparent 1px),
        #e8edf2;
      background-size: 28px 28px;
    }
    /* Street overlay */
    .map-bg::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.6) 43%, transparent 43%),
        linear-gradient(transparent 55%, rgba(255,255,255,0.6) 55%, rgba(255,255,255,0.6) 58%, transparent 58%);
    }
    .pin {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      transform: translate(-50%, -50%);
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.2));
    }
    .pin-price {
      background: white;
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 700;
      color: #1a3557;
      border: 2px solid currentColor;
      white-space: nowrap;
    }
    .pin-green .pin-price { border-color: #22c55e; }
    .pin-yellow .pin-price { border-color: #f59e0b; }
    .pin-red .pin-price { border-color: #ef4444; }
    .pin-tag {
      font-size: 10px;
      font-weight: 600;
      border-radius: 6px;
      padding: 2px 6px;
      margin-top: 2px;
      white-space: nowrap;
    }
    .green-tag { background: rgba(34,197,94,0.15); color: #15803d; }
    .yellow-tag { background: rgba(245,158,11,0.15); color: #92400e; }
    .red-tag { background: rgba(239,68,68,0.15); color: #991b1b; }
    .cluster {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 32px; height: 32px;
      border-radius: 50%;
      background: #1f7ae0;
      color: white;
      font-size: 12px;
      font-weight: 700;
      display: grid;
      place-items: center;
      border: 2px solid white;
      box-shadow: 0 3px 8px rgba(31,122,224,0.4);
    }
    .metro-stop {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 22px; height: 22px;
      border-radius: 50%;
      background: #003a9b;
      color: white;
      font-size: 11px;
      font-weight: 700;
      display: grid;
      place-items: center;
      border: 2px solid white;
    }
    @media (max-width: 860px) {
      .preview { grid-template-columns: 1fr; }
      .map-area { height: 220px; }
    }
  `]
})
export class LandingPreviewComponent {}
