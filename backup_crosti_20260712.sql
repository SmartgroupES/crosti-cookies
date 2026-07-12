PRAGMA defer_foreign_keys=TRUE;
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
    creado_en       TEXT DEFAULT (datetime('now'))
, pct_royalty REAL DEFAULT 5.0, pct_canon_publicidad REAL DEFAULT 2.0);
INSERT INTO "tiendas" ("id_tienda","nombre","ciudad","direccion","cp","latitud","longitud","perfil","franquiciado","email_franquiciado","telefono_franquiciado","nif_franquiciado","fecha_apertura","activa","creado_en","pct_royalty","pct_canon_publicidad") VALUES('BCN-01','Crosti Cookies Barcelona','Barcelona','Carrer de Provença, 123','08008',41.3888,2.1653,'Boutique Regalo','Piloto Barcelona','bcn@crosticookies.com','+34600000001','B12345678','2024-09-01',1,'2026-07-09 20:49:58',5,2);
INSERT INTO "tiendas" ("id_tienda","nombre","ciudad","direccion","cp","latitud","longitud","perfil","franquiciado","email_franquiciado","telefono_franquiciado","nif_franquiciado","fecha_apertura","activa","creado_en","pct_royalty","pct_canon_publicidad") VALUES('MAD-01','Crosti Cookies Madrid Salamanca','Madrid','Calle de Serrano, 45','28001',40.4268,-3.6893,'Boutique Regalo','Pendiente Asignación','mad@crosticookies.com','+34600000002',NULL,'2027-03-01',1,'2026-07-09 20:49:58',5,2);
INSERT INTO "tiendas" ("id_tienda","nombre","ciudad","direccion","cp","latitud","longitud","perfil","franquiciado","email_franquiciado","telefono_franquiciado","nif_franquiciado","fecha_apertura","activa","creado_en","pct_royalty","pct_canon_publicidad") VALUES('VAL-01','Crosti Cookies Valencia','Valencia','Calle de Colón, 78','46004',39.4699,-0.3763,'High Traffic Impulse','Pendiente Asignación','val@crosticookies.com','+34600000003',NULL,'2027-06-01',1,'2026-07-09 20:49:58',5,2);
INSERT INTO "tiendas" ("id_tienda","nombre","ciudad","direccion","cp","latitud","longitud","perfil","franquiciado","email_franquiciado","telefono_franquiciado","nif_franquiciado","fecha_apertura","activa","creado_en","pct_royalty","pct_canon_publicidad") VALUES('BCN-00','Obrador Central Crosti Cookies','Barcelona','[Dirección del Obrador]','08000',41.38,2.16,'Centro de Producción y Logística','Central Crosti','obrador@crosticookies.com','+34600000000',NULL,'2024-01-01',1,'2026-07-11 21:50:41',0,0);
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
INSERT INTO "usuarios" ("id","email","nombre","password_hash","salt","rol","id_tienda","activo","ultimo_login","creado_en") VALUES('admin_cc_001','admin@crosticookies.com','Administrador Central','d6d5456a799f58c76b0f5f7939a552789a28179681ba1ab7ef2bb43bc38f204c','0ed3fbd4-96aa-49cf-ab90-8b73661b44c8','ADMIN',NULL,1,'2026-07-11 21:43:18','2026-07-09 20:49:58');
INSERT INTO "usuarios" ("id","email","nombre","password_hash","salt","rol","id_tienda","activo","ultimo_login","creado_en") VALUES('b24d273cf75b683b','barcelona@crosticookies.com','Tienda Barcelona','a94cba5981cd3327f8d9a6617c8b2fb031583a35be67f5bf64f313d0dd005cdc','e778fece-9a34-4a87-aea0-50f0a1ced7b3','OPERARIO','BCN-01',1,'2026-07-10 12:37:41','2026-07-10 06:59:01');
INSERT INTO "usuarios" ("id","email","nombre","password_hash","salt","rol","id_tienda","activo","ultimo_login","creado_en") VALUES('5e11568bdf4b4e8f','franquiciado_madrid@crosticookies.com','Franquiciado Madrid','c4efebd0a2678622ea2dd49ff2e68d180aea9f16fb2e8fdd9ac338cbc14ceeb1','5667eb2b-ae21-425a-947a-a2687f100969','FRANQUICIADO','MAD-01',1,'2026-07-10 12:21:27','2026-07-10 07:01:13');
INSERT INTO "usuarios" ("id","email","nombre","password_hash","salt","rol","id_tienda","activo","ultimo_login","creado_en") VALUES('66e77a94744d44b7','operador@crosticookies.com','Franquiciado Barcelona','d8f013aea6fd15eaa06e7824b50352a146902ae2c55875598f2a7fe10303f14f','1903693a-7e99-4678-b8ed-66495e2a6698','FRANQUICIADO','BCN-01',1,'2026-07-10 12:37:29','2026-07-10 07:02:45');
CREATE TABLE sesiones_jwt (
    jti             TEXT PRIMARY KEY,
    id_usuario      TEXT NOT NULL,
    emitido_en      TEXT NOT NULL,
    expira_en       TEXT NOT NULL,
    ip_origen       TEXT,
    user_agent      TEXT,
    invalidado      INTEGER DEFAULT 0
);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('21f5269b-900d-45ad-be3c-f2988404d760','admin_cc_001','2026-07-09 21:13:49','2026-07-10 05:13:49','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('db1385e4-e20b-4484-83fe-ce914cd9bb31','admin_cc_001','2026-07-09 21:32:44','2026-07-10 05:32:44','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('1be5e6ab-d1a0-4513-8cd8-f0521d7b0c6f','admin_cc_001','2026-07-10 04:57:35','2026-07-10 12:57:35','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('faa914ca-6977-496a-a27e-cba98763bfa5','admin_cc_001','2026-07-10 05:12:13','2026-07-10 13:12:13','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('79b4f2a4-bdf7-431a-8ca3-62c7d1c9222e','admin_cc_001','2026-07-10 05:19:30','2026-07-10 13:19:30','87.235.212.160','Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('0ef992bc-76b8-4b23-9370-28255b0c2f07','admin_cc_001','2026-07-10 06:57:43','2026-07-10 14:57:43','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('e97b4aad-da2d-408c-9969-908f540de727','b24d273cf75b683b','2026-07-10 06:59:24','2026-07-10 14:59:24','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('4038bbf3-cb87-4013-984d-b2994efefecf','admin_cc_001','2026-07-10 07:00:00','2026-07-10 15:00:00','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('92c04440-4494-43e5-b0c9-dce3895325cf','5e11568bdf4b4e8f','2026-07-10 07:01:25','2026-07-10 15:01:25','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('9bb5f7fc-ffc9-452e-9dd2-038b490fa125','admin_cc_001','2026-07-10 07:01:42','2026-07-10 15:01:42','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('f1338314-f6a1-4a54-9cf8-3eb4d7e2be87','66e77a94744d44b7','2026-07-10 07:03:06','2026-07-10 15:03:06','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('fb84ad91-cab9-4e9e-ae00-69427f59abbd','admin_cc_001','2026-07-10 07:13:13','2026-07-10 15:13:13','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('67fa1cf6-7113-47bf-801d-2a850d7e2c52','admin_cc_001','2026-07-10 12:19:16','2026-07-10 20:19:16','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('c5161205-bace-4629-828d-16b4be660343','5e11568bdf4b4e8f','2026-07-10 12:21:27','2026-07-10 20:21:27','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('3a60cfb1-583e-40df-bd59-3175c2c6e073','admin_cc_001','2026-07-10 12:21:50','2026-07-10 20:21:50','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('ff2d4c09-94ac-4753-bab9-28252505d83e','admin_cc_001','2026-07-10 12:25:42','2026-07-10 20:25:42','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('d3ed4ffa-56a0-4acf-aecb-4b80709aab0e','66e77a94744d44b7','2026-07-10 12:37:21','2026-07-10 20:37:21','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('3ec2ebc0-ca91-4e41-9600-b29068d52741','66e77a94744d44b7','2026-07-10 12:37:29','2026-07-10 20:37:29','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('21ce4fcc-8533-4f6f-9b97-bf7ec8a32965','b24d273cf75b683b','2026-07-10 12:37:41','2026-07-10 20:37:41','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('9cfe2a13-904b-490a-b7da-f7a784df094d','admin_cc_001','2026-07-10 12:40:09','2026-07-10 20:40:09','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('d4d531c1-24ad-456e-8c66-8e355b864847','admin_cc_001','2026-07-10 12:48:58','2026-07-10 20:48:58','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('c740b0b6-b0e6-4eec-ab5e-f17661accc37','admin_cc_001','2026-07-10 12:50:26','2026-07-10 20:50:26','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('c08da43c-0eb3-4cfb-b12d-dd1329eb0817','admin_cc_001','2026-07-10 14:47:36','2026-07-10 22:47:36','178.139.164.7','Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('c53f6176-307f-45e8-847c-66e6c4fe2487','admin_cc_001','2026-07-11 07:49:27','2026-07-11 15:49:27','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('cb7ae102-985e-4501-8fe2-c0190875d4d6','admin_cc_001','2026-07-11 08:23:29','2026-07-11 16:23:29','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('6a974854-e6ee-4650-a6a1-b004fd599e9b','admin_cc_001','2026-07-11 08:25:42','2026-07-11 16:25:42','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('a0f0e084-1be6-4897-83ac-3e17f05c64f5','admin_cc_001','2026-07-11 08:28:10','2026-07-11 16:28:10','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('4b13305b-7fc2-473c-b751-c96f4bf0a9d2','admin_cc_001','2026-07-11 08:29:51','2026-07-11 16:29:51','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('ea292876-eb6c-4ac2-87c7-647551b3b3e6','admin_cc_001','2026-07-11 14:42:08','2026-07-11 22:42:08','178.139.165.129','Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('b85479f8-d14a-4fb7-83c7-54dc026e081b','admin_cc_001','2026-07-11 14:47:06','2026-07-11 22:47:06','178.139.165.206','Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('5712cb10-6502-43d1-950a-ac964970420d','admin_cc_001','2026-07-11 21:21:16','2026-07-12 05:21:16','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('527c096a-c45e-4976-ab10-272cceeedee3','admin_cc_001','2026-07-11 21:21:34','2026-07-12 05:21:34','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',1);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('3fcb9ccb-3fe4-42d0-9cb1-b9185fe74514','admin_cc_001','2026-07-11 21:26:10','2026-07-12 05:26:10','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
INSERT INTO "sesiones_jwt" ("jti","id_usuario","emitido_en","expira_en","ip_origen","user_agent","invalidado") VALUES('bf648ec8-559f-4fff-ac18-13dc0e084d99','admin_cc_001','2026-07-11 21:43:18','2026-07-12 05:43:18','87.235.212.160','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',0);
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
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-001','Harina de trigo T55','Harina','Harimsa','kg',0.85,25,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-002','Mantequilla 82% MG','Grasa','Président','kg',7.2,10,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-003','Azúcar moreno integral','Azucar','Azucarera','kg',1.2,10,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-004','Azúcar blanquilla','Azucar','Azucarera','kg',0.9,10,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-005','Huevo fresco M','Lacteo','Granja local','ud',0.22,60,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-006','Extracto vainilla bourbon','Aditivo','Nielsen-Massey','ml',0.08,200,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-007','Sal marina fina','Aditivo','Mediterránea','kg',1.1,2,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-008','Bicarbonato sódico','Aditivo','Arm & Hammer','kg',2.5,1,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-009','Chip chocolate semi-dulce 54%','Chocolate','Valrhona','kg',14.5,5,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-010','Cacao en polvo 22-24%','Chocolate','Valrhona','kg',11.2,3,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-011','Chocolate belga negro 70%','Chocolate','Callebaut','kg',13.8,4,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-012','Pecanas troceadas','Frutos Secos','Importador','kg',18.5,2,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-013','Pasta avellana pura','Frutos Secos','Piedmont','kg',22,2,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-014','Pasta pistacchio siciliano','Frutos Secos','Bronte','kg',38,1.5,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-015','Masa base IQF clásica porcionada','Masa IQF','Obrador BCN','ud',1.2,200,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-016','Masa base IQF deluxe porcionada','Masa IQF','Obrador BCN','ud',1.65,100,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-017','Soda prebiótica 330ml','Bebida Base','Obrador BCN','ud',1.4,48,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-018','Café green bean single origin','Bebida Base','Specialty Coffee','kg',32,5,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-019','Leche entera fresca','Lacteo','Granja local','L',0.95,20,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-020','Caja kraft individual','Packaging','Magepack','ud',0.18,500,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-021','Caja regalo 4 uds','Packaging','Magepack','ud',0.65,200,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-022','Caja regalo 6 uds premium','Packaging','Magepack','ud',1.2,100,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-023','Maldon sal escamas','Aditivo','Maldon','kg',28,0.5,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-024','Frambuesa liofilizada','Frutos Secos','Lyo','kg',65,0.5,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-025','Caramelo artesanal base','Aditivo','Obrador BCN','kg',8.5,2,1,'2026-07-09 20:49:58');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-026','Chispas de chocolate blanco','Chocolate','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-027','Chispas de chocolate con leche','Chocolate','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-028','Avellanas troceadas','Frutos Secos','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-029','Nueces troceadas','Frutos Secos','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-030','Macadamias troceadas','Frutos Secos','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-031','Pistachos troceados','Frutos Secos','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-032','Base cremosa Cheesecake','Relleno','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-033','Crema tipo Nutella','Relleno','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-034','Crema tipo Kinder','Relleno','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-035','Mezcla Cookies & Cream','Relleno','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-036','Lemon Curd','Relleno','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-037','Curd de Maracuyá','Relleno','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-038','Toffee crujiente','Relleno','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-039','Puré/Reducción de Mango','Saborizante','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-040','Puré de Banana','Saborizante','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-041','Aroma/Ralladura Lima-Limón','Saborizante','kg','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-042','Canela molida','Saborizante','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-043','Galleta María troceada','Aditivo','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-044','Galleta Oreo troceada','Aditivo','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-045','Masa Kataifi','Aditivo','Pendiente','kg',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-046','Lata Coca-Cola 33cl','Bebida Comercial','Pendiente','ud',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-047','Lata Coca-Cola Zero 33cl','Bebida Comercial','Pendiente','ud',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-048','Agua mineral 33cl','Bebida Comercial','Pendiente','ud',0,0,1,'2026-07-10 05:49:51');
INSERT INTO "ingredientes" ("id_ingrediente","nombre","categoria","proveedor_ref","unidad","coste_por_unidad","stock_seguridad_min","activo","actualizado_en") VALUES('ING-049','Cacaolat 200ml','Bebida Comercial','Pendiente','ud',0,0,1,'2026-07-10 05:49:51');
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
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(1,'CC-CLA-001','ING-015',1,'ud','Masa',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(2,'CC-CLA-001','ING-009',18,'g','Acabado',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(3,'CC-CLA-001','ING-007',0.5,'g','Acabado',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(4,'CC-CLA-001','ING-020',1,'ud','Packaging',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(5,'CC-DLX-001','ING-016',1,'ud','Masa',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(6,'CC-DLX-001','ING-009',12,'g','Acabado',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(7,'CC-DLX-001','ING-023',0.8,'g','Acabado',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(8,'CC-DLX-001','ING-020',1,'ud','Packaging',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(9,'CC-DLX-002','ING-016',1,'ud','Masa',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(10,'CC-DLX-002','ING-014',15,'g','Acabado',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(11,'CC-DLX-002','ING-024',3,'g','Acabado',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(12,'CC-DLX-002','ING-020',1,'ud','Packaging',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(13,'CC-DLX-003','ING-016',1,'ud','Masa',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(14,'CC-DLX-003','ING-025',20,'g','Acabado',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(15,'CC-DLX-003','ING-023',0.6,'g','Acabado',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(16,'CC-DLX-003','ING-020',1,'ud','Packaging',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(17,'CC-SOD-001','ING-017',1,'ud','Bebida',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(18,'CC-SOD-002','ING-017',1,'ud','Bebida',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(19,'CC-CAF-001','ING-018',8,'g','Bebida',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(20,'CC-CAF-002','ING-018',16,'g','Bebida',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(21,'CC-CAF-002','ING-019',160,'ml','Bebida',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(22,'CC-PAK-001','ING-015',4,'ud','Masa',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(23,'CC-PAK-001','ING-009',60,'g','Acabado',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(24,'CC-PAK-001','ING-021',1,'ud','Packaging',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(25,'CC-PAK-002','ING-016',6,'ud','Masa',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(26,'CC-PAK-002','ING-009',50,'g','Acabado',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(27,'CC-PAK-002','ING-022',1,'ud','Packaging',1,'2026-07-09 20:49:58');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(28,'CC-ESP-001','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(29,'CC-ESP-001','ING-026',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(30,'CC-ESP-001','ING-039',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(31,'CC-ESP-001','ING-032',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(32,'CC-ESP-001','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(33,'CC-CLA-005','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(34,'CC-CLA-005','ING-010',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(35,'CC-CLA-005','ING-027',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(36,'CC-CLA-005','ING-026',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(37,'CC-CLA-005','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(38,'CC-CLA-006','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(39,'CC-CLA-006','ING-040',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(40,'CC-CLA-006','ING-009',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(41,'CC-CLA-006','ING-029',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(42,'CC-CLA-006','ING-042',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(43,'CC-CLA-006','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(44,'CC-CLA-007','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(45,'CC-CLA-007','ING-026',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(46,'CC-CLA-007','ING-030',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(47,'CC-CLA-007','ING-038',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(48,'CC-CLA-007','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(49,'CC-REL-001','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(50,'CC-REL-001','ING-010',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(51,'CC-REL-001','ING-026',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(52,'CC-REL-001','ING-032',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(53,'CC-REL-001','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(54,'CC-REL-002','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(55,'CC-REL-002','ING-009',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(56,'CC-REL-002','ING-028',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(57,'CC-REL-002','ING-033',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(58,'CC-REL-002','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(59,'CC-REL-003','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(60,'CC-REL-003','ING-041',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(61,'CC-REL-003','ING-026',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(62,'CC-REL-003','ING-043',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(63,'CC-REL-003','ING-036',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(64,'CC-REL-003','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(65,'CC-REL-004','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(66,'CC-REL-004','ING-027',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(67,'CC-REL-004','ING-026',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(68,'CC-REL-004','ING-028',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(69,'CC-REL-004','ING-034',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(70,'CC-REL-004','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(71,'CC-REL-005','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(72,'CC-REL-005','ING-027',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(73,'CC-REL-005','ING-026',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(74,'CC-REL-005','ING-044',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(75,'CC-REL-005','ING-035',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(76,'CC-REL-005','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(77,'CC-REL-006','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(78,'CC-REL-006','ING-010',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(79,'CC-REL-006','ING-026',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(80,'CC-REL-006','ING-037',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(81,'CC-REL-006','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(82,'CC-DLX-004','ING-015',0,'ud','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(83,'CC-DLX-004','ING-010',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(84,'CC-DLX-004','ING-009',0,'g','Masa',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(85,'CC-DLX-004','ING-031',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(86,'CC-DLX-004','ING-045',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(87,'CC-DLX-004','ING-014',0,'g','Acabado',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(88,'CC-DLX-004','ING-020',0,'ud','Packaging',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(89,'CC-BEB-001','ING-046',0,'ud','Bebida',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(90,'CC-BEB-002','ING-047',0,'ud','Bebida',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(91,'CC-BEB-003','ING-048',0,'ud','Bebida',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(92,'CC-BEB-004','ING-049',0,'ud','Bebida',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(93,'CC-SOD-003','ING-017',0,'ud','Bebida',1,'2026-07-10 05:49:51');
INSERT INTO "escandallos" ("id","id_producto","id_ingrediente","cantidad","unidad","fase","activo","actualizado_en") VALUES(94,'CC-SOD-004','ING-017',0,'ud','Bebida',1,'2026-07-10 05:49:51');
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
, id_proveedor TEXT);
CREATE TABLE IF NOT EXISTS "productos" (
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
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-CLA-001','Chocolate Chips Original','Cookies - NY Clásicas','Masa de vainilla con chispas de chocolate negro y un toque de sal marina. Simple, clásica y perfecta.',150,3.5,18,22,1,1,'2026-07-09 20:49:58','5.1');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-CLA-002','Cookie Clásica Doble Chocolate','Clasica','NY Style ~150g doble chocolate belga',150,3.5,18,22,1,1,'2026-07-09 20:49:58',NULL);
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-CLA-003','Cookie Clásica Vainilla Pecana','Clasica','NY Style ~150g vainilla bourbon y pecanas',150,3.5,18,22,1,1,'2026-07-09 20:49:58',NULL);
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-CLA-004','Cookie Clásica Mantequilla Avellana','Clasica','NY Style ~150g crema avellana tostada',150,3.5,18,22,1,1,'2026-07-09 20:49:58',NULL);
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-DLX-001','Cookie Deluxe Trufa Negra','Deluxe','Edición premium trufa negra y Maldon',155,5.5,24,28,1,1,'2026-07-09 20:49:58',NULL);
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-DLX-002','Chocolate Blanco Pistacho','Cookies - NY Deluxe','Masa de vainilla con chispas de chocolate blanco, pistachos troceados y relleno suave de crema de pistacho.',155,5.5,24,28,1,1,'2026-07-09 20:49:58','5.7');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-DLX-003','Cookie Deluxe Caramelo Flor de Sal','Deluxe','Caramelo artesanal y flor de sal Camargue',155,5.5,24,28,1,1,'2026-07-09 20:49:58',NULL);
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-SOD-001','Lime Ginger','Bebidas','Lima fresca con jugo de jengibre especiado. Ácida, crujiente y con un ligero toque picante. (Soda prebiótica elaborada en Barcelona con ingredientes 100% naturales)',NULL,3.8,NULL,NULL,1,1,'2026-07-09 20:49:58','2.9');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-SOD-002','Hibiscus Pomelo','Bebidas','Hibisco intenso con el toque cítrico y ligeramente amargo del pomelo. Floral, refrescante y con un equilibrio vibrante. (Soda prebiótica elaborada en Barcelona con ingredientes 100% naturales)',NULL,3.8,NULL,NULL,1,1,'2026-07-09 20:49:58','2.9');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-CAF-001','Espresso de Especialidad','Cafe Especialidad','Single origin, extracción 25s',NULL,2.5,NULL,NULL,1,1,'2026-07-09 20:49:58',NULL);
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-CAF-002','Flat White','Cafe Especialidad','Doble ristretto, leche vaporizada',NULL,3.2,NULL,NULL,1,1,'2026-07-09 20:49:58',NULL);
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-PAK-001','Crosti Box de 4','Cookies - Packs','Lista de sabores por categoría donde puede escoger 2 NY Clásicas y 2 NY Rellenas.',600,12,18,22,1,1,'2026-07-09 20:49:58','20.9');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-PAK-002','Crosti Box de 6','Cookies - Packs','2 NY Clásicas, 3 NY Rellenas, 1 NY Deluxe.',930,28,24,28,1,1,'2026-07-09 20:49:58','31.9');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-ESP-001','Mango Cheesecake','Cookies Especiales del Mes','Masa de vainilla con mango troceado y chispas de chocolate blanco, rellena de cheesecake cremosa de mango y una deliciosa reducción de mango. Dulce, fresca y con un irresistible toque tropical.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.5');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-CLA-005','Triple Chocolate','Cookies - NY Clásicas','Masa de cacao con chispas de chocolate con leche y blanco. Un clásico para amantes del chocolate.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.1');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-CLA-006','Banana Bread Vegana','Cookies - NY Clásicas','Masa de banana y vainilla con chispas de chocolate oscuro, nueces y un toque de canela. Suave, aromática y 100% vegetal, inspirada en el clásico Banana Bread.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.1');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-CLA-007','Macadamia Toffee','Cookies - NY Clásicas','Base de vainilla con chispas de chocolate blanco, macadamias troceadas y toffee crujiente. Dulce, cremosa y con contraste perfecto entre textura y sabor.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.1');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-REL-001','Red Velvet Cheesecake','Cookies - NY Rellenas','Masa Red Velvet de vainilla y cacao con chispas de chocolate blanco y relleno cremoso de cheesecake.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.5');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-REL-002','Nutella','Cookies - NY Rellenas','Masa de vainilla con chispas de chocolate negro, avellanas troceadas y relleno cremoso de Nutella.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.5');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-REL-003','Lemon Pie','Cookies - NY Rellenas','Masa de Vainilla aromatizada con Lima-Limón, con Chocolate Blanco, trozos de Galleta María y rellena de Lemon Curd casero.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.5');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-REL-004','Kinder','Cookies - NY Rellenas','Masa de vainilla con chispas de chocolate con leche, blanco y avellanas troceadas. Rellena con crema Kinder suave y dulce.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.5');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-REL-005','Oreo Cookies & Cream','Cookies - NY Rellenas','Nuestra clásica cookie de Oreo con masa de vainilla, chispas de chocolate con leche, blanco y trozos de Oreo. Rellena con una cremosa mezcla cookies & cream que la hace irresistible.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.5');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-REL-006','Dark Maracuyá','Cookies - NY Rellenas','Masa de cacao con chocolate blanco de maracuyá y relleno de curd de maracuyá. Intensa y tropical.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.5');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-DLX-004','Dubái Pistacho','Cookies - NY Deluxe','Masa de cacao con chispas de chocolate negro, pistachos troceados y relleno de kataifi con crema de pistacho.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','5.7');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-BEB-001','Coca-Cola','Bebidas','Lata de 33cl.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','2.2');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-BEB-002','Coca-Cola Zero','Bebidas',NULL,NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','2.2');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-BEB-003','Agua 33cl','Bebidas','Agua mineral en botella de 33cl.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','1.5');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-BEB-004','Cacaolat','Bebidas','Batido de cacao, ideal para acompañar tus cookies.',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','2.9');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-SOD-003','Tangerine Passionfruit','Bebidas','Mandarina jugosa con maracuyá tropical. Dulce, cítrica y súper refrescante. (Soda prebiótica elaborada en Barcelona con ingredientes 100% naturales)',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','2.9');
INSERT INTO "productos" ("id_producto","nombre","categoria","descripcion","peso_unidad_g","pvp_directo","pvp_ubereats","food_cost_obj_min","food_cost_obj_max","activo","orden_display","creado_en") VALUES('CC-SOD-004','Cherry Yuzu','Bebidas','La combinación perfecta entre cereza jugosa y cítricos japoneses. Dulce, refrescante y con un toque diferente. (Soda prebiótica elaborada en Barcelona con ingredientes 100% naturales)',NULL,NULL,NULL,NULL,1,1,'2026-07-10 05:48:12','2.9');
CREATE TABLE proveedores (
    id_proveedor    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    nombre          TEXT NOT NULL,
    contacto        TEXT,
    telefono        TEXT,
    email           TEXT,
    condiciones     TEXT,
    activo          INTEGER DEFAULT 1,
    creado_en       TEXT DEFAULT (datetime('now'))
);
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('bce205af430cfa23','Harimsa',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('da8cd92e8a4bcb28','Président',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('e8ac3551dbcdddf7','Azucarera',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('df6f3f4117e7c8f5','Granja local',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('eaa1e3e4129e1d5a','Nielsen-Massey',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('9546ec89ff633675','Mediterránea',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('9cad4f759d68bc78','Arm & Hammer',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('a172adaf58300082','Valrhona',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('2b5e864b147c2256','Callebaut',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('fef36670dd89e118','Importador',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('9ea7464a49e54b34','Piedmont',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('efb32841e8aeb276','Bronte',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('d9e189f2bb8551d8','Obrador BCN',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('8f0115fe68975cf2','Specialty Coffee',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('6141ec3f270c2f12','Magepack',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('fb07d22a1e5a8b78','Maldon',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
INSERT INTO "proveedores" ("id_proveedor","nombre","contacto","telefono","email","condiciones","activo","creado_en") VALUES('db902b1ced6b565e','Lyo',NULL,NULL,NULL,NULL,1,'2026-07-11 08:05:15');
CREATE TABLE inventario_actual (
    id_tienda       TEXT NOT NULL,
    id_item         TEXT NOT NULL,
    tipo_item       TEXT NOT NULL, -- 'INGREDIENTE' o 'PRODUCTO'
    estado          TEXT NOT NULL, -- 'SECO', 'REFRIGERADO', 'CONGELADO', 'TRANSITO', 'VITRINA'
    cantidad        REAL NOT NULL DEFAULT 0,
    unidad          TEXT NOT NULL,
    ultima_actualizacion TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (id_tienda, id_item, estado)
);
CREATE TABLE movimientos_inventario (
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
CREATE TABLE liquidaciones_mensuales (
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
CREATE TABLE auditorias (
    id_auditoria        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_tienda           TEXT NOT NULL,
    fecha               TEXT NOT NULL,
    auditor_id          TEXT NOT NULL,
    puntuacion_obtenida REAL NOT NULL DEFAULT 0,
    puntuacion_maxima   REAL NOT NULL DEFAULT 0,
    pct_cumplimiento    REAL NOT NULL DEFAULT 0,
    observaciones       TEXT,
    creado_en           TEXT DEFAULT (datetime('now'))
);
CREATE TABLE auditoria_respuestas (
    id_respuesta    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_auditoria    TEXT NOT NULL,
    categoria       TEXT NOT NULL,
    pregunta        TEXT NOT NULL,
    calificacion    REAL NOT NULL, -- 0 (Fallo), 1 (Cumple), -1 (N/A)
    notas_adicionales TEXT,
    creado_en       TEXT DEFAULT (datetime('now'))
);
CREATE TABLE solicitudes_franquicia (
    id_solicitud        TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    nombre_completo     TEXT NOT NULL,
    email               TEXT NOT NULL,
    telefono            TEXT NOT NULL,
    ciudad_interes      TEXT NOT NULL,
    capital_disponible  TEXT NOT NULL,
    estado              TEXT DEFAULT 'Nueva', -- Nueva, En revisión, Aprobada, Rechazada
    creado_en           TEXT DEFAULT (datetime('now'))
);
CREATE TABLE tickets_soporte (
    id_ticket     TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_tienda     TEXT NOT NULL,
    asunto        TEXT NOT NULL,
    categoria     TEXT NOT NULL, -- Mantenimiento, TPV, Operaciones, Otro
    estado        TEXT DEFAULT 'Abierto', -- Abierto, En progreso, Resuelto
    creado_en     TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(id_tienda) REFERENCES tiendas(id_tienda)
);
CREATE TABLE opex_franquiciado (
    id_opex       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_tienda     TEXT NOT NULL,
    mes           TEXT NOT NULL, -- YYYY-MM
    alquiler      REAL DEFAULT 0,
    suministros   REAL DEFAULT 0,
    seguros       REAL DEFAULT 0,
    personal      REAL DEFAULT 0,
    otros_gastos  REAL DEFAULT 0,
    creado_en     TEXT DEFAULT (datetime('now')),
    UNIQUE(id_tienda, mes),
    FOREIGN KEY(id_tienda) REFERENCES tiendas(id_tienda)
);
CREATE TABLE campanas_marketing (
    id_campana    TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    nombre        TEXT NOT NULL,
    descripcion   TEXT,
    fecha_inicio  TEXT NOT NULL,
    fecha_fin     TEXT NOT NULL,
    presupuesto   REAL DEFAULT 0,
    tipo          TEXT NOT NULL, -- Nacional, Local, Digital
    estado        TEXT DEFAULT 'Activa', -- Activa, Finalizada, Pausada
    creado_en     TEXT DEFAULT (datetime('now'))
);
CREATE TABLE roi_marketing_tienda (
    id_roi             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    id_campana         TEXT NOT NULL,
    id_tienda          TEXT NOT NULL,
    inversion_real     REAL DEFAULT 0,
    tickets_promocion  INTEGER DEFAULT 0, -- Cupones canjeados o leads
    ventas_atribuidas  REAL DEFAULT 0,
    creado_en          TEXT DEFAULT (datetime('now')),
    UNIQUE(id_campana, id_tienda),
    FOREIGN KEY(id_campana) REFERENCES campanas_marketing(id_campana),
    FOREIGN KEY(id_tienda) REFERENCES tiendas(id_tienda)
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('escandallos',94);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tienda ON usuarios(id_tienda);
CREATE INDEX idx_sesiones_usuario ON sesiones_jwt(id_usuario);
CREATE INDEX idx_sesiones_expira ON sesiones_jwt(expira_en);
CREATE INDEX idx_escandallos_producto ON escandallos(id_producto);
CREATE INDEX idx_ventas_tienda_fecha ON ventas_detalladas(id_tienda, fecha);
CREATE INDEX idx_ventas_hora ON ventas_detalladas(id_tienda, fecha, hora);
CREATE INDEX idx_ventas_producto ON ventas_detalladas(id_producto, fecha);
CREATE INDEX idx_mermas_tienda_fecha ON control_mermas(id_tienda, fecha);
CREATE INDEX idx_inventario_tienda_fecha ON inventarios_diarios(id_tienda, fecha);
CREATE INDEX idx_personal_tienda_fecha ON gestion_personal(id_tienda, fecha);
CREATE INDEX idx_crm_email ON crm_clientes(email);
CREATE INDEX idx_crm_tienda ON crm_clientes(id_tienda_origen);
CREATE INDEX idx_crm_segmento ON crm_clientes(segmento);
CREATE INDEX idx_facturas_tienda ON facturas_proveedores(id_tienda, fecha_factura);
CREATE INDEX idx_facturas_ingrediente ON facturas_proveedores(id_ingrediente);
CREATE INDEX idx_movimientos_tienda_fecha ON movimientos_inventario(id_tienda, fecha);
CREATE INDEX idx_movimientos_item ON movimientos_inventario(id_item);
CREATE INDEX idx_liquidaciones_tienda_mes ON liquidaciones_mensuales(id_tienda, mes);
CREATE INDEX idx_auditorias_tienda ON auditorias(id_tienda, fecha);
CREATE INDEX idx_auditoria_respuestas_auditoria ON auditoria_respuestas(id_auditoria);
CREATE INDEX idx_solicitudes_estado ON solicitudes_franquicia(estado);
CREATE INDEX idx_tickets_tienda ON tickets_soporte(id_tienda);
CREATE INDEX idx_roi_campana ON roi_marketing_tienda(id_campana);
CREATE INDEX idx_roi_tienda ON roi_marketing_tienda(id_tienda);
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
