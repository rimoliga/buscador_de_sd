# Buscador de Señales Distintivas de Radioaficionados Argentinos

Buscá señales distintivas de radioaficionados argentinos en una PWA rápida, instalable y con datos actualizados automáticamente desde ENACOM.

## Características

- **Búsqueda exacta por señal distintiva**, incluyendo señales especiales e institucionales.
- **URL compartible**: `?q=LU2EUE` abre la app con la búsqueda ya hecha; la URL se actualiza mientras escribís.
- **Link a QRZ.com**: cada resultado tiene acceso directo al perfil en QRZ con un clic.
- **PWA instalable**: funciona sin conexión, con notificación automática cuando hay datos nuevos.
- **Aviso offline**: indica cuando se están mostrando datos guardados por falta de conexión.
- **Pinear señales**: fijá señales para comparar o consultar rápidamente; en desktop aparecen en la barra lateral, en mobile debajo del buscador.
- **Logbook**: timer por señal (soporta rondas con múltiples contactos simultáneos), RST enviado/recibido, selector de banda, reloj UTC en vivo, exportación en formato ADIF 3.1.0. Mini-log en la barra lateral desktop.
- **Auto-log**: checkbox para controlar si al fijar una señal arranca automáticamente el timer de contacto.
- **Compartir señal**: botón en cada resultado que usa Web Share API en mobile o copia la URL al portapapeles en desktop.
- **Repetidoras**: 275 estaciones repetidoras autorizadas por ENACOM con filtros por banda (VHF/UHF/HF) y provincia, mapa interactivo (Leaflet + OpenStreetMap), y botón "Cercanas" que ordena por distancia usando geolocalización del navegador.
- **Sección de ayuda**: guía de uso integrada en la app, accesible desde la navegación.
- **Pipeline automatizado**: los datos se descargan, procesan y publican cada lunes sin intervención manual.

## Arquitectura técnica

- Frontend en ES Modules nativos, sin bundler. Service Worker con estrategia stale-while-revalidate.
- Layout responsive: dos columnas en desktop (`lg:flex` con sidebar fija), bottom nav fija en mobile/tablet con las mismas secciones.
- Mapa de repetidoras con Leaflet 1.9.4 (bundleado local, no CDN). Tiles de OpenStreetMap cacheados en runtime por el SW en un cache separado (`map-tiles`), disponibles offline tras la primera visita.
- Pipeline Python: scraping de ENACOM → procesamiento con pandas → JSON comprimido → commit automático vía GitHub Actions.
- Versiones sincronizadas entre `data/version.json`, `modules/config.js` y `service-worker.js` mediante `data/bump_version.py`.
- 29 tests unitarios sobre las funciones de transformación del pipeline; CI corre en cada push.

## Gestión de datos

ENACOM ya no ofrece descarga directa del listado. El pipeline automatiza la extracción:

1. `scrap_enacom.py` — obtiene y normaliza los datos desde el sitio oficial.
2. `procesar_archivo_enacom.py` — asocia señales especiales y genera JSON comprimido.
3. `scrap_repetidoras.py` — descarga el KML de repetidoras desde Google Maps (fuente ENACOM) y genera `data/repetidoras.json`.
4. GitHub Actions corre el pipeline cada lunes y commitea solo si los datos cambiaron.

Para actualizar manualmente:

```bash
# Radioaficionados
python -m data.procesar_archivo_enacom --scrape

# Repetidoras
python -m data.scrap_repetidoras
```

Para bumpar versiones:

```bash
# Solo app
python -m data.bump_version 2026.01.01

# Solo dataset
python -m data.bump_version --dataset-version 2026.01.20

# Ambas
python -m data.bump_version 2026.01.01 --dataset-version 2026.01.20
```

## Tests

```bash
pip install -r requirements.txt
python -m pytest tests/ -v
```

## Por hacer

### Técnico
- [ ] Generar `STATIC_ASSETS` en `service-worker.js` automáticamente al buildear, para no mantenerlo a mano.
- [ ] Historial de últimas búsquedas (acceso rápido sin reescribir).
- [ ] Integrar `scrap_repetidoras.py` al workflow de GitHub Actions para mantener el dataset actualizado.

### Ideas de funcionalidades
- [ ] Búsqueda por nombre/apellido del titular.
- [ ] Filtros por provincia y categoría en el buscador principal.

## Créditos

- Radioaficionados: [ENACOM](https://www.enacom.gob.ar/listado-de-radioaficionados_p316)
- Repetidoras: [ENACOM](https://www.enacom.gob.ar/estaciones-repetidoras-autorizadas_p319)
- Código: Gabriel Rímoli [LU2EUE](https://github.com/rimoliga)
