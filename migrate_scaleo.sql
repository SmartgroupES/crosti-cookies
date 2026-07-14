-- migración a Multi-Tenant (Scaleo)

CREATE TABLE IF NOT EXISTS empresas (
    id_empresa TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tema_color_principal TEXT,
    tema_color_secundario TEXT,
    creado_en TEXT DEFAULT (datetime('now'))
);

INSERT INTO empresas (id_empresa, nombre, tema_color_principal, tema_color_secundario) VALUES 
('CROSTI', 'Crosti Cookies', '#781d2d', '#F0E8DC'),
('SCALEO', 'Scaleo (Demo)', '#0A1C2A', '#A68B6A');

-- Añadir id_empresa a las tablas principales
ALTER TABLE usuarios ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE tiendas ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE productos ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE ingredientes ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE proveedores ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE escandallos ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE ventas_detalladas ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE control_mermas ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE inventarios_diarios ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE gestion_personal ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE crm_clientes ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE facturas_proveedores ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE movimientos_inventario ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE campanas_marketing ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE roi_marketing_tienda ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE liquidaciones_mensuales ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';
ALTER TABLE soporte_tickets ADD COLUMN id_empresa TEXT DEFAULT 'CROSTI';

-- Insertar un administrador de Scaleo para pruebas
INSERT INTO usuarios (id, email, nombre, password_hash, salt, rol, id_empresa) VALUES
('admin_scaleo_001', 'admin@scaleo.com', 'Admin Scaleo', 'CHANGE_ME_HASH', 'CHANGE_ME_SALT', 'ADMIN', 'SCALEO');

-- Opcional: Para que no esté vacío, clonar algunos ingredientes a SCALEO
INSERT INTO ingredientes (id_ingrediente, nombre, categoria, proveedor_ref, unidad, coste_por_unidad, stock_seguridad_min, id_empresa)
SELECT id_ingrediente || '_S', nombre, categoria, proveedor_ref, unidad, coste_por_unidad, stock_seguridad_min, 'SCALEO'
FROM ingredientes WHERE id_empresa = 'CROSTI' LIMIT 10;
