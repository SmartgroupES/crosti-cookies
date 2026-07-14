-- 1. Clonar Proveedores
INSERT INTO proveedores (id_proveedor, nombre, contacto, telefono, email, condiciones, activo, id_empresa)
SELECT id_proveedor || '_S', nombre, contacto, telefono, email, condiciones, activo, 'SCALEO'
FROM proveedores WHERE id_empresa = 'CROSTI';

-- 2. Clonar Productos
INSERT INTO productos (id_producto, nombre, categoria, descripcion, peso_unidad_g, pvp_directo, pvp_ubereats, food_cost_obj_min, food_cost_obj_max, activo, orden_display, id_empresa)
SELECT id_producto || '_S', nombre, categoria, descripcion, peso_unidad_g, pvp_directo, pvp_ubereats, food_cost_obj_min, food_cost_obj_max, activo, orden_display, 'SCALEO'
FROM productos WHERE id_empresa = 'CROSTI';

-- 3. Clonar Ingredientes (los 10 que inserté antes los borro primero por si acaso)
DELETE FROM ingredientes WHERE id_empresa = 'SCALEO';

INSERT INTO ingredientes (id_ingrediente, nombre, categoria, proveedor_ref, unidad, coste_por_unidad, stock_seguridad_min, activo, id_empresa)
SELECT id_ingrediente || '_S', nombre, categoria, proveedor_ref, unidad, coste_por_unidad, stock_seguridad_min, activo, 'SCALEO'
FROM ingredientes WHERE id_empresa = 'CROSTI';

-- 4. Clonar Escandallos (Recetas)
INSERT INTO escandallos (id_producto, id_ingrediente, cantidad, unidad, fase, activo, id_empresa)
SELECT id_producto || '_S', id_ingrediente || '_S', cantidad, unidad, fase, activo, 'SCALEO'
FROM escandallos WHERE id_empresa = 'CROSTI';
