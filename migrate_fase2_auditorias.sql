-- Migración Fase 2: Auditorías QSC

-- 1. Crear tabla de auditorías (cabecera)
CREATE TABLE IF NOT EXISTS auditorias (
    id_auditoria        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_tienda           TEXT NOT NULL,
    fecha               TEXT NOT NULL,
    auditor_id          TEXT NOT NULL,
    puntuacion_obtenida REAL NOT NULL DEFAULT 0,
    puntuacion_maxima   REAL NOT NULL DEFAULT 0,
    pct_cumplimiento    REAL NOT NULL DEFAULT 0,
    observaciones       TEXT,
    creado_en           TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auditorias_tienda ON auditorias(id_tienda, fecha);

-- 2. Crear tabla de respuestas de auditoría (detalle)
CREATE TABLE IF NOT EXISTS auditoria_respuestas (
    id_respuesta    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_auditoria    TEXT NOT NULL,
    categoria       TEXT NOT NULL,
    pregunta        TEXT NOT NULL,
    calificacion    REAL NOT NULL, -- 0 (Fallo), 1 (Cumple), -1 (N/A)
    notas_adicionales TEXT,
    creado_en       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auditoria_respuestas_auditoria ON auditoria_respuestas(id_auditoria);
