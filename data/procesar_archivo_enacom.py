import argparse
import datetime
import gzip
import json
import logging
from pathlib import Path
from typing import Optional, Tuple

import pandas as pd

try:
    from data import scrap_enacom
except ModuleNotFoundError:  # Permite ejecutar el script sin usar -m
    import scrap_enacom  # type: ignore


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Genera el dataset unificado descargando los listados oficiales y combinándolos con las señales especiales."
    )
    parser.add_argument(
        "--output",
        default="data/listado_radioaficionados_unificado.json",
        help="Ruta del archivo JSON a generar (por defecto: %(default)s)."
    )
    parser.add_argument(
        "--gzip-output",
        help="Ruta opcional del archivo JSON comprimido. Si se omite se usa <output>.gz."
    )
    parser.add_argument(
        "--especiales",
        default="data/Señal Distintiva Especiales.xlsx",
        help="Archivo Excel con las señales especiales provistas por ENACOM."
    )
    parser.add_argument(
        "--excel",
        help="Ruta al Excel ya descargado de radioaficionados. Si no se especifica se usará el más reciente encontrado en --data-dir."
    )
    parser.add_argument(
        "--data-dir",
        default="data",
        help="Directorio donde se buscan los Excel descargados (por defecto: %(default)s)."
    )
    parser.add_argument(
        "--scrape",
        action="store_true",
        help="Descarga el listado directamente desde ENACOM antes de procesar. El Excel resultante se guarda en --excel-output si se indica."
    )
    parser.add_argument(
        "--excel-output",
        help="Ruta para guardar el Excel descargado cuando se usa --scrape. Por defecto se usa data/Listado de Radioaficionado<fecha>.xlsx."
    )
    parser.add_argument(
        "--metadata",
        default="data/dataset_metadata.json",
        help="Archivo JSON donde se guardará la fecha y detalles de la última actualización (por defecto: %(default)s)."
    )
    parser.add_argument(
        "--stats-output",
        default="data/listado_radioaficionados_stats.json",
        help="Ruta del archivo JSON con estadísticas agregadas por provincia y categoría."
    )
    return parser.parse_args()


def preparar_listado_radioaficionados(args) -> Tuple[pd.DataFrame, Optional[Path]]:
    if args.scrape:
        logger.info("Descargando listado directamente desde ENACOM...")
        df = scrap_enacom.descargar_listado_enacom()
        destino = scrap_enacom.guardar_listado_excel(df, args.excel_output)
        logger.info("Excel descargado y guardado en %s", destino)
        return df, destino

    excel_path = determinar_excel(args)
    logger.info("Cargando listado de radioaficionados desde %s", excel_path)
    return pd.read_excel(excel_path), excel_path


def determinar_excel(args) -> Path:
    if args.excel:
        path = Path(args.excel)
        if not path.exists():
            raise FileNotFoundError(f"No se encontró el archivo especificado en --excel: {path}")
        return path

    base_dir = Path(args.data_dir)
    candidatos = sorted(
        p for p in base_dir.glob("Listado de Radioaficionado*.xlsx")
        if not p.name.startswith("~$")
    )
    if not candidatos:
        raise FileNotFoundError(
            f"No se encontraron Excel de radioaficionados en {base_dir}. "
            "Use --scrape para generar uno nuevo o indique la ruta con --excel."
        )
    return candidatos[-1]


def cargar_especiales(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"No se encontró el archivo de señales especiales: {path}")
    logger.info("Cargando señales especiales desde %s", path)
    especiales = pd.read_excel(path)
    especiales = especiales.rename(columns={
        "Radio Club / Institución / Radioaficionado": "Titular de la Licencia",
        "Señal distintiva especial": "Señal Distintiva Especial",
        "Señal distintiva asociada": "Señal Distintiva Asociada"
    })
    return especiales


