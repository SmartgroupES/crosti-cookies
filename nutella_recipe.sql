-- Insert new ingredients
INSERT INTO ingredientes (id_ingrediente, nombre, categoria, proveedor_ref, unidad, coste_por_unidad, stock_seguridad_min) VALUES 
('ING-026', 'Crema de avellanas (Nutella)', 'Crema', 'Ferrero', 'g', 0.012, 1000),
('ING-027', 'Almidón de maíz (Maicena)', 'Aditivo', 'Proveedor Local', 'g', 0.003, 500),
('ING-028', 'Levadura en polvo', 'Aditivo', 'Proveedor Local', 'g', 0.015, 200),
('ING-029', 'Avellanas tostadas', 'Frutos Secos', 'Proveedor Local', 'g', 0.025, 500);

-- Insert new product
INSERT INTO productos (id_producto, nombre, categoria, pvp_directo, pvp_ubereats, food_cost_obj_min, food_cost_obj_max, peso_unidad_g, descripcion) VALUES
('CC-DLX-004', 'Galleta Gigante con Nutella', 'Deluxe', 5.50, 6.50, 22.0, 28.0, 390.0, 'Galleta gigante rellena de 80g de Nutella y decorada con avellanas.');

-- Insert recipe (escandallo) per cookie (divided recipe by 4)
INSERT INTO escandallos (id_producto, id_ingrediente, cantidad, unidad, fase) VALUES
('CC-DLX-004', 'ING-026', 80.0, 'g', 'Relleno'),
('CC-DLX-004', 'ING-002', 50.0, 'g', 'Masa'),
('CC-DLX-004', 'ING-003', 37.5, 'g', 'Masa'),
('CC-DLX-004', 'ING-004', 25.0, 'g', 'Masa'),
('CC-DLX-004', 'ING-005', 0.5, 'ud', 'Masa'),
('CC-DLX-004', 'ING-001', 105.0, 'g', 'Masa'),
('CC-DLX-004', 'ING-027', 2.5, 'g', 'Masa'),
('CC-DLX-004', 'ING-028', 1.5, 'g', 'Masa'),
('CC-DLX-004', 'ING-008', 1.0, 'g', 'Masa'),
('CC-DLX-004', 'ING-007', 0.25, 'g', 'Masa'),
('CC-DLX-004', 'ING-009', 62.5, 'g', 'Masa'),
('CC-DLX-004', 'ING-029', 5.0, 'g', 'Acabado');
