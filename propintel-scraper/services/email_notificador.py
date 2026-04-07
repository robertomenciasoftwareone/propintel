"""
Servicio de notificaciones por email cuando se dispara una alerta.
Usa aiosmtplib para envío asíncrono.
"""
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from loguru import logger

import aiosmtplib
from config.settings import settings
from models.schemas import AlertaConfig, AnuncioPortal


HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  body      {{ font-family: 'DM Sans', Arial, sans-serif; background:#0d0f12; color:#f0ede8; margin:0; padding:0; }}
  .wrapper  {{ max-width:560px; margin:0 auto; padding:32px 20px; }}
  .header   {{ margin-bottom:28px; }}
  .logo     {{ font-size:24px; font-weight:700; letter-spacing:3px; color:#e8c547; }}
  .logo span{{ color:#8a8d94; }}
  .titulo   {{ font-size:22px; font-weight:600; margin:20px 0 8px; }}
  .subtitulo{{ font-size:14px; color:#8a8d94; margin-bottom:24px; }}
  .card     {{ background:#13161b; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:22px; margin-bottom:16px; }}
  .row      {{ display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }}
  .label    {{ font-size:11px; letter-spacing:1px; text-transform:uppercase; color:#4a4d55; }}
  .val-ask  {{ font-size:22px; font-weight:700; color:#e8c547; }}
  .val-not  {{ font-size:22px; font-weight:700; color:#4fd1a5; }}
  .gap-box  {{ background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.25); border-radius:8px; padding:12px 16px; margin:14px 0; text-align:center; }}
  .gap-num  {{ font-size:28px; font-weight:700; color:#f87171; }}
  .gap-sub  {{ font-size:12px; color:#8a8d94; margin-top:4px; }}
  .btn      {{ display:inline-block; background:#e8c547; color:#0d0f12; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:700; font-size:14px; margin-top:16px; }}
  .footer   {{ font-size:11px; color:#4a4d55; margin-top:28px; text-align:center; line-height:1.6; }}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="logo">PROP<span>INTEL</span></div>
  </div>
  <div class="titulo">🔔 Alerta de oportunidad</div>
  <div class="subtitulo">Se ha detectado un piso que cumple tus criterios en <strong>{zona}</strong></div>

  <div class="card">
    <div class="row">
      <div>
        <div class="label">Asking Price</div>
        <div class="val-ask">{asking} €/m²</div>
      </div>
      <div style="text-align:right">
        <div class="label">Precio Notarial zona</div>
        <div class="val-not">{notarial} €/m²</div>
      </div>
    </div>
    <div class="gap-box">
      <div class="gap-num">+{gap}%</div>
      <div class="gap-sub">Gap — margen de negociación estimado</div>
    </div>
    <div class="label" style="margin-top:12px">Anuncio</div>
    <div style="font-size:14px;margin-top:6px;color:#f0ede8">{titulo}</div>
    <div style="font-size:12px;color:#8a8d94;margin-top:4px">{ciudad} · {zona} · {superficie}m²</div>
  </div>

  <a href="{url}" class="btn">Ver anuncio →</a>

  <div class="footer">
    Alerta configurada: asking ≤ {precio_max}€/m² · gap ≥ {gap_min}% · {descripcion}<br>
    <a href="https://urbia.es/alertas" style="color:#4a4d55">Gestionar alertas</a> · UrbIA
  </div>
</div>
</body>
</html>
"""


class EmailNotificador:

    async def enviar_disparo(
        self,
        alerta: AlertaConfig,
        anuncio: AnuncioPortal,
        gap_pct: float,
        asking_m2: float,
        notarial_m2: float,
    ) -> bool:
        """Envía el email de alerta de forma asíncrona."""
        if not settings.smtp_user or not settings.smtp_password:
            logger.warning("SMTP no configurado — alerta no enviada por email")
            return False

        try:
            html = HTML_TEMPLATE.format(
                zona=alerta.zona,
                asking=f"{asking_m2:,.0f}".replace(",", "."),
                notarial=f"{notarial_m2:,.0f}".replace(",", "."),
                gap=f"{gap_pct:.1f}",
                titulo=anuncio.titulo or "Piso en venta",
                ciudad=anuncio.ciudad.title(),
                superficie=anuncio.superficie_m2 or "—",
                url=anuncio.url,
                precio_max=f"{alerta.precio_max_asking:,.0f}".replace(",", "."),
                gap_min=alerta.gap_minimo_pct,
                descripcion=alerta.descripcion or "—",
            )

            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"🔔 UrbIA: oportunidad en {alerta.zona} (+{gap_pct:.1f}% gap)"
            msg["From"]    = settings.alert_from
            msg["To"]      = alerta.email_destino
            msg.attach(MIMEText(html, "html"))

            await aiosmtplib.send(
                msg,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                start_tls=True,
                username=settings.smtp_user,
                password=settings.smtp_password,
            )

            logger.info(f"✉️ Email enviado a {alerta.email_destino} — {alerta.zona}")
            return True

        except Exception as e:
            logger.error(f"Error enviando email a {alerta.email_destino}: {e}")
            return False

    async def enviar_multiple(self, disparos: list[dict]) -> int:
        """Envía todos los emails de disparos. Devuelve nº enviados."""
        enviados = 0
        for d in disparos:
            ok = await self.enviar_disparo(
                alerta=d["alerta"],
                anuncio=d["anuncio"],
                gap_pct=d["gap_pct"],
                asking_m2=d["asking_m2"],
                notarial_m2=d["notarial_m2"],
            )
            if ok:
                enviados += 1
            await asyncio.sleep(0.5)   # anti-spam entre emails
        return enviados
