-- migrate_fase7_advanced_prediction.sql

-- 1. Actualizar la dirección de la tienda MAD-01
UPDATE tiendas 
SET direccion = 'C. de Ferrer del Río, 24, Salamanca, 28028 Madrid' 
WHERE id_tienda = 'MAD-01';

-- 2. Crear tabla de Calendario y Eventos para factores externos
CREATE TABLE IF NOT EXISTS calendario_eventos (
    id_evento INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE NOT NULL,
    ciudad TEXT NOT NULL,
    tipo TEXT NOT NULL, -- Ej: 'FESTIVO', 'LLUVIA', 'TEMPORADA_ALTA'
    descripcion TEXT,
    multiplicador_demanda REAL NOT NULL DEFAULT 1.0,
    UNIQUE(fecha, ciudad, tipo)
);
