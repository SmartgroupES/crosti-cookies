CREATE TABLE IF NOT EXISTS campanas_marketing (
    id_campana    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    nombre        TEXT NOT NULL,
    descripcion   TEXT,
    fecha_inicio  TEXT NOT NULL,
    fecha_fin     TEXT NOT NULL,
    tipo          TEXT NOT NULL, -- 'REDES_SOCIALES', 'LOCAL', 'INFLUENCER', 'OOH'
    presupuesto   REAL NOT NULL DEFAULT 0,
    estado        TEXT DEFAULT 'ACTIVA', -- 'ACTIVA', 'PAUSADA', 'FINALIZADA'
    creado_en     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roi_marketing_tienda (
    id_registro        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_campana         TEXT NOT NULL,
    id_tienda          TEXT NOT NULL,
    inversion_real     REAL NOT NULL DEFAULT 0,
    tickets_promocion  INTEGER NOT NULL DEFAULT 0,
    ventas_atribuidas  REAL NOT NULL DEFAULT 0,
    creado_en          TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (id_campana) REFERENCES campanas_marketing(id_campana),
    FOREIGN KEY (id_tienda) REFERENCES tiendas(id_tienda)
);
