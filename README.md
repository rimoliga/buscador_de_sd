# Buscador de Señales Distintivas de Radioaficionados Argentinos

Este proyecto te permite buscar fácilmente señales distintivas de radioaficionados en Argentina, integrando datos oficiales y manuales en una interfaz web sencilla y ágil.

## Características principales

- **Búsqueda instantánea** por señal distintiva, incluyendo señales especiales y datos de instituciones.
- **Instalable como aplicación (PWA)**: podés agregarla a tu dispositivo móvil o escritorio para usarla sin conexión.
- **Gestión y actualización automática de datos**: los datos se obtienen directamente desde la web oficial de ENACOM mediante técnicas de scraping, asegurando información actualizada y completa.
- **Visualización clara**: muestra detalles como titular, categoría, provincia y localidad, además de señales especiales asociadas.
- **Marcado de resultados**: podés fijar y comparar señales distintivas de interés.

## Cómo funciona la gestión de datos

Antes, ENACOM permitía descargar un archivo Excel con el listado de radioaficionados. Ahora, el acceso a los datos requiere extraerlos directamente desde la página web oficial. Este proyecto automatiza ese proceso:

1. **Scraping de ENACOM**: El script `scrap_enacom.py` recopila y normaliza los datos de radioaficionados y señales especiales desde el sitio web oficial.
2. **Procesamiento y unificación**: El script `procesar_archivo_enacom.py` integra los datos, asociando señales especiales y permitiendo agregar registros manuales.
3. **Formato optimizado**: Los datos se almacenan en formato JSON comprimido, lo que facilita búsquedas rápidas y un uso eficiente en la web.
4. **Actualización sencilla**: Ejecutá los scripts para obtener la última versión de los datos y mantener la aplicación actualizada.

## Créditos y fuentes

- Datos oficiales extraídos de [ENACOM](https://www.enacom.gob.ar/listado-de-radioaficionados_p316).
- Código y desarrollo por Gabriel Rímoli (LU2EUE).
- El proyecto incluye ingresos manuales y mejoras en la visualización para facilitar la consulta y el análisis.

## Por hacer:

- Automatizar la actualización de datos desde ENACOM de forma programada.
- Agregar filtros avanzados por provincia, categoría y tipo de institución.

---

> Última actualización: Septiembre 2025.