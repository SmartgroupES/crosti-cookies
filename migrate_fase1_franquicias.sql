-- Migración Fase 1: Franquicias

-- 1. Añadir campos financieros a tiendas
ALTER TABLE tiendas ADD COLUMN pct_royalty REAL DEFAULT 5.0;
ALTER TABLE tiendas ADD COLUMN pct_canon_publicidad REAL DEFAULT 2.0;

-- 2. Crear tabla de liquidaciones mensuales
CREATE TABLE IF NOT EXISTS liquidaciones_mensuales (
    id_liquidacion  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_tienda       TEXT NOT NULL,
    mes             TEXT NOT NULL, -- Formato YYYY-MM
    ventas_netas    REAL NOT NULL DEFAULT 0,
    royalty_pct     REAL NOT NULL DEFAULT 5.0,
    royalty_eu      REAL NOT NULL DEFAULT 0,
    canon_pct       REAL NOT NULL DEFAULT 2.0,
    canon_eu        REAL NOT NULL DEFAULT 0,
    estado          TEXT DEFAULT 'Pendiente', -- 'Pendiente', 'Pagado'
    creado_en       TEXT DEFAULT (datetime('now')),
    UNIQUE(id_tienda, mes)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_liquidaciones_tienda_mes ON liquidaciones_mensuales(id_tienda, mes);

-- 3. Crear vista de compliance de compras
DROP VIEW IF EXISTS v_compliance_compras;
CREATE VIEW v_compliance_compras AS
SELECT 
    t.id_tienda,
    t.mes,
    t.id_ingrediente,
    i.nombre AS ingrediente,
    i.unidad,
    ROUND(t.consumo_teorico, 2) AS consumo_teorico,
    ROUND(IFNULL(c.compras_reales, 0), 2) AS compras_reales,
    ROUND(IFNULL(c.compras_reales, 0) - t.consumo_teorico, 2) AS desviacion
FROM (
    -- Consumo teórico basado en ventas
    SELECT 
        v.id_tienda, 
        strftime('%Y-%m', v.fecha) AS mes, 
        e.id_ingrediente, 
        SUM(v.cantidad * e.cantidad) AS consumo_teorico 
    FROM ventas_detalladas v 
    JOIN escandallos e ON v.id_producto = e.id_producto 
    WHERE e.activo = 1 
    GROUP BY v.id_tienda, strftime('%Y-%m', v.fecha), e.id_ingrediente
) t
JOIN ingredientes i ON t.id_ingrediente = i.id_ingrediente
LEFT JOIN (
    -- Compras registradas
    -- Nota: asume que la factura usa la misma unidad base que el escandallo para productos críticos (ej. Masa IQF en 'ud')
    SELECT 
        f.id_tienda, 
        strftime('%Y-%m', f.fecha_factura) AS mes, 
        f.id_ingrediente, 
        SUM(f.cantidad) AS compras_reales 
    FROM facturas_proveedores f 
    GROUP BY f.id_tienda, strftime('%Y-%m', f.fecha_factura), f.id_ingrediente
) c ON t.id_tienda = c.id_tienda AND t.mes = c.mes AND t.id_ingrediente = c.id_ingrediente
WHERE i.proveedor_ref = 'Obrador BCN';
