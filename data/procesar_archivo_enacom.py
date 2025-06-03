import pandas as pd
import json

listado_radioaficionados = pd.read_excel('data/Listado de Radioaficionado 12.12.2024.xlsx')
listado_radioaficionados.to_json('data/listado_radioaficionados.json', orient='records', force_ascii=False, indent=4)
