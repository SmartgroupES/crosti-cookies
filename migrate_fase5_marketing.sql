-- Migración Fase 5: Marketing y Promoción

CREATE TABLE IF NOT EXISTS campanas_marketing (
    id_campana    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    nombre        TEXT NOT NULL,
    descripcion   TEXT,
    fecha_inicio  TEXT NOT NULL,
    fecha_fin     TEXT NOT NULL,
    presupuesto   REAL DEFAULT 0,
    tipo          TEXT NOT NULL, -- Nacional, Local, Digital
    estado        TEXT DEFAULT 'Activa', -- Activa, Finalizada, Pausada
    creado_en     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roi_marketing_tienda (
    id_roi             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_campana         TEXT NOT NULL,
    id_tienda          TEXT NOT NULL,
    inversion_real     REAL DEFAULT 0,
    tickets_promocion  INTEGER DEFAULT 0, -- Cupones canjeados o leads
    ventas_atribuidas  REAL DEFAULT 0,
    creado_en          TEXT DEFAULT (datetime('now')),
    UNIQUE(id_campana, id_tienda),
    FOREIGN KEY(id_campana) REFERENCES campanas_marketing(id_campana),
    FOREIGN KEY(id_tienda) REFERENCES tiendas(id_tienda)
);

CREATE INDEX IF NOT EXISTS idx_roi_campana ON roi_marketing_tienda(id_campana);
CREATE INDEX IF NOT EXISTS idx_roi_tienda ON roi_marketing_tienda(id_tienda);
