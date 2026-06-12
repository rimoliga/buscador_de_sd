import argparse
import gzip
import json
from pathlib import Path

import pandas as pd
import pytest

from data.procesar_archivo_enacom import (
    _unificar_especiales,
    asociar_especiales,
    construir_mapa_especial,
    determinar_excel,
    guardar_datasets,
    normalizar_json_path,
)
from data.scrap_enacom import (
    agregar_licencias_manualmente,
    procesar_dataframe_especial,
    procesar_dataframe_todos,
    validar_columnas,
)


# ---------------------------------------------------------------------------
# validar_columnas
# ---------------------------------------------------------------------------

def test_validar_columnas_ok():
    validar_columnas(["A", "B", "C"], {"A", "B"}, "ctx")


def test_validar_columnas_faltantes():
    with pytest.raises(ValueError, match="Faltan columnas"):
        validar_columnas(["A"], {"A", "B"}, "ctx")


# ---------------------------------------------------------------------------
# procesar_dataframe_todos — detecta cambios de columnas en el HTML de ENACOM
# ---------------------------------------------------------------------------

def _df_todos():
    return pd.DataFrame({
        "Radioaficionado": ["Juan Pérez"],
        "Categoria": ["A"],
        "Ciudad": ["Buenos Aires"],
        "Señal Distintiva": ["LU1AA"],
        "Provincia": ["Buenos Aires"],
    })


def test_procesar_dataframe_todos_columnas_correctas():
    result = procesar_dataframe_todos(_df_todos())
    assert list(result.columns) == [
        "Titular de la Licencia", "Señal Distintiva", "Categoría", "Provincia", "Localidad"
    ]


def test_procesar_dataframe_todos_renombra():
    result = procesar_dataframe_todos(_df_todos())
    assert result.iloc[0]["Titular de la Licencia"] == "Juan Pérez"
    assert result.iloc[0]["Localidad"] == "Buenos Aires"


def test_procesar_dataframe_todos_columna_faltante():
    df = _df_todos().drop(columns=["Radioaficionado"])
    with pytest.raises(ValueError):
        procesar_dataframe_todos(df)


# ---------------------------------------------------------------------------
# procesar_dataframe_especial — detecta cambios de columnas en el HTML de ENACOM
# ---------------------------------------------------------------------------

def _df_especial():
    return pd.DataFrame({
        "INSTITUCION": ["Radio Club X"],
        "Categoria": ["B"],
        "Ciudad": ["Córdoba"],
        "Señal Distintiva": ["LU2AA"],
        "Provincia": ["Córdoba"],
    })


def test_procesar_dataframe_especial_columnas_correctas():
    result = procesar_dataframe_especial(_df_especial())
    assert list(result.columns) == [
        "Titular de la Licencia", "Señal Distintiva", "Categoría", "Provincia", "Localidad"
    ]


def test_procesar_dataframe_especial_columna_faltante():
    df = _df_especial().drop(columns=["INSTITUCION"])
    with pytest.raises(ValueError):
        procesar_dataframe_especial(df)


# ---------------------------------------------------------------------------
# agregar_licencias_manualmente
# ---------------------------------------------------------------------------

def _df_base():
    return pd.DataFrame({
        "Titular de la Licencia": ["Juan"],
        "Señal Distintiva": ["LU1AA"],
        "Categoría": ["A"],
        "Provincia": ["Buenos Aires"],
        "Localidad": ["CABA"],
    })


def test_agregar_licencias_manualmente_sin_adicionales():
    df = _df_base()
    result = agregar_licencias_manualmente(df)
    assert len(result) == 1


def test_agregar_licencias_manualmente_agrega():
    df = _df_base()
    adicionales = [{"Titular de la Licencia": "Pedro", "Señal Distintiva": "LU2BB",
                    "Categoría": "B", "Provincia": "Córdoba", "Localidad": "CBA"}]
    result = agregar_licencias_manualmente(df, adicionales)
    assert len(result) == 2
    assert "LU2BB" in result["Señal Distintiva"].values


def test_agregar_licencias_manualmente_deduplica():
    df = _df_base()
    adicionales = [{"Titular de la Licencia": "Juan", "Señal Distintiva": "LU1AA",
                    "Categoría": "A", "Provincia": "Buenos Aires", "Localidad": "CABA"}]
    result = agregar_licencias_manualmente(df, adicionales)
    assert len(result) == 1


# ---------------------------------------------------------------------------
# _unificar_especiales
# ---------------------------------------------------------------------------

def test_unificar_especiales_deduplicacion():
    series = pd.Series(["LU1XYZ", "LU1XYZ", "LU1ABC"])
    assert _unificar_especiales(series) == "LU1XYZ,LU1ABC"


def test_unificar_especiales_unico():
    assert _unificar_especiales(pd.Series(["LU1XYZ"])) == "LU1XYZ"


def test_unificar_especiales_vacio_ignorado():
    series = pd.Series(["", "LU1XYZ"])
    result = _unificar_especiales(series)
    assert "LU1XYZ" in result
    assert result.startswith(",") is False


# ---------------------------------------------------------------------------
# construir_mapa_especial
# ---------------------------------------------------------------------------

def _df_especiales_raw():
    return pd.DataFrame({
        "Señal distintiva": ["LU1AA", "LU1AA", "LU2BB"],
        "Señal Distintiva Especial": ["LU1XYZ", "LU1ABC", "LU2XYZ"],
    })


def test_construir_mapa_especial_keys():
    mapa = construir_mapa_especial(_df_especiales_raw())
    assert "LU1AA" in mapa
    assert "LU2BB" in mapa


