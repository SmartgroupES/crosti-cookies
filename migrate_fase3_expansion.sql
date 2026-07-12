-- Migración Fase 3: Módulo de Expansión (Solicitudes de Inversión)

CREATE TABLE IF NOT EXISTS solicitudes_franquicia (
    id_solicitud        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    nombre_completo     TEXT NOT NULL,
    email               TEXT NOT NULL,
    telefono            TEXT NOT NULL,
    ciudad_interes      TEXT NOT NULL,
    capital_disponible  TEXT NOT NULL,
    estado              TEXT DEFAULT 'Nueva', -- Nueva, En revisión, Aprobada, Rechazada
    creado_en           TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_franquicia(estado);
