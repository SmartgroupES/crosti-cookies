// =============================================================
// CROSTI COOKIES PWA — Cloudflare Worker Backend
// Arquitectura: Pages _worker.js (API + Static Assets)
// Auth: JWT HS256 via Web Crypto API (sin dependencias)
// Bindings: CC_DB (D1), CC_IMAGES (R2), JWT_SECRET (env var)
// =============================================================

// ─── CORS HEADERS ────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function errRes(msg, status = 400) {
  return jsonRes({ error: msg }, status);
}

// ─── JWT HELPERS (HS256 via Web Crypto) ──────────────────────
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function getHMACKey(secret) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign', 'verify']
  );
}

async function signJWT(payload, secret) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getHMACKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

async function verifyJWT(token, secret) {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const key = await getHMACKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      b64urlDecode(sig),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────
async function authMiddleware(request, env, requiredRole = null) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return { user: null, error: 'Token requerido' };

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return { user: null, error: 'Token inválido o expirado' };

  // Verificar que el token no ha sido invalidado en D1
  const sesion = await env.CC_DB.prepare(
    'SELECT invalidado FROM sesiones_jwt WHERE jti = ?'
  ).bind(payload.jti).first();
  if (!sesion || sesion.invalidado) return { user: null, error: 'Sesión cerrada' };

  // Verificar rol si se requiere
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(payload.rol)) {
      return { user: null, error: 'Acceso no autorizado para este rol' };
    }
  }

  return { user: payload, error: null };
}

// ─── ALGORITMO JIT — PLAN DE HORNEADO ────────────────────────
// Media Móvil Ponderada 3 semanas por producto × hora
// Pesos: semana-1=0.50, semana-2=0.30, semana-3=0.20
// Tandas cada 90 minutos. Output: unidades/tanda
async function calcularPlanJIT(env, id_tienda, hora_actual) {
  const hoy = new Date().toISOString().split('T')[0];
  const pesos = [0.50, 0.30, 0.20];
  const fechas = pesos.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 7 * (i + 1));
    return d.toISOString().split('T')[0];
  });

  // Factor de día de la semana (viernes=5, sábado=6 → +15%; lunes=1 → -10%)
  const dow = new Date().getDay();
  const factorDia = dow === 5 || dow === 6 ? 1.15 : dow === 1 ? 0.90 : 1.00;

  // Consultar ventas de las 3 semanas equivalentes (±1h de la hora actual)
  const resultados = [];

  for (let i = 0; i < pesos.length; i++) {
    // Buscar misma semana (lunes anterior × i)
    const fechaRef = fechas[i];
    const { results } = await env.CC_DB.prepare(`
      SELECT id_producto, SUM(cantidad) as total
      FROM ventas_detalladas
      WHERE id_tienda = ? AND fecha = ? AND hora = ?
      GROUP BY id_producto
    `).bind(id_tienda, fechaRef, hora_actual).all();
    resultados.push({ peso: pesos[i], datos: results || [] });
  }

  // Obtener catálogo de productos horneables (galletas únicamente)
  const { results: productos } = await env.CC_DB.prepare(`
    SELECT id_producto, nombre, peso_unidad_g
    FROM productos
    WHERE activo = 1 AND categoria IN ('Clasica','Deluxe')
    ORDER BY orden_display
  `).all();

  // Calcular media ponderada por producto
  const plan = productos.map(prod => {
    let mediaH = 0;
    for (const semana of resultados) {
      const entrada = semana.datos.find(r => r.id_producto === prod.id_producto);
      mediaH += semana.peso * (entrada ? entrada.total : 0);
    }

    // Unidades para tanda de 90 min = media horaria × 1.5 × factor día
    // Safety stock: mínimo 6 unidades si hay histórico positivo
    const baseUnidades = Math.ceil(mediaH * 1.5 * factorDia);
    const unidadesTanda = mediaH > 0 ? Math.max(baseUnidades, 6) : 0;

    // Tiempo de horno estimado: 11 min precalentado + 13 min horneado = 24 min
    // → Iniciar hornada X min antes del pico previsto
    const minutosAlerta = 25;
    const horaInicioHorno = new Date();
    horaInicioHorno.setMinutes(horaInicioHorno.getMinutes() - minutosAlerta);

    return {
      id_producto: prod.id_producto,
      nombre: prod.nombre,
      unidades_tanda: unidadesTanda,
      minutos_horno: 24,
      hora_inicio_hornado: horaInicioHorno.toTimeString().slice(0, 5),
      media_historica_hora: Math.round(mediaH * 100) / 100,
      factor_dia: factorDia,
    };
  }).filter(p => p.unidades_tanda > 0);

  return { hora_actual, plan, fecha: hoy, tienda: id_tienda };
}

// ─── VALIDADOR DE MERMAS (Alerta >2.5%) ──────────────────────
async function validarMermasCierre(env, id_tienda, fecha) {
  // Producción total del día (ventas + mermas como proxy de producción)
  const { results: ventas } = await env.CC_DB.prepare(`
    SELECT SUM(cantidad) as total_vendido
    FROM ventas_detalladas
    WHERE id_tienda = ? AND fecha = ?
  `).bind(id_tienda, fecha).all();

  const { results: mermas } = await env.CC_DB.prepare(`
    SELECT SUM(cantidad_ud) as total_merma
    FROM control_mermas
    WHERE id_tienda = ? AND fecha = ?
  `).bind(id_tienda, fecha).all();

  const totalVendido = ventas[0]?.total_vendido || 0;
  const totalMerma = mermas[0]?.total_merma || 0;
  const totalProduccion = totalVendido + totalMerma;
  const pctMerma = totalProduccion > 0 ? (totalMerma / totalProduccion) * 100 : 0;

  return {
    total_vendido: totalVendido,
    total_merma: totalMerma,
    total_produccion: totalProduccion,
    pct_merma: Math.round(pctMerma * 100) / 100,
    requiere_foto: pctMerma > 2.5,
    umbral_pct: 2.5,
  };
}