def asociar_especiales(
    radioaficionados: pd.DataFrame,
    especiales: pd.DataFrame
) -> pd.DataFrame:
    df = radioaficionados.copy()
    if "Señal Distintiva Especial" not in df.columns:
        df["Señal Distintiva Especial"] = ""

    mapa_especiales = construir_mapa_especial(especiales)
    logger.info("Se encontraron %d señales con especiales asociadas.", len(mapa_especiales))

    clave_col = "_sd_key"
    df[clave_col] = (
        df["Señal Distintiva"]
        .astype(str)
        .str.upper()
        .str.strip()
    )
    df["Señal Distintiva Especial"] = df[clave_col].map(mapa_especiales).fillna("")
    df.drop(columns=[clave_col], inplace=True)
    return df


def construir_mapa_especial(especiales: pd.DataFrame) -> dict:
    columnas_requeridas = {"Señal distintiva", "Señal Distintiva Especial"}
    faltantes = columnas_requeridas - set(especiales.columns)
    if faltantes:
        raise ValueError(f"Faltan columnas requeridas en el archivo de especiales: {faltantes}")

    validas = especiales[["Señal distintiva", "Señal Distintiva Especial"]].dropna()
    validas = validas.assign(
        _sd=validas["Señal distintiva"].astype(str).str.upper().str.strip(),
        _especial=validas["Señal Distintiva Especial"].astype(str).str.strip()
    )
    agrupado = validas.groupby("_sd")["_especial"].apply(_unificar_especiales)
    return agrupado.to_dict()


def _unificar_especiales(series: pd.Series) -> str:
    vistos = []
    for value in series:
        if value and value not in vistos:
            vistos.append(value)
    return ",".join(vistos)


def guardar_datasets(df: pd.DataFrame, json_path: Path, gzip_path: Path) -> Tuple[Path, Path]:
    records = df.fillna("").to_dict(orient="records")
    json_path = normalizar_json_path(json_path)
    gzip_path = Path(gzip_path) if gzip_path else Path(str(json_path) + ".gz")
    json_path.parent.mkdir(parents=True, exist_ok=True)
    gzip_path.parent.mkdir(parents=True, exist_ok=True)

    logger.info("Generando JSON en %s ...", json_path)
    json_text = json.dumps(records, ensure_ascii=False, indent=4)
    json_path.write_text(json_text, encoding="utf-8")

    logger.info("Generando JSON comprimido en %s ...", gzip_path)
    with gzip.open(gzip_path, "wt", encoding="utf-8") as gz_file:
        json.dump(records, gz_file, separators=(",", ":"), ensure_ascii=False, allow_nan=False)

    return json_path, gzip_path


def normalizar_json_path(path: Path) -> Path:
    path = Path(path)
    if not path.suffix:
        path = path.with_suffix(".json")
    return path


def guardar_metadata(path: Path, source_excel: Optional[Path], record_count: int) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)
    metadata = {
        "last_updated": timestamp.isoformat().replace("+00:00", "Z"),
        "last_updated_human": timestamp.strftime("%d/%m/%Y %H:%M UTC"),
        "record_count": record_count,
    }
    if source_excel:
        metadata["source_excel"] = str(source_excel)
    path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Metadata de actualización guardada en %s", path)
    return path


def generar_estadisticas(df: pd.DataFrame, destino: Path) -> Path:
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    stats = {
        "total": int(len(df)),
        "por_categoria": df["Categoría"].fillna("Sin categoría").value_counts().astype(int).to_dict(),
        "por_provincia": df["Provincia"].fillna("Sin provincia").value_counts().astype(int).to_dict(),
        "generado": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    }
    destino.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Estadísticas guardadas en %s", destino)
    return destino


def main():
    args = parse_args()
    listado, source_excel = preparar_listado_radioaficionados(args)
    especiales = cargar_especiales(Path(args.especiales))
    enriquecido = asociar_especiales(listado, especiales)
    json_path = Path(args.output)
    gzip_path = Path(args.gzip_output) if args.gzip_output else Path(str(normalizar_json_path(json_path)) + ".gz")

    final_json, final_gzip = guardar_datasets(enriquecido, json_path, gzip_path)
    logger.info("Dataset generado correctamente: %s y %s", final_json, final_gzip)
    metadata_path = Path(args.metadata)
    stats_path = Path(args.stats_output)
    generar_estadisticas(enriquecido, stats_path)
    guardar_metadata(metadata_path, source_excel, len(enriquecido))


if __name__ == "__main__":
    main()
