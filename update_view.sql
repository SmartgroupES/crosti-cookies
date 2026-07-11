DROP VIEW IF EXISTS v_food_cost_teorico;
CREATE VIEW v_food_cost_teorico AS
SELECT
    e.id_producto,
    p.nombre AS producto,
    p.categoria,
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
