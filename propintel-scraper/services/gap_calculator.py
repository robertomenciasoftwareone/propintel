"""
Servicio de cálculo de Gap: cruza los datos de asking (Idealista + Fotocasa)
con los precios notariales para calcular la sobrevaloración por zona.
Desglose por portal: asking_idealista_m2 / asking_fotocasa_m2 / asking_medio_m2.
También evalúa las alertas configuradas y dispara notificaciones.
"""
from datetime import datetime
from typing import Optional
from loguru import logger
from collections import defaultdict
import statistics

from models.schemas import (
    AnuncioPortal, DatoNotarial, GapAnalisis, AlertaConfig, FuentePrecio
)


class GapCalculator:

    def calcular_gaps(
        self,
        anuncios: list[AnuncioPortal],
        datos_notariales: list[DatoNotarial],
        idealista_city_avgs: Optional[dict[str, float]] = None,
    ) -> list[GapAnalisis]:
        """
        Para cada zona con datos suficientes, calcula el gap entre el precio
        de asking (combinado) y el precio notarial. Desglosa por fuente:
        asking_idealista_m2, asking_fotocasa_m2.
        Mínimo 3 anuncios por fuente para considerarla estadísticamente válida.

        Args:
            idealista_city_avgs: dict {ciudad → avgPriceByArea €/m²} devuelto
                directamente por Idealista. Cuando está disponible se usa como
                asking_idealista_m2 para la ciudad en lugar de la mediana de muestra,
                ya que Idealista lo calcula sobre su dataset completo.
        """
        MIN_ANUNCIOS = 1

        # Índice notarial por ciudad+municipio (lower para matching)
        # Guardamos también el nombre original para usarlo en la salida
        notarial_idx: dict[tuple[str, str], DatoNotarial] = {}
        nombre_original: dict[tuple[str, str], tuple[str, str]] = {}
        for dato in datos_notariales:
            key = (dato.ciudad.lower(), dato.municipio.lower())
            notarial_idx[key] = dato
            nombre_original[key] = (dato.ciudad, dato.municipio)

        # Agrupar anuncios por ciudad+zona, separando por fuente
        grupos_idealista: dict[tuple[str, str], list[float]] = defaultdict(list)
        grupos_fotocasa:  dict[tuple[str, str], list[float]] = defaultdict(list)

        for anuncio in anuncios:
            precio = anuncio.calcular_precio_m2()
            if not precio or precio <= 500:
                continue
            key = (anuncio.ciudad.lower(), (anuncio.distrito or "").lower())
            if anuncio.fuente == FuentePrecio.IDEALISTA:
                grupos_idealista[key].append(precio)
            elif anuncio.fuente == FuentePrecio.FOTOCASA:
                grupos_fotocasa[key].append(precio)
            # Conservar nombre original del anuncio si no viene del notarial
            if key not in nombre_original:
                nombre_original[key] = (anuncio.ciudad, anuncio.distrito or "")

        # Unión de claves con al menos una fuente con datos
        todas_claves = set(grupos_idealista.keys()) | set(grupos_fotocasa.keys())

        gaps: list[GapAnalisis] = []
        periodo = datetime.utcnow().strftime("%Y-%m")

        for (ciudad, zona) in todas_claves:
            # Usar nombres con casing original (preferencia: notarial > anuncio)
            ciudad_orig, zona_orig = nombre_original.get((ciudad, zona), (ciudad, zona))
            precios_idealista = grupos_idealista.get((ciudad, zona), [])
            precios_fotocasa  = grupos_fotocasa.get((ciudad, zona), [])
            precios_todos     = precios_idealista + precios_fotocasa

            if len(precios_todos) < MIN_ANUNCIOS:
                continue

            # Mediana combinada (robusta a outliers de una fuente sola)
            asking_medio = statistics.median(precios_todos)

            # Mediana por fuente — None si no hay suficientes anuncios.
            # Si Idealista proporcionó avgPriceByArea para esta ciudad, usarlo
            # como asking_idealista_m2 (más fiable que nuestra muestra).
            idealista_city_avg = (idealista_city_avgs or {}).get(ciudad)
            asking_idealista = idealista_city_avg or (
                statistics.median(precios_idealista)
                if len(precios_idealista) >= MIN_ANUNCIOS else None
            )
            if idealista_city_avg:
                logger.debug(
                    f"  {ciudad}/{zona}: usando avgPriceByArea de Idealista "
                    f"{idealista_city_avg:.0f} €/m² (muestra: {len(precios_idealista)} anuncios)"
                )
            asking_fotocasa = (
                statistics.median(precios_fotocasa)
                if len(precios_fotocasa) >= MIN_ANUNCIOS else None
            )

            # Recalcular asking_medio incorporando el precio oficial de Idealista
            if idealista_city_avg and precios_fotocasa:
                # Media ponderada: Idealista (oficial) + mediana Fotocasa
                asking_medio = (idealista_city_avg + statistics.median(precios_fotocasa)) / 2
            elif idealista_city_avg:
                asking_medio = idealista_city_avg

            # Buscar dato notarial correspondiente
            notarial = self._buscar_notarial(ciudad, zona, notarial_idx)
            if not notarial:
                logger.debug(f"Sin dato notarial para {ciudad}/{zona} — omitiendo gap")
                continue

            gap = GapAnalisis.calcular(
                ciudad=ciudad_orig,
                zona=zona_orig,
                asking=asking_medio,
                notarial=notarial.precio_medio_m2,
                num_anuncios=len(precios_todos),
                num_transacciones=notarial.num_transacciones,
                periodo=periodo,
                asking_idealista=asking_idealista,
                asking_fotocasa=asking_fotocasa,
                num_anuncios_idealista=len(precios_idealista),
                num_anuncios_fotocasa=len(precios_fotocasa),
            )
            gaps.append(gap)
            msg = f"Gap {ciudad_orig}/{zona_orig}: combinado {asking_medio:.0f}€"
            if asking_idealista:
                msg += f" | Idealista {asking_idealista:.0f}€"
            if asking_fotocasa:
                msg += f" | Fotocasa {asking_fotocasa:.0f}€"
            msg += f" | Notarial {notarial.precio_medio_m2:.0f}€ = {gap.gap_pct:.1f}%"
            logger.info(msg)

        return gaps

    def evaluar_alertas(
        self,
        anuncios: list[AnuncioPortal],
        datos_notariales: list[DatoNotarial],
        alertas: list[AlertaConfig],
    ) -> list[dict]:
        """
        Devuelve lista de disparos: alertas que se han activado
        con los anuncios del día.
        """
        # Índice notarial
        notarial_idx: dict[tuple[str, str], DatoNotarial] = {}
        for dato in datos_notariales:
            key = (dato.ciudad.lower(), dato.municipio.lower())
            notarial_idx[key] = dato

        disparos = []

        for alerta in alertas:
            if not alerta.activa:
                continue

            zona_lower = alerta.zona.lower()
            ciudad_lower = alerta.ciudad.lower()

            # Anuncios que coinciden con la zona de la alerta
            anuncios_zona = [
                a for a in anuncios
                if a.ciudad.lower() == ciudad_lower
                and (a.distrito or "").lower() == zona_lower
            ]

            # Referencia notarial
            notarial = self._buscar_notarial(ciudad_lower, zona_lower, notarial_idx)
            if not notarial:
                continue

            for anuncio in anuncios_zona:
                precio_m2 = anuncio.calcular_precio_m2()
                if not precio_m2:
                    continue

                # Criterio 1: asking dentro del presupuesto
                if precio_m2 > alerta.precio_max_asking:
                    continue

                # Criterio 2: gap mínimo superado
                gap = ((precio_m2 - notarial.precio_medio_m2) / notarial.precio_medio_m2 * 100)
                if gap < alerta.gap_minimo_pct:
                    continue

                disparos.append({
                    "alerta":              alerta,
                    "anuncio":             anuncio,
                    "gap_pct":             round(gap, 2),
                    "asking_m2":           precio_m2,
                    "notarial_m2":         notarial.precio_medio_m2,
                    "fecha":               datetime.utcnow(),
                })
                logger.info(
                    f"🔔 Alerta disparada: {alerta.zona} — "
                    f"{precio_m2:.0f}€/m² asking vs {notarial.precio_medio_m2:.0f}€/m² notarial "
                    f"(gap {gap:.1f}%)"
                )

        return disparos

    def _buscar_notarial(
        self,
        ciudad: str,
        zona: str,
        idx: dict[tuple[str, str], DatoNotarial],
    ) -> Optional[DatoNotarial]:
        """
        Busca dato notarial con lógica fuzzy:
        primero zona exacta, luego ciudad general.
        """
        # Coincidencia exacta zona
        dato = idx.get((ciudad, zona))
        if dato:
            return dato
        # Fallback: ciudad sola
        for key, val in idx.items():
            if key[0] == ciudad:
                return val
        return None


class RangoFiableCalculator:
    """Calcula el rango de precio fiable (percentiles notariales)."""

    def calcular_rango(
        self,
        anuncios_zona: list[AnuncioPortal],
        notarial: DatoNotarial,
    ) -> dict:
        precios = [
            a.calcular_precio_m2()
            for a in anuncios_zona
            if a.calcular_precio_m2() and a.calcular_precio_m2() > 500
        ]

        if len(precios) < 3:
            return {}

        precios_sorted = sorted(precios)
        n = len(precios_sorted)

        return {
            "zona":            anuncios_zona[0].distrito,
            "ciudad":          anuncios_zona[0].ciudad,
            "asking_p25":      precios_sorted[int(n * 0.25)],
            "asking_mediana":  statistics.median(precios_sorted),
            "asking_p75":      precios_sorted[int(n * 0.75)],
            "notarial_medio":  notarial.precio_medio_m2,
            "notarial_min":    notarial.precio_min_m2,
            "notarial_max":    notarial.precio_max_m2,
            "num_anuncios":    n,
        }
