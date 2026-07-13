export const APP_VERSION = '2026.06.12.16';
export const DATA_VERSION = '2026.07.13';
export const VERSION_URL = 'data/version.json';
export const DATA_URL = 'data/listado_radioaficionados_unificado.json.gz';
export const METADATA_URL = 'data/dataset_metadata.json';
export const STATS_URL = 'data/listado_radioaficionados_stats.json';
export const PINNED_STORAGE_KEY = 'buscador_sd_pinned';
export const LAST_QUERY_KEY = 'buscador_sd_last_query';
export const VERSION_STORAGE_KEY = 'buscador_sd_versions';
export const LOGBOOK_KEY = 'buscador_sd_logbook';
export const BANDS = ['160m','80m','60m','40m','30m','20m','17m','15m','12m','10m','6m','2m','70cm'];
export const MODES = ['SSB','FM','CW','FT8','FT4','AM','RTTY','PSK31','DSTAR','DMR','C4FM'];
export const BAND_RANGES = [
    { band: '160m', low: 1.8,    high: 2.0    },
    { band: '80m',  low: 3.5,    high: 4.0    },
    { band: '60m',  low: 5.3,    high: 5.4    },
    { band: '40m',  low: 7.0,    high: 7.3    },
    { band: '30m',  low: 10.1,   high: 10.15  },
    { band: '20m',  low: 14.0,   high: 14.35  },
    { band: '17m',  low: 18.068, high: 18.168 },
    { band: '15m',  low: 21.0,   high: 21.45  },
    { band: '12m',  low: 24.89,  high: 24.99  },
    { band: '10m',  low: 28.0,   high: 29.7   },
    { band: '6m',   low: 50.0,   high: 54.0   },
    { band: '2m',   low: 144.0,  high: 148.0  },
    { band: '70cm', low: 420.0,  high: 450.0  },
];