def test_construir_mapa_especial_multiples_unificados():
    mapa = construir_mapa_especial(_df_especiales_raw())
    parts = mapa["LU1AA"].split(",")
    assert "LU1XYZ" in parts
    assert "LU1ABC" in parts


def test_construir_mapa_especial_columna_faltante():
    df = pd.DataFrame({"col1": [], "col2": []})
    with pytest.raises(ValueError, match="Faltan columnas"):
        construir_mapa_especial(df)


# ---------------------------------------------------------------------------
# asociar_especiales
# ---------------------------------------------------------------------------

def _df_radioaficionados():
    return pd.DataFrame({
        "Titular de la Licencia": ["Juan", "Pedro"],
        "Señal Distintiva": ["LU1AA", "LU2BB"],
        "Categoría": ["A", "B"],
        "Provincia": ["BA", "CR"],
        "Localidad": ["CABA", "Córdoba"],
    })


def test_asociar_especiales_asigna():
    especiales = pd.DataFrame({
        "Señal distintiva": ["LU1AA"],
        "Señal Distintiva Especial": ["LU1XYZ"],
    })
    result = asociar_especiales(_df_radioaficionados(), especiales)
    row = result[result["Señal Distintiva"] == "LU1AA"].iloc[0]
    assert row["Señal Distintiva Especial"] == "LU1XYZ"


def test_asociar_especiales_sin_match_queda_vacio():
    especiales = pd.DataFrame({
        "Señal distintiva": ["LU1AA"],
        "Señal Distintiva Especial": ["LU1XYZ"],
    })
    result = asociar_especiales(_df_radioaficionados(), especiales)
    row = result[result["Señal Distintiva"] == "LU2BB"].iloc[0]
    assert row["Señal Distintiva Especial"] == ""


def test_asociar_especiales_case_insensitive():
    radioaficionados = pd.DataFrame({
        "Titular de la Licencia": ["Juan"],
        "Señal Distintiva": ["lu1aa"],
        "Categoría": ["A"],
        "Provincia": ["BA"],
        "Localidad": ["CABA"],
    })
    especiales = pd.DataFrame({
        "Señal distintiva": ["LU1AA"],
        "Señal Distintiva Especial": ["LU1XYZ"],
    })
    result = asociar_especiales(radioaficionados, especiales)
    assert result.iloc[0]["Señal Distintiva Especial"] == "LU1XYZ"


# ---------------------------------------------------------------------------
# normalizar_json_path
# ---------------------------------------------------------------------------

def test_normalizar_json_path_agrega_extension():
    result = normalizar_json_path(Path("data/output"))
    assert result.suffix == ".json"


def test_normalizar_json_path_conserva_extension():
    result = normalizar_json_path(Path("data/output.json"))
    assert result.suffix == ".json"
    assert result.stem == "output"


# ---------------------------------------------------------------------------
# determinar_excel
# ---------------------------------------------------------------------------

def _args(tmp_path, excel=None):
    return argparse.Namespace(excel=excel, data_dir=str(tmp_path))


def test_determinar_excel_sin_archivos_lanza_error(tmp_path):
    with pytest.raises(FileNotFoundError):
        determinar_excel(_args(tmp_path))


def test_determinar_excel_tilde_ignorado(tmp_path):
    (tmp_path / "~$Listado de Radioaficionado 2025.xlsx").touch()
    with pytest.raises(FileNotFoundError):
        determinar_excel(_args(tmp_path))


def test_determinar_excel_retorna_ultimo(tmp_path):
    f1 = tmp_path / "Listado de Radioaficionado 2025-01.xlsx"
    f2 = tmp_path / "Listado de Radioaficionado 2025-12.xlsx"
    f1.touch()
    f2.touch()
    result = determinar_excel(_args(tmp_path))
    assert result == f2


def test_determinar_excel_ruta_explicita(tmp_path):
    xlsx = tmp_path / "mi_archivo.xlsx"
    xlsx.touch()
    result = determinar_excel(_args(tmp_path, excel=str(xlsx)))
    assert result == xlsx


def test_determinar_excel_ruta_explicita_inexistente(tmp_path):
    with pytest.raises(FileNotFoundError):
        determinar_excel(_args(tmp_path, excel=str(tmp_path / "no_existe.xlsx")))


# ---------------------------------------------------------------------------
# guardar_datasets
# ---------------------------------------------------------------------------

def test_guardar_datasets_crea_archivos(tmp_path):
    df = pd.DataFrame({"Señal Distintiva": ["LU1AA"], "Titular de la Licencia": ["Juan"]})
    json_path, gzip_path = guardar_datasets(df, tmp_path / "out.json", tmp_path / "out.json.gz")
    assert json_path.exists()
    assert gzip_path.exists()


def test_guardar_datasets_gzip_valido(tmp_path):
    df = pd.DataFrame({"Señal Distintiva": ["LU1AA"]})
    _, gzip_path = guardar_datasets(df, tmp_path / "out.json", tmp_path / "out.json.gz")
    with gzip.open(gzip_path, "rt", encoding="utf-8") as f:
        records = json.load(f)
    assert records[0]["Señal Distintiva"] == "LU1AA"


def test_guardar_datasets_nan_reemplazado(tmp_path):
    df = pd.DataFrame({"Señal Distintiva": ["LU1AA"], "Localidad": [None]})
    _, gzip_path = guardar_datasets(df, tmp_path / "out.json", tmp_path / "out.json.gz")
    with gzip.open(gzip_path, "rt", encoding="utf-8") as f:
        records = json.load(f)
    assert records[0]["Localidad"] == ""
