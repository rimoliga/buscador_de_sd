import pandas as pd
import json
import gzip
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

logging.info("Cargando archivos Excel...")
listado_radioaficionados = pd.read_excel('data/Listado de Radioaficionado 14.10.2025.xlsx')
listado_especiales = pd.read_excel('data/Señal Distintiva Especiales.xlsx')

logging.info("Normalizando columnas de archivo de especiales...")
listado_especiales = listado_especiales.rename(columns={
    "Radio Club / Institución / Radioaficionado": "Titular de la Licencia",
    "Señal distintiva especial": "Señal Distintiva Especial",
    "Señal distintiva asociada": "Señal Distintiva Asociada"
})

logging.info("Agregando columna de señal especial al DataFrame principal...")
listado_radioaficionados["Señal Distintiva Especial"] = ""

logging.info("Asignando señales especiales a las señales asociadas...")
for _, row in listado_especiales.iterrows():
    asociada = row["Señal distintiva"]
    especial = row["Señal Distintiva Especial"]
    mask = listado_radioaficionados["Señal Distintiva"] == asociada
    listado_radioaficionados.loc[mask, "Señal Distintiva Especial"] = listado_radioaficionados.loc[mask, "Señal Distintiva Especial"].apply(
        lambda x: (x + "," if x else "") + especial
    )

logging.info("Guardando archivo unificado JSON...")
listado_radioaficionados.to_json('data/listado_radioaficionados_unificado.json', orient='records', force_ascii=False, indent=4)

logging.info("Comenzando compresión GZIP...")
with open('data/listado_radioaficionados_unificado.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    with gzip.open('data/listado_radioaficionados_unificado.json.gz', 'wt', encoding='utf-8') as l:
        json.dump(data, l, separators=(',', ':'), ensure_ascii=False)
logging.info("Proceso finalizado correctamente.")