-- ============================================================
-- CROSTI COOKIES — ESQUEMA D1 CLOUDFLARE (D1-compatible)
-- Sistema PWA Franquicias | Plan Expansión 2027-2031
-- BCN-01 (Piloto) | MAD-01 (Madrid) | VAL-01 (Valencia)
-- Nota: sin PRAGMA, sin GENERATED ALWAYS AS (no soportado en D1)
-- ============================================================

-- ── TABLA 1: TIENDAS ─────────────────────────────────────────
DROP TABLE IF EXISTS tiendas;
CREATE TABLE tiendas (
    id_tienda       TEXT PRIMARY KEY,
    nombre          TEXT NOT NULL,
    ciudad          TEXT NOT NULL,
    direccion       TEXT NOT NULL,
    cp              TEXT,
    latitud         REAL,
    longitud        REAL,
    perfil          TEXT NOT NULL,
    franquiciado    TEXT NOT NULL,
    email_franquiciado TEXT,
    telefono_franquiciado TEXT,
    nif_franquiciado TEXT,
    fecha_apertura  TEXT,
    activa          INTEGER DEFAULT 1,
    is_virtual      INTEGER DEFAULT 0,
    pct_royalty     REAL DEFAULT 5.0,
    pct_canon_publicidad REAL DEFAULT 2.0,
    creado_en       TEXT DEFAULT (datetime('now'))
);

INSERT INTO tiendas VALUES
    ('BCN-00','Obrador Central Crosti Cookies','Barcelona','[Dirección del Obrador]','08000',41.38,2.16,'Centro de Producción y Logística','Central Crosti','obrador@crosticookies.com','+34600000000',NULL,'2024-01-01',1,0,0.0,0.0,datetime('now')),
    ('BCN-01','Crosti Cookies Barcelona','Barcelona','Carrer de Provença, 123','08008',41.3888,2.1653,'Boutique Regalo','Piloto Barcelona','bcn@crosticookies.com','+34600000001','B12345678','2024-09-01',1,0,5.0,2.0,datetime('now')),
    ('MAD-01','Simulación Madrid','Madrid','Virtual','28000',40.4168,-3.7038,'Tienda Simulación','Dataset Manager','mad@crosticookies.com','+34000000000',NULL,'2024-01-01',1,1,5.0,2.0,datetime('now'));