// ─── ROUTER PRINCIPAL ─────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    try {
      // ══════════════════════════════════════════════════════
      // AUTH ENDPOINTS (públicos)
      // ══════════════════════════════════════════════════════

      // POST /api/auth/login
      if (request.method === 'POST' && path === '/api/auth/login') {
        const { email, password } = await request.json();
        if (!email || !password) return errRes('Email y contraseña requeridos');

        const usuario = await env.CC_DB.prepare(
          'SELECT * FROM usuarios WHERE email = ? AND activo = 1'
        ).bind(email.toLowerCase().trim()).first();

        if (!usuario) return errRes('Credenciales incorrectas', 401);

        const hashInput = `${password}:${usuario.salt}`;
        const hash = await sha256(hashInput);

        if (hash !== usuario.password_hash) return errRes('Credenciales incorrectas', 401);

        // Emitir JWT (8 horas)
        const jti = crypto.randomUUID();
        const now = Math.floor(Date.now() / 1000);
        const exp = now + 28800; // 8h

        const payload = {
          jti, sub: usuario.id, email: usuario.email,
          nombre: usuario.nombre, rol: usuario.rol,
          id_tienda: usuario.id_tienda, iat: now, exp,
        };

        const token = await signJWT(payload, env.JWT_SECRET);

        // Registrar sesión en D1
        await env.CC_DB.prepare(`
          INSERT INTO sesiones_jwt (jti, id_usuario, emitido_en, expira_en, ip_origen, user_agent)
          VALUES (?, ?, datetime('now'), datetime('now', '+8 hours'), ?, ?)
        `).bind(
          jti, usuario.id,
          request.headers.get('CF-Connecting-IP') || '',
          request.headers.get('User-Agent') || ''
        ).run();

        // Actualizar último login
        await env.CC_DB.prepare(
          "UPDATE usuarios SET ultimo_login = datetime('now') WHERE id = ?"
        ).bind(usuario.id).run();

        return jsonRes({ token, rol: usuario.rol, id_tienda: usuario.id_tienda, nombre: usuario.nombre });
      }

      // POST /api/auth/logout
      if (request.method === 'POST' && path === '/api/auth/logout') {
        const { user } = await authMiddleware(request, env);
        if (user) {
          await env.CC_DB.prepare(
            'UPDATE sesiones_jwt SET invalidado = 1 WHERE jti = ?'
          ).bind(user.jti).run();
        }
        return jsonRes({ success: true });
      }

      // POST /api/auth/register (SOLO ADMIN)
      if (request.method === 'POST' && path === '/api/auth/register') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const { email, nombre, password, rol, id_tienda } = await request.json();
        if (!email || !nombre || !password || !rol) return errRes('Campos requeridos');

        const salt = crypto.randomUUID();
        const hash = await sha256(`${password}:${salt}`);

        await env.CC_DB.prepare(`
          INSERT INTO usuarios (email, nombre, password_hash, salt, rol, id_tienda)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(email.toLowerCase(), nombre, hash, salt, rol, id_tienda || null).run();

        return jsonRes({ success: true, message: `Usuario ${email} creado` }, 201);
      }

      // GET /api/usuarios — Listar todos los usuarios (ADMIN)
      if (request.method === 'GET' && path === '/api/usuarios') {
        try {
          const { user, error } = await authMiddleware(request, env, 'ADMIN');
          if (error) return errRes(error, 401);

          const dbRes = await env.CC_DB.prepare(`
            SELECT id, email, nombre, rol, id_tienda, activo,
                   ultimo_login, creado_en
            FROM usuarios
            ORDER BY activo DESC, rol ASC, nombre ASC
          `).all();
          
          return jsonRes(dbRes.results || []);
        } catch (e) {
          return errRes(e.message, 500);
        }
      }

      // PATCH /api/usuarios/:id — Editar usuario (ADMIN)
      if (request.method === 'PATCH' && path.match(/^\/api\/usuarios\/[^/]+$/) && !path.endsWith('/estado')) {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const id_target = path.split('/').pop();
        const { nombre, rol, id_tienda, password } = await request.json();

        if (password) {
          const salt = crypto.randomUUID();
          const hash = await sha256(`${password}:${salt}`);
          await env.CC_DB.prepare(
            'UPDATE usuarios SET password_hash = ?, salt = ? WHERE id = ?'
          ).bind(hash, salt, id_target).run();
        }

        await env.CC_DB.prepare(`
          UPDATE usuarios SET nombre = ?, rol = ?, id_tienda = ? WHERE id = ?
        `).bind(nombre, rol, id_tienda || null, id_target).run();

        return jsonRes({ success: true });
      }

      // PATCH /api/usuarios/:id/estado — Activar/inactivar usuario (ADMIN)
      if (request.method === 'PATCH' && path.match(/^\/api\/usuarios\/[^/]+\/estado$/)) {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const id_target = path.split('/')[3];
        if (id_target === user.sub) return errRes('No puedes modificar tu propio estado', 403);

        const { activo } = await request.json();
        await env.CC_DB.prepare(
          'UPDATE usuarios SET activo = ? WHERE id = ?'
        ).bind(activo ? 1 : 0, id_target).run();

        return jsonRes({ success: true });
      }

      // DELETE /api/usuarios/:id — Eliminar usuario (ADMIN)
      if (request.method === 'DELETE' && path.match(/^\/api\/usuarios\/[^/]+$/)) {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const id_target = path.split('/').pop();
        if (id_target === user.sub) return errRes('No puedes eliminarte a ti mismo', 403);

        await env.CC_DB.prepare('DELETE FROM sesiones_jwt WHERE user_id = ?').bind(id_target).run();
        await env.CC_DB.prepare('DELETE FROM usuarios WHERE id = ?').bind(id_target).run();

        return jsonRes({ success: true });
      }

      // ══════════════════════════════════════════════════════
      // ENDPOINTS OPERARIO — Plan JIT + Mermas + Inventario
      // ══════════════════════════════════════════════════════

      // GET /api/horneado/plan?hora=14
      if (request.method === 'GET' && path === '/api/horneado/plan') {
        const { user, error } = await authMiddleware(request, env, ['OPERARIO', 'FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const id_tienda = user.rol === 'ADMIN'
          ? (url.searchParams.get('tienda') || 'BCN-01')
          : user.id_tienda;
        const hora = parseInt(url.searchParams.get('hora') ?? new Date().getHours());

        const plan = await calcularPlanJIT(env, id_tienda, hora);
        return jsonRes(plan);
      }

      // POST /api/mermas — Registrar merma
      if (request.method === 'POST' && path === '/api/mermas') {
        const { user, error } = await authMiddleware(request, env, ['OPERARIO', 'FRANQUICIADO']);
        if (error) return errRes(error, 401);

        const body = await request.json();
        const { id_producto, cantidad_ud, motivo, notas, url_foto_r2, peso_g } = body;

        if (!id_producto || !cantidad_ud || !motivo) {
          return errRes('id_producto, cantidad_ud y motivo son requeridos');
        }

        const fecha = new Date().toISOString().split('T')[0];
        const id_tienda = user.id_tienda;

        // Verificar si ya existe merma de este producto/motivo hoy y hacer UPSERT
        await env.CC_DB.prepare(`
          INSERT INTO control_mermas (id_tienda, fecha, id_producto, cantidad_ud, peso_g, motivo, url_foto_r2, operario_id, notas)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id_tienda, fecha, id_producto, motivo)
          DO UPDATE SET cantidad_ud = excluded.cantidad_ud, peso_g = excluded.peso_g,
                        url_foto_r2 = excluded.url_foto_r2, notas = excluded.notas
        `).bind(id_tienda, fecha, id_producto, cantidad_ud, peso_g || null, motivo, url_foto_r2 || null, user.sub, notas || null).run();

        return jsonRes({ success: true });
      }

      // POST /api/mermas/foto — Upload foto merma a R2
      if (request.method === 'POST' && path === '/api/mermas/foto') {
        const { user, error } = await authMiddleware(request, env, ['OPERARIO', 'FRANQUICIADO']);
        if (error) return errRes(error, 401);

        const formData = await request.formData();
        const foto = formData.get('foto');

        if (!foto) return errRes('Foto requerida');
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(foto.type)) {
          return errRes('Solo se aceptan imágenes JPEG, PNG o WebP');
        }
        if (foto.size > 10 * 1024 * 1024) return errRes('Imagen demasiado grande (máx 10MB)');

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const id_tienda = user.id_tienda;
        const ext = foto.type === 'image/png' ? 'png' : foto.type === 'image/webp' ? 'webp' : 'jpg';
        const key = `${id_tienda}/${yyyy}/${mm}/${dd}_merma.${ext}`;

        await env.CC_IMAGES.put(key, foto.stream(), {
          httpMetadata: { contentType: foto.type },
          customMetadata: { subido_por: user.email, tienda: id_tienda, fecha: `${yyyy}-${mm}-${dd}` }
        });

        return jsonRes({ success: true, url_foto_r2: key });
      }

      // GET /api/mermas/validar — Verificar estado cierre (requiere foto si >2.5%)
      if (request.method === 'GET' && path === '/api/mermas/validar') {
        const { user, error } = await authMiddleware(request, env, ['OPERARIO', 'FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const id_tienda = user.id_tienda || url.searchParams.get('tienda');
        const fecha = url.searchParams.get('fecha') || new Date().toISOString().split('T')[0];

        const validacion = await validarMermasCierre(env, id_tienda, fecha);
        return jsonRes(validacion);
      }

      // POST /api/inventario/cierre — Registrar inventario de cierre
      if (request.method === 'POST' && path === '/api/inventario/cierre') {
        const { user, error } = await authMiddleware(request, env, ['OPERARIO', 'FRANQUICIADO']);
        if (error) return errRes(error, 401);

        const { items, validar_merma } = await request.json();
        if (!items || !Array.isArray(items)) return errRes('items requerido como array');

        const fecha = new Date().toISOString().split('T')[0];
        const id_tienda = user.id_tienda;

        // Validar mermas antes de permitir cierre
        if (validar_merma !== false) {
          const validacion = await validarMermasCierre(env, id_tienda, fecha);
          if (validacion.requiere_foto) {
            const { results: mermasSinFoto } = await env.CC_DB.prepare(`
              SELECT COUNT(*) as cnt FROM control_mermas
              WHERE id_tienda = ? AND fecha = ? AND url_foto_r2 IS NULL
            `).bind(id_tienda, fecha).all();

            if (mermasSinFoto[0]?.cnt > 0) {
              return jsonRes({
                bloqueado: true,
                mensaje: `⚠️ Merma del ${validacion.pct_merma}% supera el umbral del 2.5%. Se requiere fotografía del contenedor de mermas para proceder al cierre.`,
                validacion,
              }, 422);
            }
          }
        }

        // Insertar inventario
        for (const item of items) {
          await env.CC_DB.prepare(`
            INSERT INTO inventarios_diarios (id_tienda, fecha, id_ingrediente, stock_apertura, entradas_dia, consumo_teorico, stock_fisico, operario_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id_tienda, fecha, id_ingrediente)
            DO UPDATE SET stock_fisico = excluded.stock_fisico, entradas_dia = excluded.entradas_dia
          `).bind(
            id_tienda, fecha, item.id_ingrediente,
            item.stock_apertura || null, item.entradas_dia || 0,
            item.consumo_teorico || null, item.stock_fisico, user.sub
          ).run();
        }

        return jsonRes({ success: true, fecha, items_registrados: items.length });
      }

      // ══════════════════════════════════════════════════════
      // ENDPOINTS FRANQUICIADO — KPIs + Dashboard + Facturas
      // ══════════════════════════════════════════════════════

      // GET /api/dashboard/tienda/:id — KPIs del día
      if (request.method === 'GET' && path.startsWith('/api/dashboard/tienda/')) {
        const { user, error } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const id_tienda_req = path.replace('/api/dashboard/tienda/', '');

        // Franquiciado solo puede ver su propia tienda
        if (user.rol === 'FRANQUICIADO' && user.id_tienda !== id_tienda_req) {
          return errRes('Acceso denegado a datos de otra tienda', 403);
        }

        const fecha = url.searchParams.get('fecha') || new Date().toISOString().split('T')[0];

        // KPIs del día desde la vista
        const kpi = await env.CC_DB.prepare(
          'SELECT * FROM v_kpis_diarios WHERE id_tienda = ? AND fecha = ?'
        ).bind(id_tienda_req, fecha).first();

        // Ventas por hora (curva del día)
        const { results: ventasHora } = await env.CC_DB.prepare(`
          SELECT hora, SUM(total_linea) as ventas_eu, SUM(cantidad) as unidades
          FROM ventas_detalladas
          WHERE id_tienda = ? AND fecha = ?
          GROUP BY hora ORDER BY hora
        `).bind(id_tienda_req, fecha).all();

        // Top 5 productos del día
        const { results: topProductos } = await env.CC_DB.prepare(`
          SELECT vd.id_producto, p.nombre, SUM(vd.cantidad) as unidades, SUM(vd.total_linea) as ventas_eu
          FROM ventas_detalladas vd JOIN productos p ON vd.id_producto = p.id_producto
          WHERE vd.id_tienda = ? AND vd.fecha = ?
          GROUP BY vd.id_producto ORDER BY ventas_eu DESC LIMIT 5
        `).bind(id_tienda_req, fecha).all();

        // Personal del día
        const { results: personal } = await env.CC_DB.prepare(`
          SELECT u.nombre, gp.turno, gp.hora_entrada, gp.hora_salida, gp.horas_trabajadas, gp.kpi_ventas_hora
          FROM gestion_personal gp JOIN usuarios u ON gp.id_operario = u.id
          WHERE gp.id_tienda = ? AND gp.fecha = ?
          ORDER BY gp.hora_entrada
        `).bind(id_tienda_req, fecha).all();

        return jsonRes({ fecha, kpi, ventas_hora: ventasHora, top_productos: topProductos, personal });
      }

      // GET /api/kpis/mensual/:id — KPIs mensuales
      if (request.method === 'GET' && path.startsWith('/api/kpis/mensual/')) {
        const { user, error } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const id_tienda_req = path.replace('/api/kpis/mensual/', '');
        if (user.rol === 'FRANQUICIADO' && user.id_tienda !== id_tienda_req) {
          return errRes('Acceso denegado', 403);
        }

        const mes = url.searchParams.get('mes') || new Date().toISOString().slice(0, 7); // YYYY-MM

        const { results } = await env.CC_DB.prepare(`
          SELECT
            fecha,
            SUM(total_linea) as ventas_eu,
            COUNT(DISTINCT id_venta) as tickets,
            SUM(cantidad) as unidades
          FROM ventas_detalladas
          WHERE id_tienda = ? AND fecha LIKE ?
          GROUP BY fecha ORDER BY fecha
        `).bind(id_tienda_req, `${mes}%`).all();

        // Food cost real del mes (facturas vs ventas)
        const { results: facturas } = await env.CC_DB.prepare(`
          SELECT SUM(total_factura) as total_compras
          FROM facturas_proveedores
          WHERE id_tienda = ? AND fecha_factura LIKE ?
        `).bind(id_tienda_req, `${mes}%`).all();

        const ventas_total = results.reduce((a, r) => a + r.ventas_eu, 0);
        const compras_total = facturas[0]?.total_compras || 0;
        const food_cost_real = ventas_total > 0 ? (compras_total / ventas_total) * 100 : 0;

        return jsonRes({
          mes, tienda: id_tienda_req,
          ventas_diarias: results,
          resumen: {
            ventas_total_eu: Math.round(ventas_total * 100) / 100,
            compras_total_eu: Math.round(compras_total * 100) / 100,
            food_cost_real_pct: Math.round(food_cost_real * 100) / 100,
            dias_con_ventas: results.length,
          }
        });
      }

      // POST /api/facturas — Registrar factura proveedor
      if (request.method === 'POST' && path === '/api/facturas') {
        const { user, error } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const body = await request.json();
        const { proveedor, numero_factura, fecha_factura, id_ingrediente, cantidad, unidad, precio_real_unitario, total_factura } = body;

        if (!proveedor || !numero_factura || !fecha_factura || !total_factura) {
          return errRes('Campos requeridos: proveedor, numero_factura, fecha_factura, total_factura');
        }

        const id_tienda = user.id_tienda || body.id_tienda;

        await env.CC_DB.prepare(`
          INSERT INTO facturas_proveedores (id_tienda, proveedor, numero_factura, fecha_factura, id_ingrediente, cantidad, unidad, precio_real_unitario, total_factura, registrado_por)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id_tienda, proveedor, numero_factura, fecha_factura,
          id_ingrediente || null, cantidad || 0, unidad || 'ud',
          precio_real_unitario || 0, total_factura, user.sub
        ).run();

        return jsonRes({ success: true }, 201);
      }

      // POST /api/personal/turno — Registrar turno
      if (request.method === 'POST' && path === '/api/personal/turno') {
        const { user, error } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const { id_operario, fecha, turno, hora_entrada, hora_salida, ventas_periodo } = await request.json();
        const id_tienda = user.id_tienda || (await request.json().id_tienda);

        const horas = hora_salida
          ? (() => {
              const [eh, em] = hora_entrada.split(':').map(Number);
              const [sh, sm] = hora_salida.split(':').map(Number);
              return ((sh * 60 + sm) - (eh * 60 + em)) / 60;
            })()
          : null;

        await env.CC_DB.prepare(`
          INSERT INTO gestion_personal (id_tienda, id_operario, fecha, turno, hora_entrada, hora_salida, horas_trabajadas, ventas_periodo)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id_tienda, id_operario, fecha, turno)
          DO UPDATE SET hora_salida = excluded.hora_salida, horas_trabajadas = excluded.horas_trabajadas, ventas_periodo = excluded.ventas_periodo
        `).bind(user.id_tienda, id_operario, fecha, turno, hora_entrada, hora_salida || null, horas, ventas_periodo || 0).run();

        return jsonRes({ success: true });
      }

      // ══════════════════════════════════════════════════════
      // ENDPOINTS ADMIN — Global + Escandallos + CRM
      // ══════════════════════════════════════════════════════

      // GET /api/dashboard/global — Panel consolidado multi-tienda
      if (request.method === 'GET' && path === '/api/dashboard/global') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const fecha = url.searchParams.get('fecha') || new Date().toISOString().split('T')[0];

        const { results: kpis } = await env.CC_DB.prepare(`
          SELECT
            t.id_tienda,
            t.nombre AS tienda,
            ? AS fecha,
            COALESCE(k.num_tickets, 0)       AS num_tickets,
            COALESCE(k.unidades_vendidas, 0) AS unidades_vendidas,
            COALESCE(k.ventas_netas_eu, 0)   AS ventas_netas_eu,
            COALESCE(k.ticket_medio, 0)      AS ticket_medio,
            COALESCE(k.mermas_eu, 0)         AS mermas_eu,
            COALESCE(k.horas_hombre, 0)      AS horas_hombre
          FROM tiendas t
          LEFT JOIN v_kpis_diarios k
            ON k.id_tienda = t.id_tienda AND k.fecha = ?
          WHERE t.activo = 1
          ORDER BY t.id_tienda
        `).bind(fecha, fecha).all();

        const { results: foodCost } = await env.CC_DB.prepare(
          'SELECT * FROM v_food_cost_teorico ORDER BY id_producto'
        ).all();

        // Mermas por tienda
        const { results: mermas } = await env.CC_DB.prepare(`
          SELECT id_tienda, SUM(cantidad_ud) as total_ud, SUM(coste_economico) as total_eu
          FROM control_mermas WHERE fecha = ?
          GROUP BY id_tienda
        `).bind(fecha).all();

        // Total nacional del día
        const totalVentas = kpis.reduce((a, k) => a + (k.ventas_netas_eu || 0), 0);
        const totalTickets = kpis.reduce((a, k) => a + (k.num_tickets || 0), 0);

        return jsonRes({
          fecha,
          kpis_tiendas: kpis,
          mermas_tiendas: mermas,
          food_cost_teorico: foodCost,
          consolidado: {
            ventas_netas_eu: Math.round(totalVentas * 100) / 100,
            total_tickets: totalTickets,
            ticket_medio_red: totalTickets > 0 ? Math.round((totalVentas / totalTickets) * 100) / 100 : 0,
            tiendas_activas: kpis.length,
          }
        });
      }

      // GET /api/escandallos — Listar escandallos con food cost calculado
      if (request.method === 'GET' && path === '/api/escandallos') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const { results } = await env.CC_DB.prepare(
          'SELECT * FROM v_food_cost_teorico ORDER BY id_producto'
        ).all();

        return jsonRes(results);
      }

      // GET /api/escandallos/:id/detalle — Detalle completo de receta
      if (request.method === 'GET' && /^\/api\/escandallos\/[^/]+\/detalle$/.test(path)) {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const id_producto = path.replace('/api/escandallos/', '').replace('/detalle', '');

        const producto = await env.CC_DB.prepare(
          'SELECT * FROM productos WHERE id_producto = ?'
        ).bind(id_producto).first();
        if (!producto) return errRes('Producto no encontrado', 404);

        const { results: lineas } = await env.CC_DB.prepare(`
          SELECT e.id, e.id_ingrediente, i.nombre AS nombre_ingrediente,
                 i.categoria, e.cantidad, e.unidad, e.fase, e.activo,
                 i.coste_por_unidad,
                 ROUND(e.cantidad * CASE e.unidad
                   WHEN 'g'  THEN i.coste_por_unidad / 1000.0
                   WHEN 'ml' THEN i.coste_por_unidad / 1000.0
                   ELSE i.coste_por_unidad END, 5) AS coste_linea
          FROM escandallos e
          JOIN ingredientes i ON e.id_ingrediente = i.id_ingrediente
          WHERE e.id_producto = ? AND e.activo = 1
          ORDER BY e.fase, i.nombre
        `).bind(id_producto).all();

        const coste_total = lineas.reduce((s, l) => s + (l.coste_linea || 0), 0);
        const food_cost_pct = producto.pvp_directo > 0
          ? Math.round((coste_total / producto.pvp_directo) * 10000) / 100 : 0;

        return jsonRes({ producto, lineas, coste_total: Math.round(coste_total * 10000) / 10000, food_cost_pct });
      }

      // POST /api/escandallos — Crear nueva receta (producto + líneas)
      if (request.method === 'POST' && path === '/api/escandallos') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const { producto, lineas } = await request.json();
        const { id_producto, nombre, categoria, pvp_directo, pvp_ubereats, food_cost_obj_min, food_cost_obj_max, descripcion, peso_unidad_g } = producto || {};

        if (!id_producto || !nombre || !categoria || pvp_directo === undefined) {
          return errRes('Campos requeridos del producto: id_producto, nombre, categoria, pvp_directo');
        }

        const existing = await env.CC_DB.prepare(
          'SELECT id_producto FROM productos WHERE id_producto = ?'
        ).bind(id_producto).first();
        if (existing) return errRes(`El ID ${id_producto} ya existe`, 409);

        await env.CC_DB.prepare(`
          INSERT INTO productos (id_producto, nombre, categoria, descripcion, peso_unidad_g, pvp_directo, pvp_ubereats, food_cost_obj_min, food_cost_obj_max, activo, orden_display)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 99)
        `).bind(id_producto, nombre, categoria, descripcion || null, peso_unidad_g || null,
          pvp_directo, pvp_ubereats || null, food_cost_obj_min || null, food_cost_obj_max || null).run();

        if (Array.isArray(lineas) && lineas.length > 0) {
          for (const l of lineas) {
            if (!l.id_ingrediente || !l.cantidad || !l.unidad) continue;
            await env.CC_DB.prepare(`
              INSERT INTO escandallos (id_producto, id_ingrediente, cantidad, unidad, fase, activo)
              VALUES (?, ?, ?, ?, ?, 1)
            `).bind(id_producto, l.id_ingrediente, l.cantidad, l.unidad, l.fase || 'Masa').run();
          }
        }

        return jsonRes({ success: true, id_producto }, 201);
      }

      // POST /api/escandallos/:id/lineas — Añadir línea de ingrediente a receta existente
      if (request.method === 'POST' && /^\/api\/escandallos\/[^/]+\/lineas$/.test(path)) {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const id_producto = path.replace('/api/escandallos/', '').replace('/lineas', '');
        const { id_ingrediente, cantidad, unidad, fase } = await request.json();

        if (!id_ingrediente || !cantidad || !unidad) {
          return errRes('Campos requeridos: id_ingrediente, cantidad, unidad');
        }

        const { meta } = await env.CC_DB.prepare(`
          INSERT INTO escandallos (id_producto, id_ingrediente, cantidad, unidad, fase, activo)
          VALUES (?, ?, ?, ?, ?, 1)
        `).bind(id_producto, id_ingrediente, cantidad, unidad, fase || 'Masa').run();

        return jsonRes({ success: true, id: meta.last_row_id }, 201);
      }

      // DELETE /api/escandallos/linea/:id — Eliminar línea de ingrediente (soft)
      if (request.method === 'DELETE' && path.startsWith('/api/escandallos/linea/')) {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const id_linea = path.replace('/api/escandallos/linea/', '');
        await env.CC_DB.prepare(
          `UPDATE escandallos SET activo = 0, actualizado_en = datetime('now') WHERE id = ?`
        ).bind(id_linea).run();

        return jsonRes({ success: true });
      }

      // PUT /api/escandallos/:id_producto — Actualizar cantidades de líneas
      if (request.method === 'PUT' && path.startsWith('/api/escandallos/') && !path.includes('/lineas') && !path.includes('/detalle') && !path.includes('/linea/')) {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const id_producto = path.replace('/api/escandallos/', '');
        const body = await request.json();

        // Modo: actualizar producto + cantidades de líneas
        if (body.producto) {
          const p = body.producto;
          await env.CC_DB.prepare(`
            UPDATE productos SET nombre = ?, categoria = ?, descripcion = ?, peso_unidad_g = ?,
              pvp_directo = ?, pvp_ubereats = ?, food_cost_obj_min = ?, food_cost_obj_max = ?
            WHERE id_producto = ?
          `).bind(p.nombre, p.categoria, p.descripcion || null, p.peso_unidad_g || null,
            p.pvp_directo, p.pvp_ubereats || null, p.food_cost_obj_min || null, p.food_cost_obj_max || null, id_producto).run();
        }

        if (Array.isArray(body.updates)) {
          for (const upd of body.updates) {
            await env.CC_DB.prepare(`
              UPDATE escandallos SET cantidad = ?, unidad = ?, fase = ?, actualizado_en = datetime('now')
              WHERE id = ? AND id_producto = ?
            `).bind(upd.cantidad, upd.unidad, upd.fase, upd.id, id_producto).run();
          }
        }

        return jsonRes({ success: true });
      }

      // DELETE /api/escandallos/:id_producto — Soft-delete receta + producto
      if (request.method === 'DELETE' && path.startsWith('/api/escandallos/') && !path.includes('/linea/')) {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const id_producto = path.replace('/api/escandallos/', '');

        await env.CC_DB.prepare(
          `UPDATE productos SET activo = 0 WHERE id_producto = ?`
        ).bind(id_producto).run();
        await env.CC_DB.prepare(
          `UPDATE escandallos SET activo = 0, actualizado_en = datetime('now') WHERE id_producto = ?`
        ).bind(id_producto).run();

        return jsonRes({ success: true, id_producto });
      }
      
      // ─── API REPORTES ────────────────────────────────────────────────
      // GET /api/reportes/:tipo
      if (request.method === 'GET' && path.startsWith('/api/reportes/')) {
        const { error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);
        
        const tipo = path.replace('/api/reportes/', '');
        const urlObj = new URL(request.url);
        const tienda = urlObj.searchParams.get('tienda');
        const desde = urlObj.searchParams.get('desde');
        const hasta = urlObj.searchParams.get('hasta');

        let data = [];
        try {
          if (tipo === 'ventas') {
            let q = "SELECT id_tienda, fecha, hora, id_producto, cantidad, total_linea, canal FROM ventas_detalladas WHERE fecha >= ? AND fecha <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda = ?"; params.push(tienda); }
            data = (await env.CC_DB.prepare(q).bind(...params).all()).results;
          } 
          else if (tipo === 'inventario') {
            let q = "SELECT * FROM movimientos_inventario WHERE fecha >= ? AND fecha <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda = ?"; params.push(tienda); }
            data = (await env.CC_DB.prepare(q + " ORDER BY fecha DESC, hora DESC").bind(...params).all()).results;
          }
          else if (tipo === 'mermas') {
            let q = "SELECT id_tienda, fecha, id_producto, cantidad_ud, peso_g, motivo, coste_economico FROM control_mermas WHERE fecha >= ? AND fecha <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda = ?"; params.push(tienda); }
            data = (await env.CC_DB.prepare(q).bind(...params).all()).results;
          }
          else if (tipo === 'personal') {
            let q = "SELECT id_tienda, id_operario, fecha, turno, hora_entrada, hora_salida, horas_trabajadas, ventas_periodo FROM gestion_personal WHERE fecha >= ? AND fecha <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda = ?"; params.push(tienda); }
            data = (await env.CC_DB.prepare(q).bind(...params).all()).results;
          }
          else if (tipo === 'food_cost') {
            // Este reporte es general, no depende de fechas, se extrae la vista teórica actual
            data = (await env.CC_DB.prepare("SELECT * FROM v_food_cost_teorico").all()).results;
          }
          else if (tipo === 'crm') {
            let q = "SELECT id_cliente, nombre, email, segmento, total_visitas, gasto_total_eu, ticket_medio FROM crm_clientes WHERE fecha_registro >= ? AND fecha_registro <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda_origen = ?"; params.push(tienda); }
            data = (await env.CC_DB.prepare(q).bind(...params).all()).results;
          }
          else if (tipo === 'compras') {
            let q = "SELECT id_tienda, proveedor, numero_factura, fecha_factura, id_ingrediente, cantidad, total_factura FROM facturas_proveedores WHERE fecha_factura >= ? AND fecha_factura <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda = ?"; params.push(tienda); }
            data = (await env.CC_DB.prepare(q).bind(...params).all()).results;
          }
          else {
            return errRes('Tipo de reporte no válido', 400);
          }
          
          return jsonRes(data);
        } catch (e) {
          return errRes(e.message, 500);
        }
      }

      // ─── API INVENTARIO & PROVEEDORES ──────────────────────────────────
      // GET /api/proveedores
      if (request.method === 'GET' && path === '/api/proveedores') {
        const { error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);
        const { results } = await env.CC_DB.prepare('SELECT * FROM proveedores ORDER BY nombre').all();
        return jsonRes(results);
      }

      // POST /api/proveedores
      if (request.method === 'POST' && path === '/api/proveedores') {
        const { error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);
        const { nombre, contacto, telefono, email, condiciones } = await request.json();
        if (!nombre) return errRes('Nombre requerido');
        
        await env.CC_DB.prepare(`
          INSERT INTO proveedores (nombre, contacto, telefono, email, condiciones)
          VALUES (?, ?, ?, ?, ?)
        `).bind(nombre, contacto || null, telefono || null, email || null, condiciones || null).run();
        return jsonRes({ success: true }, 201);
      }

      // GET /api/inventario/stock/:id_tienda
      if (request.method === 'GET' && path.startsWith('/api/inventario/stock/')) {
        const { error } = await authMiddleware(request, env);
        if (error) return errRes(error, 401);
        const id_tienda = path.replace('/api/inventario/stock/', '');
        const { results } = await env.CC_DB.prepare(`
          SELECT * FROM inventario_actual WHERE id_tienda = ? ORDER BY tipo_item, estado
        `).bind(id_tienda).all();
        return jsonRes(results);
      }

      // GET /api/inventario/movimientos/:id_tienda
      if (request.method === 'GET' && path.startsWith('/api/inventario/movimientos/')) {
        const { error } = await authMiddleware(request, env);
        if (error) return errRes(error, 401);
        const id_tienda = path.replace('/api/inventario/movimientos/', '');
        const { results } = await env.CC_DB.prepare(`
          SELECT * FROM movimientos_inventario WHERE id_tienda = ? ORDER BY fecha DESC, hora DESC LIMIT 100
        `).bind(id_tienda).all();
        return jsonRes(results);
      }

      // POST /api/inventario/transferir
      if (request.method === 'POST' && path === '/api/inventario/transferir') {
        const { user, error } = await authMiddleware(request, env);
        if (error) return errRes(error, 401);
        
        const { id_tienda, id_item, tipo_item, cantidad, unidad, origen, destino } = await request.json();
        if (!id_tienda || !id_item || !tipo_item || !cantidad || !origen || !destino) {
          return errRes('Faltan campos (id_tienda, id_item, tipo_item, cantidad, unidad, origen, destino)');
        }

        const date = new Date();
        const fecha = date.toISOString().split('T')[0];
        const hora = date.toTimeString().split(' ')[0];

        // Transacción
        const batch = [];
        
        // 1. Restar del origen
        batch.push(
          env.CC_DB.prepare(`
            UPDATE inventario_actual SET cantidad = cantidad - ?, ultima_actualizacion = ?
            WHERE id_tienda = ? AND id_item = ? AND estado = ?
          `).bind(cantidad, date.toISOString(), id_tienda, id_item, origen)
        );

        // 2. Sumar o crear en destino
        batch.push(
          env.CC_DB.prepare(`
            INSERT INTO inventario_actual (id_tienda, id_item, tipo_item, estado, cantidad, unidad, ultima_actualizacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id_tienda, id_item, estado) DO UPDATE SET 
              cantidad = cantidad + excluded.cantidad,
              ultima_actualizacion = excluded.ultima_actualizacion
          `).bind(id_tienda, id_item, tipo_item, destino, cantidad, unidad || 'ud', date.toISOString())
        );

        // 3. Registrar movimiento
        batch.push(
          env.CC_DB.prepare(`
            INSERT INTO movimientos_inventario (fecha, hora, id_tienda, id_item, tipo_item, cantidad, tipo_movimiento, origen, destino, operario_id)
            VALUES (?, ?, ?, ?, ?, ?, 'TRANSFERENCIA', ?, ?, ?)
          `).bind(fecha, hora, id_tienda, id_item, tipo_item, cantidad, origen, destino, user.id)
        );

        await env.CC_DB.batch(batch);
        return jsonRes({ success: true }, 201);
      }

      // GET /api/ingredientes — Listar todos los ingredientes activos
      if (request.method === 'GET' && path === '/api/ingredientes') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const { results } = await env.CC_DB.prepare(
          'SELECT * FROM ingredientes WHERE activo = 1 ORDER BY categoria, nombre'
        ).all();

        return jsonRes(results);
      }

      // POST /api/ingredientes — Crear nuevo ingrediente
      if (request.method === 'POST' && path === '/api/ingredientes') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const { id_ingrediente, nombre, categoria, proveedor_ref, unidad, coste_por_unidad, stock_seguridad_min } = await request.json();
        if (!id_ingrediente || !nombre || !categoria || !unidad || coste_por_unidad === undefined) {
          return errRes('Campos requeridos: id_ingrediente, nombre, categoria, unidad, coste_por_unidad');
        }

        // Verificar que el ID no existe ya
        const existing = await env.CC_DB.prepare(
          'SELECT id_ingrediente FROM ingredientes WHERE id_ingrediente = ?'
        ).bind(id_ingrediente).first();
        if (existing) return errRes(`El ID ${id_ingrediente} ya existe`, 409);

        await env.CC_DB.prepare(`
          INSERT INTO ingredientes (id_ingrediente, nombre, categoria, proveedor_ref, unidad, coste_por_unidad, stock_seguridad_min, activo)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `).bind(
          id_ingrediente, nombre, categoria,
          proveedor_ref || null, unidad,
          coste_por_unidad, stock_seguridad_min || 0
        ).run();

        return jsonRes({ success: true, id_ingrediente }, 201);
      }

      // PUT /api/ingredientes/:id — Actualizar ingrediente completo
      if (request.method === 'PUT' && path.startsWith('/api/ingredientes/')) {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const id_ingrediente = path.replace('/api/ingredientes/', '');
        const body = await request.json();
        const { nombre, categoria, proveedor_ref, unidad, coste_por_unidad, stock_seguridad_min } = body;

        if (!nombre || !categoria || !unidad || coste_por_unidad === undefined) {
          return errRes('Campos requeridos: nombre, categoria, unidad, coste_por_unidad');
        }

        await env.CC_DB.prepare(`
          UPDATE ingredientes
          SET nombre = ?, categoria = ?, proveedor_ref = ?, unidad = ?,
              coste_por_unidad = ?, stock_seguridad_min = ?, actualizado_en = datetime('now')
          WHERE id_ingrediente = ?
        `).bind(
          nombre, categoria, proveedor_ref || null, unidad,
          coste_por_unidad, stock_seguridad_min || 0, id_ingrediente
        ).run();

        return jsonRes({ success: true, id_ingrediente });
      }

      // DELETE /api/ingredientes/:id — Soft-delete (activo = 0)
      if (request.method === 'DELETE' && path.startsWith('/api/ingredientes/')) {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const id_ingrediente = path.replace('/api/ingredientes/', '');

        await env.CC_DB.prepare(
          `UPDATE ingredientes SET activo = 0, actualizado_en = datetime('now') WHERE id_ingrediente = ?`
        ).bind(id_ingrediente).run();

        return jsonRes({ success: true, id_ingrediente });
      }

      // GET /api/crm — CRM Nacional VIP Club
      if (request.method === 'GET' && path === '/api/crm') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const segmento = url.searchParams.get('segmento');
        const tienda = url.searchParams.get('tienda');
        const limit = parseInt(url.searchParams.get('limit') || '100');

        let query = 'SELECT * FROM crm_clientes WHERE activo = 1';
        const params = [];
        if (segmento) { query += ' AND segmento = ?'; params.push(segmento); }
        if (tienda) { query += ' AND id_tienda_origen = ?'; params.push(tienda); }
        query += ' ORDER BY gasto_total_eu DESC LIMIT ?';
        params.push(limit);

        const { results } = await env.CC_DB.prepare(query).bind(...params).all();
        return jsonRes(results);
      }

      // POST /api/crm/cliente — Registrar cliente VIP
      if (request.method === 'POST' && path === '/api/crm/cliente') {
        const { user, error } = await authMiddleware(request, env, ['OPERARIO', 'FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const { nombre, email, telefono, fecha_nacimiento, consentimiento_marketing } = await request.json();
        if (!nombre) return errRes('Nombre requerido');

        const id_tienda_origen = user.id_tienda;

        await env.CC_DB.prepare(`
          INSERT INTO crm_clientes (nombre, email, telefono, fecha_nacimiento, id_tienda_origen, consentimiento_marketing)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(nombre, email || null, telefono || null, fecha_nacimiento || null, id_tienda_origen, consentimiento_marketing ? 1 : 0).run();

        return jsonRes({ success: true }, 201);
      }

      // GET /api/ventas/ingesta — Endpoint para ingesta automática diaria desde TPV
      if (request.method === 'POST' && path === '/api/ventas/ingesta') {
        // Endpoint semi-público: protegido con API key del TPV (no JWT)
        const apiKey = request.headers.get('X-TPV-API-Key');
        if (!apiKey || apiKey !== env.TPV_API_KEY) return errRes('API key inválida', 401);

        const { ventas, id_tienda } = await request.json();
        if (!Array.isArray(ventas) || !id_tienda) return errRes('Payload inválido');

        let insertadas = 0;
        for (const venta of ventas) {
          try {
            await env.CC_DB.prepare(`
              INSERT OR IGNORE INTO ventas_detalladas
              (id_venta, id_tienda, fecha, hora, id_producto, cantidad, precio_unitario, descuento, canal, origen_dato)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'TPV')
            `).bind(
              venta.id_venta, id_tienda, venta.fecha, venta.hora,
              venta.id_producto, venta.cantidad, venta.precio_unitario,
              venta.descuento || 0, venta.canal || 'Presencial'
            ).run();
            insertadas++;
          } catch { /* Ignorar duplicados */ }
        }

        return jsonRes({ success: true, insertadas, total_recibidas: ventas.length });
      }

      // GET /api/imagenes/:key — Servir imagen desde R2
      if (request.method === 'GET' && path.startsWith('/api/imagenes/')) {
        const { user, error } = await authMiddleware(request, env);
        if (error) return errRes(error, 401);

        const key = path.replace('/api/imagenes/', '');
        const object = await env.CC_IMAGES.get(key);
        if (!object) return new Response('Imagen no encontrada', { status: 404, headers: CORS });

        const headers = new Headers(CORS);
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        return new Response(object.body, { headers });
      }

      // ══════════════════════════════════════════════════════
      // CRON HANDLER — Tareas programadas
      // ══════════════════════════════════════════════════════

      // API not found
      if (path.startsWith('/api/')) {
        return errRes('Endpoint no encontrado', 404);
      }

      // Servir assets estáticos (HTML, CSS, JS, icons, sw.js, manifest.json)
      return env.ASSETS.fetch(request);

    } catch (e) {
      console.error('[Crosti Worker Error]', e.message, e.stack);
      return errRes(`Error interno: ${e.message}`, 500);
    }
  },

  // ── CRON TRIGGERS ────────────────────────────────────────
  async scheduled(event, env, ctx) {
    const cron = event.cron;

    // "0 6 * * *" — 07:00 CET: Reset y preparación del día
    if (cron === '0 6 * * *') {
      console.log('[Cron] Preparación diaria iniciada');
      // Limpiar sesiones expiradas
      await env.CC_DB.prepare(
        "DELETE FROM sesiones_jwt WHERE expira_en < datetime('now') OR invalidado = 1"
      ).run();
    }

    // "30 22 * * *" — 23:30 CET: Resumen nocturno y actualización de segmentos CRM
    if (cron === '30 22 * * *') {
      console.log('[Cron] Resumen nocturno iniciado');
      // Actualizar segmentos CRM basado en comportamiento
      await env.CC_DB.prepare(`
        UPDATE crm_clientes SET segmento = CASE
          WHEN total_visitas >= 20 AND gasto_total_eu >= 150 THEN 'VIP Premium'
          WHEN total_visitas >= 8 THEN 'Frecuente'
          WHEN total_visitas >= 2 THEN 'Ocasional'
          WHEN total_visitas = 0 THEN 'Inactivo'
          ELSE 'Nuevo'
        END
        WHERE activo = 1
      `).run();
    }
  }
};
