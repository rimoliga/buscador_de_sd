import requests
from bs4 import BeautifulSoup
import pandas as pd
from io import StringIO
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

def obtener_tokens(url):
    logger.info("Solicitando página principal para obtener tokens y cookies...")
    response = requests.get(url)
    bs = BeautifulSoup(response.content, 'html.parser')
    cookie = response.headers['Set-Cookie'].split(';')[0]
    csrf_token = bs.select('input[name="csrf_token"]')[0]['value']
    logger.info("Tokens y cookies obtenidos correctamente.")
    return cookie, csrf_token

def obtener_dataframe(url, cookie, csrf_token, payload_extra):
    logger.info(f"Realizando POST para obtener datos: {payload_extra}...")
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        "Origin": "hertz.enacom.gob.ar",
        "Referer": url,
        "Cookie": cookie
    }
    payload = f"csrf_token={csrf_token}&{payload_extra}=1"
    res = requests.post(url, data=payload, headers=headers)
    html_str = StringIO(res.text)
    df = pd.read_html(html_str)[0]
    logger.info(f"Datos recibidos y convertidos a DataFrame: {payload_extra}.")
    return df

def procesar_dataframe_todos(df):
    logger.info("Procesando DataFrame de consulta completa...")
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

def main():
    url = "https://hertz.enacom.gob.ar/se/portal/arg/publico/ListadoRadioaficionado.php"
    try:
        cookie, csrf_token = obtener_tokens(url)

        df_todos = obtener_dataframe(url, cookie, csrf_token, "mostrarTodos")
        df_todos = procesar_dataframe_todos(df_todos)

        df_especial = obtener_dataframe(url, cookie, csrf_token, "soloCuitEspecial")
        df_especial = procesar_dataframe_especial(df_especial)

        df_final = pd.concat([df_todos, df_especial]).drop_duplicates().reset_index(drop=True)

        df_final = agregar_licencias_manualmente(df_final)

        logger.info("Guardando archivo Excel final...")
        df_final.to_excel("data/Listado de Radioaficionado 23.09.2025.xlsx", index=False)
        logger.info("Archivo Excel guardado correctamente.")
    except Exception as e:
        logger.error(f"Error en el proceso: {e}")

if __name__ == "__main__":
    main()