-- ── TABLA 2: USUARIOS ────────────────────────────────────────
DROP TABLE IF EXISTS usuarios;
CREATE TABLE usuarios (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    email           TEXT UNIQUE NOT NULL,
    nombre          TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    salt            TEXT NOT NULL,
    rol             TEXT NOT NULL,
    id_tienda       TEXT,
    activo          INTEGER DEFAULT 1,
    ultimo_login    TEXT,
    creado_en       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_tienda ON usuarios(id_tienda);

INSERT INTO usuarios (id,email,nombre,password_hash,salt,rol,id_tienda) VALUES
    ('admin_cc_001','admin@crosticookies.com','Administrador Central','CHANGE_ME_HASH','CHANGE_ME_SALT','ADMIN',NULL);

-- ── TABLA 3: SESIONES JWT ────────────────────────────────────
DROP TABLE IF EXISTS sesiones_jwt;
CREATE TABLE sesiones_jwt (
    jti             TEXT PRIMARY KEY,
    id_usuario      TEXT NOT NULL,
    emitido_en      TEXT NOT NULL,
    expira_en       TEXT NOT NULL,
    ip_origen       TEXT,
    user_agent      TEXT,
    invalidado      INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones_jwt(id_usuario);
CREATE INDEX IF NOT EXISTS idx_sesiones_expira ON sesiones_jwt(expira_en);

-- ── TABLA 4: PRODUCTOS ───────────────────────────────────────
DROP TABLE IF EXISTS productos;
CREATE TABLE productos (
    id_producto     TEXT PRIMARY KEY,
    nombre          TEXT NOT NULL,
    categoria       TEXT NOT NULL,
    descripcion     TEXT,
    peso_unidad_g   REAL,
    pvp_directo     REAL NOT NULL,
    pvp_ubereats    REAL,
    food_cost_obj_min REAL,
    food_cost_obj_max REAL,
    activo          INTEGER DEFAULT 1,
    orden_display   INTEGER DEFAULT 0,
    creado_en       TEXT DEFAULT (datetime('now'))
);

INSERT INTO productos VALUES
    ('CC-CLA-001','Cookie Clásica Chocolate Chip','Clasica','NY Style ~150g chocolate chip semi-dulce',150,3.50,NULL,18.0,22.0,1,1,datetime('now')),
    ('CC-CLA-002','Cookie Clásica Doble Chocolate','Clasica','NY Style ~150g doble chocolate belga',150,3.50,NULL,18.0,22.0,1,2,datetime('now')),
    ('CC-CLA-003','Cookie Clásica Vainilla Pecana','Clasica','NY Style ~150g vainilla bourbon y pecanas',150,3.50,NULL,18.0,22.0,1,3,datetime('now')),
    ('CC-CLA-004','Cookie Clásica Mantequilla Avellana','Clasica','NY Style ~150g crema avellana tostada',150,3.50,NULL,18.0,22.0,1,4,datetime('now')),
    ('CC-DLX-001','Cookie Deluxe Trufa Negra','Deluxe','Edición premium trufa negra y Maldon',155,5.50,NULL,24.0,28.0,1,10,datetime('now')),
    ('CC-DLX-002','Cookie Deluxe Pistacchio','Deluxe','Crema pistacchio siciliano y frambuesa liofilizada',155,5.50,NULL,24.0,28.0,1,11,datetime('now')),
    ('CC-DLX-003','Cookie Deluxe Caramelo Flor de Sal','Deluxe','Caramelo artesanal y flor de sal Camargue',155,5.50,NULL,24.0,28.0,1,12,datetime('now')),
    ('CC-SOD-001','Soda Prebiótica Jengibre Limón','Soda Prebiotica','Fermentación natural 330ml',NULL,3.80,NULL,NULL,NULL,1,20,datetime('now')),
    ('CC-SOD-002','Soda Prebiótica Hibisco Menta','Soda Prebiotica','Fermentación natural 330ml',NULL,3.80,NULL,NULL,NULL,1,21,datetime('now')),
    ('CC-CAF-001','Espresso de Especialidad','Cafe Especialidad','Single origin, extracción 25s',NULL,2.50,NULL,NULL,NULL,1,30,datetime('now')),
    ('CC-CAF-002','Flat White','Cafe Especialidad','Doble ristretto, leche vaporizada',NULL,3.20,NULL,NULL,NULL,1,31,datetime('now')),
    ('CC-PAK-001','Pack 4 Cookies Clásicas','Pack Regalo','Caja regalo 4 unidades surtidas',600,12.00,NULL,18.0,22.0,1,40,datetime('now')),
    ('CC-PAK-002','Pack 6 Mix Deluxe','Pack Regalo','Caja regalo premium 6 unidades deluxe',930,28.00,NULL,24.0,28.0,1,41,datetime('now'));

-- ── TABLA 5: INGREDIENTES ────────────────────────────────────
DROP TABLE IF EXISTS ingredientes;
CREATE TABLE ingredientes (
    id_ingrediente  TEXT PRIMARY KEY,
    nombre          TEXT NOT NULL,
    categoria       TEXT NOT NULL,
    proveedor_ref   TEXT,
    unidad          TEXT NOT NULL,
    coste_por_unidad REAL NOT NULL,
    stock_seguridad_min REAL DEFAULT 0,
    activo          INTEGER DEFAULT 1,
    actualizado_en  TEXT DEFAULT (datetime('now'))
);

INSERT INTO ingredientes VALUES
    ('ING-001','Harina de trigo T55','Harina','Harimsa','kg',0.85,25.0,1,datetime('now')),
    ('ING-002','Mantequilla 82% MG','Grasa','Président','kg',7.20,10.0,1,datetime('now')),
    ('ING-003','Azúcar moreno integral','Azucar','Azucarera','kg',1.20,10.0,1,datetime('now')),
    ('ING-004','Azúcar blanquilla','Azucar','Azucarera','kg',0.90,10.0,1,datetime('now')),
    ('ING-005','Huevo fresco M','Lacteo','Granja local','ud',0.22,60.0,1,datetime('now')),
    ('ING-006','Extracto vainilla bourbon','Aditivo','Nielsen-Massey','ml',0.08,200.0,1,datetime('now')),
    ('ING-007','Sal marina fina','Aditivo','Mediterránea','kg',1.10,2.0,1,datetime('now')),
    ('ING-008','Bicarbonato sódico','Aditivo','Arm & Hammer','kg',2.50,1.0,1,datetime('now')),
    ('ING-009','Chip chocolate semi-dulce 54%','Chocolate','Valrhona','kg',14.50,5.0,1,datetime('now')),
    ('ING-010','Cacao en polvo 22-24%','Chocolate','Valrhona','kg',11.20,3.0,1,datetime('now')),
    ('ING-011','Chocolate belga negro 70%','Chocolate','Callebaut','kg',13.80,4.0,1,datetime('now')),
    ('ING-012','Pecanas troceadas','Frutos Secos','Importador','kg',18.50,2.0,1,datetime('now')),
    ('ING-013','Pasta avellana pura','Frutos Secos','Piedmont','kg',22.00,2.0,1,datetime('now')),
    ('ING-014','Pasta pistacchio siciliano','Frutos Secos','Bronte','kg',38.00,1.5,1,datetime('now')),
    ('ING-015','Masa base IQF clásica porcionada','Masa IQF','Obrador BCN','ud',1.20,200.0,1,datetime('now')),
    ('ING-016','Masa base IQF deluxe porcionada','Masa IQF','Obrador BCN','ud',1.65,100.0,1,datetime('now')),
    ('ING-017','Soda prebiótica 330ml','Bebida Base','Obrador BCN','ud',1.40,48.0,1,datetime('now')),
    ('ING-018','Café green bean single origin','Bebida Base','Specialty Coffee','kg',32.00,5.0,1,datetime('now')),
    ('ING-019','Leche entera fresca','Lacteo','Granja local','L',0.95,20.0,1,datetime('now')),
    ('ING-020','Caja kraft individual','Packaging','Magepack','ud',0.18,500.0,1,datetime('now')),
    ('ING-021','Caja regalo 4 uds','Packaging','Magepack','ud',0.65,200.0,1,datetime('now')),
    ('ING-022','Caja regalo 6 uds premium','Packaging','Magepack','ud',1.20,100.0,1,datetime('now')),
    ('ING-023','Maldon sal escamas','Aditivo','Maldon','kg',28.00,0.5,1,datetime('now')),
    ('ING-024','Frambuesa liofilizada','Frutos Secos','Lyo','kg',65.00,0.5,1,datetime('now')),
    ('ING-025','Caramelo artesanal base','Aditivo','Obrador BCN','kg',8.50,2.0,1,datetime('now'));

-- ── TABLA 6: ESCANDALLOS ─────────────────────────────────────
DROP TABLE IF EXISTS escandallos;
CREATE TABLE escandallos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_producto     TEXT NOT NULL,
    id_ingrediente  TEXT NOT NULL,
    cantidad        REAL NOT NULL,
    unidad          TEXT NOT NULL,
    fase            TEXT DEFAULT 'Masa',
    activo          INTEGER DEFAULT 1,
    actualizado_en  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_escandallos_producto ON escandallos(id_producto);

INSERT INTO escandallos (id_producto,id_ingrediente,cantidad,unidad,fase) VALUES
    ('CC-CLA-001','ING-015',1.0,'ud','Masa'),
    ('CC-CLA-001','ING-009',18.0,'g','Acabado'),
    ('CC-CLA-001','ING-007',0.5,'g','Acabado'),
    ('CC-CLA-001','ING-020',1.0,'ud','Packaging'),
    ('CC-DLX-001','ING-016',1.0,'ud','Masa'),
    ('CC-DLX-001','ING-009',12.0,'g','Acabado'),
    ('CC-DLX-001','ING-023',0.8,'g','Acabado'),
    ('CC-DLX-001','ING-020',1.0,'ud','Packaging'),
    ('CC-DLX-002','ING-016',1.0,'ud','Masa'),
    ('CC-DLX-002','ING-014',15.0,'g','Acabado'),
    ('CC-DLX-002','ING-024',3.0,'g','Acabado'),
    ('CC-DLX-002','ING-020',1.0,'ud','Packaging'),
    ('CC-DLX-003','ING-016',1.0,'ud','Masa'),
    ('CC-DLX-003','ING-025',20.0,'g','Acabado'),
    ('CC-DLX-003','ING-023',0.6,'g','Acabado'),
    ('CC-DLX-003','ING-020',1.0,'ud','Packaging'),
    ('CC-SOD-001','ING-017',1.0,'ud','Bebida'),
    ('CC-SOD-002','ING-017',1.0,'ud','Bebida'),
    ('CC-CAF-001','ING-018',8.0,'g','Bebida'),
    ('CC-CAF-002','ING-018',16.0,'g','Bebida'),
    ('CC-CAF-002','ING-019',160.0,'ml','Bebida'),
    ('CC-PAK-001','ING-015',4.0,'ud','Masa'),
    ('CC-PAK-001','ING-009',60.0,'g','Acabado'),
    ('CC-PAK-001','ING-021',1.0,'ud','Packaging'),
    ('CC-PAK-002','ING-016',6.0,'ud','Masa'),
    ('CC-PAK-002','ING-009',50.0,'g','Acabado'),
    ('CC-PAK-002','ING-022',1.0,'ud','Packaging');

-- ── TABLA 7: VENTAS DETALLADAS ───────────────────────────────
DROP TABLE IF EXISTS ventas_detalladas;
CREATE TABLE ventas_detalladas (
    id_venta        TEXT NOT NULL,
    id_tienda       TEXT NOT NULL,
    fecha           TEXT NOT NULL,
    hora            INTEGER NOT NULL,
    id_producto     TEXT NOT NULL,
    cantidad        INTEGER NOT NULL DEFAULT 1,
    precio_unitario REAL NOT NULL,
    descuento       REAL DEFAULT 0.0,
    total_linea     REAL NOT NULL DEFAULT 0,
    canal           TEXT DEFAULT 'Presencial',
    origen_dato     TEXT DEFAULT 'TPV',
    creado_en       TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (id_venta, id_producto)
);

CREATE INDEX IF NOT EXISTS idx_ventas_tienda_fecha ON ventas_detalladas(id_tienda, fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_hora ON ventas_detalladas(id_tienda, fecha, hora);
CREATE INDEX IF NOT EXISTS idx_ventas_producto ON ventas_detalladas(id_producto, fecha);

-- ── TABLA 8: CONTROL MERMAS ──────────────────────────────────
DROP TABLE IF EXISTS control_mermas;
CREATE TABLE control_mermas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tienda       TEXT NOT NULL,
    fecha           TEXT NOT NULL,
    id_producto     TEXT NOT NULL,
    cantidad_ud     REAL NOT NULL,
    peso_g          REAL,
    motivo          TEXT NOT NULL,
    coste_economico REAL DEFAULT 0,
    url_foto_r2     TEXT,
    operario_id     TEXT,
    notas           TEXT,
    creado_en       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mermas_tienda_fecha ON control_mermas(id_tienda, fecha);

-- ── TABLA 9: INVENTARIOS DIARIOS ─────────────────────────────
DROP TABLE IF EXISTS inventarios_diarios;
CREATE TABLE inventarios_diarios (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tienda       TEXT NOT NULL,
    fecha           TEXT NOT NULL,
    id_ingrediente  TEXT NOT NULL,
    stock_apertura  REAL,
    entradas_dia    REAL DEFAULT 0,
    consumo_teorico REAL,
    stock_fisico    REAL NOT NULL,
    desviacion      REAL DEFAULT 0,
    operario_id     TEXT,
    creado_en       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventario_tienda_fecha ON inventarios_diarios(id_tienda, fecha);

-- ── TABLA 10: GESTIÓN PERSONAL ───────────────────────────────
DROP TABLE IF EXISTS gestion_personal;
CREATE TABLE gestion_personal (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tienda       TEXT NOT NULL,
    id_operario     TEXT NOT NULL,
    fecha           TEXT NOT NULL,
    turno           TEXT NOT NULL,
    hora_entrada    TEXT NOT NULL,
    hora_salida     TEXT,
    horas_trabajadas REAL,
    ventas_periodo  REAL,
    kpi_ventas_hora REAL DEFAULT 0,
    notas           TEXT,
    creado_en       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_personal_tienda_fecha ON gestion_personal(id_tienda, fecha);

-- ── TABLA 11: CRM VIP CLUB ───────────────────────────────────
DROP TABLE IF EXISTS crm_clientes;
CREATE TABLE crm_clientes (
    id_cliente      TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    nombre          TEXT NOT NULL,
    email           TEXT UNIQUE,
    telefono        TEXT,
    fecha_nacimiento TEXT,
    id_tienda_origen TEXT,
    fecha_registro  TEXT DEFAULT (date('now')),
    segmento        TEXT DEFAULT 'Nuevo',
    total_visitas   INTEGER DEFAULT 0,
    gasto_total_eu  REAL DEFAULT 0.0,
    ticket_medio    REAL DEFAULT 0.0,
    consentimiento_marketing INTEGER DEFAULT 0,
    notas_operador  TEXT,
    activo          INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_crm_email ON crm_clientes(email);
CREATE INDEX IF NOT EXISTS idx_crm_tienda ON crm_clientes(id_tienda_origen);
CREATE INDEX IF NOT EXISTS idx_crm_segmento ON crm_clientes(segmento);

-- ── TABLA 12: FACTURAS PROVEEDORES ───────────────────────────
DROP TABLE IF EXISTS facturas_proveedores;
CREATE TABLE facturas_proveedores (
    id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_tienda       TEXT NOT NULL,
    proveedor       TEXT NOT NULL,
    numero_factura  TEXT NOT NULL,
    fecha_factura   TEXT NOT NULL,
    id_ingrediente  TEXT,
    cantidad        REAL NOT NULL DEFAULT 0,
    unidad          TEXT NOT NULL DEFAULT 'ud',
    precio_real_unitario REAL NOT NULL DEFAULT 0,
    total_factura   REAL NOT NULL,
    url_factura_r2  TEXT,
    registrado_por  TEXT,
    creado_en       TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_facturas_tienda ON facturas_proveedores(id_tienda, fecha_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_ingrediente ON facturas_proveedores(id_ingrediente);

-- ── VISTA: FOOD COST TEÓRICO ─────────────────────────────────
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
        END
    ) / p.pvp_directo * 100.0, 2) AS food_cost_pct
FROM escandallos e
JOIN productos p ON e.id_producto = p.id_producto
JOIN ingredientes i ON e.id_ingrediente = i.id_ingrediente
WHERE e.activo = 1 AND p.activo = 1
GROUP BY e.id_producto;

-- ── VISTA: KPIs DIARIOS ──────────────────────────────────────
DROP VIEW IF EXISTS v_kpis_diarios;
CREATE VIEW v_kpis_diarios AS
SELECT
    v.id_tienda,
    t.nombre AS tienda,
    v.fecha,
    COUNT(DISTINCT v.id_venta)          AS num_tickets,
    SUM(v.cantidad)                      AS unidades_vendidas,
    ROUND(SUM(v.total_linea), 2)         AS ventas_netas_eu,
    ROUND(SUM(v.total_linea) / MAX(1, COUNT(DISTINCT v.id_venta)), 2) AS ticket_medio,
    (SELECT ROUND(SUM(cm.coste_economico),2)
     FROM control_mermas cm
     WHERE cm.id_tienda = v.id_tienda AND cm.fecha = v.fecha) AS mermas_eu,
    (SELECT ROUND(SUM(gp.horas_trabajadas),1)
     FROM gestion_personal gp
     WHERE gp.id_tienda = v.id_tienda AND gp.fecha = v.fecha) AS horas_hombre
FROM ventas_detalladas v
JOIN tiendas t ON v.id_tienda = t.id_tienda
GROUP BY v.id_tienda, v.fecha;
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

-- ════════════════════════════════════════════════════════════════════════════
-- MÓDULO DE MARKETING & PUBLICIDAD
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS campanas_marketing (
    id_campana    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    nombre        TEXT NOT NULL,
    descripcion   TEXT,
    fecha_inicio  TEXT NOT NULL,
    fecha_fin     TEXT NOT NULL,
    tipo          TEXT NOT NULL, -- 'REDES_SOCIALES', 'LOCAL', 'INFLUENCER', 'OOH'
    presupuesto   REAL NOT NULL DEFAULT 0,
    estado        TEXT DEFAULT 'ACTIVA', -- 'ACTIVA', 'PAUSADA', 'FINALIZADA'
    creado_en     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS roi_marketing_tienda (
    id_registro        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_campana         TEXT NOT NULL,
    id_tienda          TEXT NOT NULL,
    inversion_real     REAL NOT NULL DEFAULT 0,
    tickets_promocion  INTEGER NOT NULL DEFAULT 0,
    ventas_atribuidas  REAL NOT NULL DEFAULT 0,
    creado_en          TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (id_campana) REFERENCES campanas_marketing(id_campana),
    FOREIGN KEY (id_tienda) REFERENCES tiendas(id_tienda)
);

-- ════════════════════════════════════════════════════════════════════════════
-- MÓDULO DE INTELIGENCIA Y ALGORITMOS PREDICTIVOS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS calendario_eventos (
    id_evento INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha DATE NOT NULL,
    ciudad TEXT NOT NULL,
    tipo TEXT NOT NULL, -- Ej: 'FESTIVO', 'LLUVIA', 'TEMPORADA_ALTA'
    descripcion TEXT,
    multiplicador_demanda REAL NOT NULL DEFAULT 1.0,
    UNIQUE(fecha, ciudad, tipo)
);

-- ════════════════════════════════════════════════════════════════════════════
-- MÓDULO 8: ASESOR DE MARKETING IA E INSTAGRAM
-- ════════════════════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════════════════════
-- MÓDULO 9: FINANZAS Y LIQUIDACIONES (ROYALTIES)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS liquidaciones_mensuales (
    id_liquidacion INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tienda TEXT NOT NULL,
    mes TEXT NOT NULL, -- Formato: 'YYYY-MM'
    ventas_netas REAL NOT NULL DEFAULT 0.0,
    royalty_pct REAL NOT NULL DEFAULT 0.05,
    royalty_eu REAL NOT NULL DEFAULT 0.0,
    canon_pct REAL NOT NULL DEFAULT 0.02,
    canon_eu REAL NOT NULL DEFAULT 0.0,
    estado TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADO
    fecha_generacion TEXT DEFAULT (datetime('now')),
    fecha_pago TEXT,
    UNIQUE(id_tienda, mes),
    FOREIGN KEY(id_tienda) REFERENCES tiendas(id_tienda) ON DELETE CASCADE
);

-- ════════════════════════════════════════════════════════════════════════════
-- MÓDULO 10: SOPORTE Y HELPDESK
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS soporte_tickets (
    id_ticket INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tienda TEXT NOT NULL,
    asunto TEXT NOT NULL,
    categoria TEXT NOT NULL, -- Ej: 'MANTENIMIENTO', 'TPV', 'RRHH', 'OTRO'
    descripcion TEXT NOT NULL,
    estado TEXT DEFAULT 'ABIERTO', -- ABIERTO, EN_PROGRESO, CERRADO
    respuesta_admin TEXT,
    creado_en TEXT DEFAULT (datetime('now')),
    actualizado_en TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(id_tienda) REFERENCES tiendas(id_tienda) ON DELETE CASCADE
);

-- ════════════════════════════════════════════════════════════════════════════
-- MÓDULO 11: EXPANSIÓN Y ONBOARDING (Nuevas Aperturas)
-- ════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS expansion_proyectos (
    id_proyecto INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_franquiciado TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    estado_proyecto TEXT DEFAULT 'BUSQUEDA_LOCAL', -- BUSQUEDA_LOCAL, CONTRATOS, REFORMAS, FORMACION, APERTURA, CANCELADO
    fecha_inicio TEXT DEFAULT (date('now')),
    fecha_estimada_apertura TEXT,
    creado_en TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expansion_tareas (
    id_tarea INTEGER PRIMARY KEY AUTOINCREMENT,
    id_proyecto INTEGER NOT NULL,
    fase TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    completada BOOLEAN DEFAULT 0,
    fecha_completada TEXT,
    FOREIGN KEY(id_proyecto) REFERENCES expansion_proyectos(id_proyecto) ON DELETE CASCADE
);

-- FASE 12: Simulador de Factibilidad de Expansión
CREATE TABLE IF NOT EXISTS expansion_simulaciones (
    id_simulacion INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_candidato TEXT,
    ubicacion TEXT,
    tipo_local TEXT, -- CALLE, CC
    horario TEXT,
    personal_requerido INTEGER,
    venta_estimada_diaria REAL,
    pct_delivery REAL,
    ebitda_estimado_anual REAL,
    score_viabilidad INTEGER,
    fecha_simulacion TEXT DEFAULT CURRENT_TIMESTAMP,
    datos_json TEXT -- Guardará todos los escenarios (Pesimista, Promedio, Optimista) en formato JSON
);
