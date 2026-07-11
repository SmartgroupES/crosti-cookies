-- 1. Modificación de esquema
ALTER TABLE productos RENAME COLUMN pvp_unitario TO pvp_directo;
ALTER TABLE productos ADD COLUMN pvp_ubereats REAL;

-- 2. Recrear Vista (Depende de pvp_directo)
DROP VIEW IF EXISTS v_food_cost_teorico;
CREATE VIEW v_food_cost_teorico AS
SELECT
    e.id_producto,
    p.nombre AS producto,
    p.pvp_directo AS pvp_unitario, -- Mantengo el alias 'pvp_unitario' en la vista para no romper la interfaz GET (luego lo cambiamos o lo ajustamos)
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

-- 3. Mapeo de datos (Los 6 coincidentes)
UPDATE productos SET pvp_ubereats = pvp_directo, pvp_directo = 12.00 WHERE id_producto = 'CC-PAK-001';
UPDATE productos SET pvp_ubereats = pvp_directo, pvp_directo = 28.00 WHERE id_producto = 'CC-PAK-002';
UPDATE productos SET pvp_ubereats = pvp_directo, pvp_directo = 3.50 WHERE id_producto = 'CC-CLA-001';
UPDATE productos SET pvp_ubereats = pvp_directo, pvp_directo = 5.50 WHERE id_producto = 'CC-DLX-002';
UPDATE productos SET pvp_ubereats = pvp_directo, pvp_directo = 3.80 WHERE id_producto = 'CC-SOD-001';
UPDATE productos SET pvp_ubereats = pvp_directo, pvp_directo = 3.80 WHERE id_producto = 'CC-SOD-002';

-- 4. Mapeo de datos (Los 17 nuevos)
UPDATE productos SET pvp_ubereats = pvp_directo, pvp_directo = 0.00 
WHERE id_producto IN (
  'CC-ESP-001', 'CC-CLA-005', 'CC-CLA-006', 'CC-CLA-007', 
  'CC-REL-001', 'CC-REL-002', 'CC-REL-003', 'CC-REL-004', 'CC-REL-005', 'CC-REL-006', 
  'CC-DLX-004', 
  'CC-BEB-001', 'CC-BEB-002', 'CC-BEB-003', 'CC-BEB-004', 
  'CC-SOD-003', 'CC-SOD-004'
);
