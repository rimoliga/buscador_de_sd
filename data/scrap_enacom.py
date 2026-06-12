import datetime
import logging
from hashlib import sha1
from io import StringIO
from pathlib import Path
from typing import Iterable

import urllib3

import pandas as pd
import requests
from bs4 import BeautifulSoup
from requests import Session
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

RAW_DIR = Path("data/raw")
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) CodexScraper/1.0 Safari/537.36"
)
REQUEST_TIMEOUT = 15


class _NoVerifyAdapter(HTTPAdapter):
    # hertz.enacom.gob.ar usa una CA del gobierno argentino ausente en el
    # trust store estándar de Linux/CI. Forzamos verify=False al nivel del
    # adapter porque session.verify no propaga correctamente en urllib3 v2.
    def send(self, request, **kwargs):
        kwargs["verify"] = False
        return super().send(request, **kwargs)


def build_session() -> Session:
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=1.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "POST"),
    )
    adapter = _NoVerifyAdapter(max_retries=retries)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def _persist_raw(content: bytes, prefix: str, extension: str = "html") -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    digest = sha1(content).hexdigest()[:10]
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    filename = RAW_DIR / f"{prefix}_{timestamp}_{digest}.{extension}"
    filename.write_bytes(content)
    logger.debug("Respuesta guardada para depuración: %s", filename)


def obtener_tokens(session: Session, url: str):
    logger.info("Solicitando página principal para obtener tokens y cookies...")
    response = session.get(url, timeout=REQUEST_TIMEOUT)
    response.raise_for_status()
    _persist_raw(response.content, "pagina_principal")
    bs = BeautifulSoup(response.content, 'html.parser')
    token_input = bs.select_one('input[name="csrf_token"]')
    if not token_input:
        raise RuntimeError("No se encontró el token CSRF en la página de inicio de ENACOM.")
    csrf_token = token_input['value']
    cookie_header = response.headers.get('Set-Cookie')
    if not cookie_header:
        raise RuntimeError("No se recibió cookie desde ENACOM.")
    cookie = cookie_header.split(';')[0]
    logger.info("Tokens y cookies obtenidos correctamente.")
    return cookie, csrf_token


def obtener_dataframe(session: Session, url: str, cookie: str, csrf_token: str, payload_extra: str):
    logger.info(f"Realizando POST para obtener datos: {payload_extra}...")
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        "Origin": "https://hertz.enacom.gob.ar",
        "Referer": url,
        "Cookie": cookie,
        "User-Agent": USER_AGENT,
    }
    payload = f"csrf_token={csrf_token}&{payload_extra}=1"
    res = session.post(url, data=payload, headers=headers, timeout=REQUEST_TIMEOUT)
    res.raise_for_status()
    _persist_raw(res.content, f"tabla_{payload_extra}")
    html_str = StringIO(res.text)
    tablas = pd.read_html(html_str)
    if not tablas:
        raise ValueError(f"No se encontraron tablas en la respuesta de {payload_extra}")
    df = tablas[0]
    logger.info(f"Datos recibidos y convertidos a DataFrame: {payload_extra}.")
    return df

def procesar_dataframe_todos(df):
    logger.info("Procesando DataFrame de consulta completa...")
    validar_columnas(df.columns, {'Radioaficionado', 'Categoria', 'Ciudad', 'Señal Distintiva', 'Provincia'}, "consulta completa")
    df.rename(columns={
        'Radioaficionado': 'Titular de la Licencia',
        'Categoria': 'Categoría',
        'Ciudad': 'Localidad'
    }, inplace=True)
    df = df[['Titular de la Licencia', 'Señal Distintiva', 'Categoría', 'Provincia', 'Localidad']]
    logger.info("DataFrame de consulta completa procesado.")
    return df

def procesar_dataframe_especial(df):
    logger.info("Procesando DataFrame de consulta especial...")
    validar_columnas(df.columns, {'INSTITUCION', 'Categoria', 'Ciudad', 'Señal Distintiva', 'Provincia'}, "consulta especial")
    df.rename(columns={
        'INSTITUCION': 'Titular de la Licencia',
        'Categoria': 'Categoría',
        'Ciudad': 'Localidad'
    }, inplace=True)
    df = df[['Titular de la Licencia', 'Señal Distintiva', 'Categoría', 'Provincia', 'Localidad']]
    logger.info("DataFrame de consulta especial procesado.")
    return df

def agregar_licencias_manualmente(df, licencias_adicionales=None):
    logger.info("Agregando licencias manualmente...")
    if licencias_adicionales is None:
        return df
    df_adicional = pd.DataFrame(licencias_adicionales)
    df_final = pd.concat([df, df_adicional]).drop_duplicates().reset_index(drop=True)
    logger.info("Licencias manuales agregadas.")
    return df_final

def validar_columnas(columnas: Iterable[str], requeridas: set[str], contexto: str) -> None:
    faltantes = requeridas - set(columnas)
    if faltantes:
        raise ValueError(f"Faltan columnas {faltantes} en {contexto}")


def descargar_listado_enacom(url="https://hertz.enacom.gob.ar/se/portal/arg/publico/ListadoRadioaficionado.php",
                              licencias_adicionales=None):
    session = build_session()
    cookie, csrf_token = obtener_tokens(session, url)

    df_todos = obtener_dataframe(session, url, cookie, csrf_token, "mostrarTodos")
    df_todos = procesar_dataframe_todos(df_todos)

    df_especial = obtener_dataframe(session, url, cookie, csrf_token, "soloCuitEspecial")
    df_especial = procesar_dataframe_especial(df_especial)

    df_final = pd.concat([df_todos, df_especial]).drop_duplicates().reset_index(drop=True)
    df_final = agregar_licencias_manualmente(df_final, licencias_adicionales)
    return df_final


def guardar_listado_excel(df, output_path=None):
    fecha = datetime.date.today()
    if output_path is None:
        output_path = Path("data") / f"Listado de Radioaficionado{fecha}.xlsx"
    else:
        output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    logger.info(f"Guardando archivo Excel en {output_path}...")
    df.to_excel(output_path, index=False)
    logger.info("Archivo Excel guardado correctamente.")
    return output_path


def main():
    url = "https://hertz.enacom.gob.ar/se/portal/arg/publico/ListadoRadioaficionado.php"
    try:
        df_final = descargar_listado_enacom(url=url)
        guardar_listado_excel(df_final)
    except Exception as e:
        logger.error(f"Error en el proceso: {e}")

if __name__ == "__main__":
    main()
