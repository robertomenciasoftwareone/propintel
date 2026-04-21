"""
Servicio de consulta al Catastro — API pública SOAP (OVCCoordenadas + OVCCallejero).
Endpoints:
  - Consulta por referencia catastral → datos del inmueble
  - Consulta por coordenadas → referencia catastral más cercana
Documentación: https://www.catastro.meh.es/ws/Webservices_Libres.pdf
"""
import httpx
from xml.etree import ElementTree as ET
from dataclasses import dataclass
from typing import Optional
from loguru import logger


# Namespaces del WSDL del Catastro
NS = {
    "cat": "http://www.catastro.meh.es/",
    "con": "http://www.catastro.meh.es/Consulta_DNP",
}

BASE_URL = "https://ovc.catastro.meh.es/ovcservweb"
CONSULTA_DNPRC = f"{BASE_URL}/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC"
CONSULTA_COOR = f"{BASE_URL}/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR"


@dataclass
class DatosCatastrales:
    referencia_catastral: str
    direccion: Optional[str] = None
    superficie_m2: Optional[float] = None
    anio_construccion: Optional[int] = None
    uso: Optional[str] = None           # Residencial, Comercial, etc.
    clase: Optional[str] = None         # Urbano / Rústico
    coeficiente_participacion: Optional[float] = None


class CatastroService:
    """Cliente para la API pública SOAP del Catastro español."""

    def __init__(self, timeout: float = 15.0):
        self._timeout = timeout

    async def consultar_por_referencia(self, referencia_catastral: str) -> Optional[DatosCatastrales]:
        """
        Consulta datos de un inmueble por su referencia catastral (14 o 20 dígitos).
        Usa el endpoint Consulta_DNPRC del Catastro.
        """
        if len(referencia_catastral) < 14:
            logger.warning(f"Referencia catastral demasiado corta: {referencia_catastral}")
            return None

        rc1 = referencia_catastral[:7]
        rc2 = referencia_catastral[7:14]

        params = {
            "Provincia": "",
            "Municipio": "",
            "SiglaVia": "",
            "NombreVia": "",
            "Numero": "",
            "Bloque": "",
            "Escalera": "",
            "Planta": "",
            "Puerta": "",
            "RC1": rc1,
            "RC2": rc2,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(CONSULTA_DNPRC, params=params)
                resp.raise_for_status()
        except httpx.HTTPError as e:
            logger.error(f"Error HTTP consultando Catastro: {e}")
            return None

        return self._parsear_respuesta_dnprc(resp.text, referencia_catastral)

    async def consultar_por_coordenadas(self, lat: float, lon: float) -> Optional[str]:
        """
        Obtiene la referencia catastral más cercana a unas coordenadas.
        Devuelve la referencia catastral (14 chars) o None.
        """
        params = {
            "SRS": "EPSG:4326",
            "Coordenada_X": str(lon),
            "Coordenada_Y": str(lat),
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(CONSULTA_COOR, params=params)
                resp.raise_for_status()
        except httpx.HTTPError as e:
            logger.error(f"Error HTTP consultando coordenadas Catastro: {e}")
            return None

        return self._parsear_rc_coordenadas(resp.text)

    # ── Parsers XML ─────────────────────────────────────────────────────────

    def _parsear_respuesta_dnprc(self, xml_text: str, ref: str) -> Optional[DatosCatastrales]:
        """Extrae superficie, año de construcción y uso del XML de Consulta_DNPRC."""
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError as e:
            logger.error(f"XML inválido del Catastro: {e}")
            return None

        # Buscar nodo bico (bienes inmuebles / consulta)
        bico = root.find(".//{http://www.catastro.meh.es/}bico")
        if bico is None:
            # Probar sin namespace
            bico = root.find(".//bico")
        if bico is None:
            # Posible error del Catastro
            err = root.find(".//{http://www.catastro.meh.es/}lerr") or root.find(".//lerr")
            if err is not None:
                err_desc = err.findtext("err/des") or err.findtext("{http://www.catastro.meh.es/}err/{http://www.catastro.meh.es/}des") or "Error desconocido"
                logger.warning(f"Catastro devolvió error para {ref}: {err_desc}")
            return None

        resultado = DatosCatastrales(referencia_catastral=ref)

        # Dirección
        ldt = bico.find(".//{http://www.catastro.meh.es/}ldt") or bico.find(".//ldt")
        if ldt is not None and ldt.text:
            resultado.direccion = ldt.text.strip()

        # Datos físicos del inmueble (debi > lcons)
        debi = bico.find(".//{http://www.catastro.meh.es/}debi") or bico.find(".//debi")
        if debi is not None:
            # Superficie construida
            sfc = debi.findtext("{http://www.catastro.meh.es/}sfc") or debi.findtext("sfc")
            if sfc:
                try:
                    resultado.superficie_m2 = float(sfc)
                except ValueError:
                    pass

            # Año de construcción
            ant = debi.findtext("{http://www.catastro.meh.es/}ant") or debi.findtext("ant")
            if ant:
                try:
                    resultado.anio_construccion = int(ant)
                except ValueError:
                    pass

            # Uso principal
            luso = debi.findtext("{http://www.catastro.meh.es/}luso") or debi.findtext("luso")
            if luso:
                resultado.uso = luso.strip()

        # Clase (urbano/rústico)
        loine = bico.find(".//{http://www.catastro.meh.es/}loine") or bico.find(".//loine")
        if loine is not None:
            cmc = loine.findtext("{http://www.catastro.meh.es/}cmc") or loine.findtext("cmc")
            if cmc:
                resultado.clase = "Urbano" if cmc.startswith("U") else "Rústico"

        # Coeficiente de participación
        dfcons = bico.find(".//{http://www.catastro.meh.es/}dfcons") or bico.find(".//dfcons")
        if dfcons is not None:
            cpt = dfcons.findtext("{http://www.catastro.meh.es/}cpt") or dfcons.findtext("cpt")
            if cpt:
                try:
                    resultado.coeficiente_participacion = float(cpt.replace(",", "."))
                except ValueError:
                    pass

        logger.info(
            f"Catastro {ref}: {resultado.superficie_m2}m² | "
            f"año {resultado.anio_construccion} | uso {resultado.uso}"
        )
        return resultado

    def _parsear_rc_coordenadas(self, xml_text: str) -> Optional[str]:
        """Extrae la referencia catastral del XML de Consulta_RCCOOR."""
        try:
            root = ET.fromstring(xml_text)
        except ET.ParseError:
            return None

        # Buscar el nodo rc (referencia catastral)
        for tag in [
            ".//{http://www.catastro.meh.es/}rc",
            ".//rc",
        ]:
            rc_node = root.find(tag)
            if rc_node is not None:
                pc1 = rc_node.findtext("{http://www.catastro.meh.es/}pc1") or rc_node.findtext("pc1") or ""
                pc2 = rc_node.findtext("{http://www.catastro.meh.es/}pc2") or rc_node.findtext("pc2") or ""
                rc = (pc1 + pc2).strip()
                if len(rc) >= 14:
                    return rc

        return None
