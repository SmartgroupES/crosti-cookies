-- 1. Crear tabla de proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id_proveedor    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    nombre          TEXT NOT NULL,
    contacto        TEXT,
    telefono        TEXT,
    email           TEXT,
    condiciones     TEXT,
    activo          INTEGER DEFAULT 1,
    creado_en       TEXT DEFAULT (datetime('now'))
);

-- Insertar proveedores base a partir de los ingredientes actuales
INSERT INTO proveedores (nombre) VALUES
    ('Harimsa'), ('Président'), ('Azucarera'), ('Granja local'), ('Nielsen-Massey'),
    ('Mediterránea'), ('Arm & Hammer'), ('Valrhona'), ('Callebaut'), ('Importador'),
    ('Piedmont'), ('Bronte'), ('Obrador BCN'), ('Specialty Coffee'), ('Magepack'),
    ('Maldon'), ('Lyo');

-- 2. Crear tabla de inventario_actual
CREATE TABLE IF NOT EXISTS inventario_actual (
    id_tienda       TEXT NOT NULL,
    id_item         TEXT NOT NULL,
    tipo_item       TEXT NOT NULL, -- 'INGREDIENTE' o 'PRODUCTO'
    estado          TEXT NOT NULL, -- 'SECO', 'REFRIGERADO', 'CONGELADO', 'TRANSITO', 'VITRINA'
    cantidad        REAL NOT NULL DEFAULT 0,
    unidad          TEXT NOT NULL,
    ultima_actualizacion TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (id_tienda, id_item, estado)
);

-- 3. Crear tabla de movimientos_inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id_movimiento   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    fecha           TEXT NOT NULL,
    hora            TEXT NOT NULL,
    id_tienda       TEXT NOT NULL,
    id_item         TEXT NOT NULL,
    tipo_item       TEXT NOT NULL,
    cantidad        REAL NOT NULL,
    tipo_movimiento TEXT NOT NULL, -- 'ENTRADA_COMPRA', 'TRANSFERENCIA', 'SALIDA_VENTA', 'SALIDA_MERMA', 'AJUSTE'
    origen          TEXT,
    destino         TEXT,
    id_referencia   TEXT, -- ID factura, venta o merma
    operario_id     TEXT,
    creado_en       TEXT DEFAULT (datetime('now'))
);

-- Indices para movimientos
CREATE INDEX IF NOT EXISTS idx_movimientos_tienda_fecha ON movimientos_inventario(id_tienda, fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_item ON movimientos_inventario(id_item);

-- 4. Adaptar facturas_proveedores
-- Ya que SQLite no permite ALTER TABLE ADD FOREIGN KEY fácilmente, lo haremos a nivel de aplicación (usaremos id_proveedor en lugar de texto en el futuro, pero por retrocompatibilidad podemos mantener el campo proveedor y añadir id_proveedor)
ALTER TABLE facturas_proveedores ADD COLUMN id_proveedor TEXT;

-- 5. Llenar inventario inicial a partir de facturas existentes (simulación)
-- (Opcional) Podemos empezar a 0 y que hagan un recuento de apertura.
