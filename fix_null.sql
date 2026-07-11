PRAGMA defer_foreign_keys=ON;

-- 1. Create new table without NOT NULL on pvp_directo
CREATE TABLE productos_new (
    id_producto     TEXT PRIMARY KEY,
    nombre          TEXT NOT NULL,
    categoria       TEXT NOT NULL,
    descripcion     TEXT,
    peso_unidad_g   REAL,
    pvp_directo     REAL,
    pvp_ubereats    REAL,
    food_cost_obj_min REAL,
    food_cost_obj_max REAL,
    activo          INTEGER DEFAULT 1,
    orden_display   INTEGER DEFAULT 0,
    creado_en       TEXT DEFAULT (datetime('now'))
);

-- 2. Copy data
INSERT INTO productos_new SELECT * FROM productos;

-- 3. Replace old table
DROP VIEW IF EXISTS v_food_cost_teorico;
DROP TABLE productos;
ALTER TABLE productos_new RENAME TO productos;

-- 4. Update 0 to NULL
UPDATE productos SET pvp_directo = NULL WHERE pvp_directo = 0;

-- 5. Recreate View
CREATE VIEW v_food_cost_teorico AS
SELECT
    e.id_producto,
    p.nombre AS producto,
    p.pvp_directo AS pvp_unitario,
    p.pvp_directo,
    p.pvp_ubereats,
    p.food_cost_obj_min,
    p.food_cost_obj_max,
    ROUND(SUM(
        e.cantidad *
        CASE e.unidad
            WHEN 'g' THEN (i.coste_por_unidad / 1000.0)
            WHEN 'ml' THEN (i.coste_por_unidad / 1000.0)
            ELSE i.coste_por_unidad
        END
    ), 4) AS coste_produccion_eu,
    ROUND(SUM(
        e.cantidad *
        CASE e.unidad
            WHEN 'g' THEN (i.coste_por_unidad / 1000.0)
            WHEN 'ml' THEN (i.coste_por_unidad / 1000.0)
            ELSE i.coste_por_unidad
        END
    ) / p.pvp_directo * 100.0, 2) AS food_cost_pct
FROM escandallos e
JOIN productos p ON e.id_producto = p.id_producto
JOIN ingredientes i ON e.id_ingrediente = i.id_ingrediente
WHERE e.activo = 1 AND p.activo = 1
GROUP BY e.id_producto;
