-- Migración Fase 4: Operaciones y Soporte

CREATE TABLE IF NOT EXISTS tickets_soporte (
    id_ticket     TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_tienda     TEXT NOT NULL,
    asunto        TEXT NOT NULL,
    categoria     TEXT NOT NULL, -- Mantenimiento, TPV, Operaciones, Otro
    estado        TEXT DEFAULT 'Abierto', -- Abierto, En progreso, Resuelto
    creado_en     TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(id_tienda) REFERENCES tiendas(id_tienda)
);

CREATE TABLE IF NOT EXISTS opex_franquiciado (
    id_opex       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_tienda     TEXT NOT NULL,
    mes           TEXT NOT NULL, -- YYYY-MM
    alquiler      REAL DEFAULT 0,
    suministros   REAL DEFAULT 0,
    seguros       REAL DEFAULT 0,
    personal      REAL DEFAULT 0,
    otros_gastos  REAL DEFAULT 0,
    creado_en     TEXT DEFAULT (datetime('now')),
    UNIQUE(id_tienda, mes),
    FOREIGN KEY(id_tienda) REFERENCES tiendas(id_tienda)
);

CREATE INDEX IF NOT EXISTS idx_tickets_tienda ON tickets_soporte(id_tienda);
