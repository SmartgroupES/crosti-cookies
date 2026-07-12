-- migrate_fase8_instagram.sql

-- MÓDULO 8: ASESOR DE MARKETING IA E INSTAGRAM
CREATE TABLE IF NOT EXISTS instagram_kpis (
    id_registro INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE NOT NULL,
    seguidores INTEGER NOT NULL DEFAULT 0,
    publicaciones_totales INTEGER NOT NULL DEFAULT 0,
    likes_promedio REAL NOT NULL DEFAULT 0,
    comentarios_promedio REAL NOT NULL DEFAULT 0,
    alcance_estimado REAL NOT NULL DEFAULT 0,
    notas_ia TEXT,
    creado_en TEXT DEFAULT (datetime('now')),
    UNIQUE(fecha)
);
