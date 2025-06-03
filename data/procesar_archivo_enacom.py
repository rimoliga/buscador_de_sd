import pandas as pd
import json
import gzip

# Cargar ambos archivos Excel
listado_radioaficionados = pd.read_excel('data/Listado de Radioaficionado 12.12.2024.xlsx')
listado_especiales = pd.read_excel('data/Señal Distintiva Especiales.xlsx')

# Normalizar columnas del archivo de especiales
listado_especiales = listado_especiales.rename(columns={
    "Radio Club / Institución / Radioaficionado": "Titular de la Licencia",
    "Señal distintiva especial": "Señal Distintiva Especial",
    "Señal distintiva asociada": "Señal Distintiva Asociada"
})

# Agregar columna de señal especial al DataFrame principal
listado_radioaficionados["Señal Distintiva Especial"] = ""

# Para cada señal especial, asignarla a la señal asociada en el principal
for _, row in listado_especiales.iterrows():
    asociada = row["Señal distintiva"]
    especial = row["Señal Distintiva Especial"]
    mask = listado_radioaficionados["Señal Distintiva"] == asociada
    # Si ya hay una señal especial, concatenar
    listado_radioaficionados.loc[mask, "Señal Distintiva Especial"] = listado_radioaficionados.loc[mask, "Señal Distintiva Especial"].apply(
        lambda x: (x + "," if x else "") + especial
    )

# Guardar el archivo unificado
listado_radioaficionados.to_json('data/listado_radioaficionados_unificado.json', orient='records', force_ascii=False, indent=4)

with open('data/listado_radioaficionados_unificado.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    with gzip.open('data/listado_radioaficionados_unificado.json.gz', 'wt', encoding='utf-8') as l:
        json.dump(data, l, separators=(',', ':'), ensure_ascii=False)