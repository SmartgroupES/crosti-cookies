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

        let kpi, ventasHora, topProductos, personal;
        
        const entorno = request.headers.get('x-entorno') || 'PROD';
        const envFilterKPI = entorno === 'PROD' ? "AND id_tienda NOT LIKE 'MAD-%'" : "AND id_tienda LIKE 'MAD-%'";
        const envFilter = entorno === 'PROD' ? "AND id_tienda NOT LIKE 'MAD-%'" : "AND id_tienda LIKE 'MAD-%'";

        if (id_tienda_req === 'TODAS') {
          kpi = await env.CC_DB.prepare(
            `SELECT SUM(ventas_netas_eu) as ventas_netas_eu, SUM(num_tickets) as num_tickets, SUM(unidades_vendidas) as unidades_vendidas, SUM(mermas_eu) as mermas_eu, SUM(horas_hombre) as horas_hombre FROM v_kpis_diarios WHERE fecha = ? ${envFilterKPI}`
          ).bind(fecha).first();
          if (kpi && kpi.num_tickets) kpi.ticket_medio = kpi.ventas_netas_eu / kpi.num_tickets;
          
          ventasHora = (await env.CC_DB.prepare(`
            SELECT hora, SUM(total_linea) as ventas_eu, SUM(cantidad) as unidades FROM ventas_detalladas
            WHERE fecha = ? ${envFilter} GROUP BY hora ORDER BY hora
          `).bind(fecha).all()).results;

          topProductos = (await env.CC_DB.prepare(`
            SELECT vd.id_producto, p.nombre, SUM(vd.cantidad) as unidades, SUM(vd.total_linea) as ventas_eu
            FROM ventas_detalladas vd JOIN productos p ON vd.id_producto = p.id_producto
            WHERE vd.fecha = ? ${envFilter.replace('id_tienda', 'vd.id_tienda')} GROUP BY vd.id_producto ORDER BY ventas_eu DESC LIMIT 5
          `).bind(fecha).all()).results;

          personal = (await env.CC_DB.prepare(`
            SELECT u.nombre, gp.turno, gp.hora_entrada, gp.hora_salida, gp.horas_trabajadas, gp.kpi_ventas_hora
            FROM gestion_personal gp JOIN usuarios u ON gp.id_operario = u.id
            WHERE gp.fecha = ? ${envFilter.replace('id_tienda', 'gp.id_tienda')} ORDER BY gp.hora_entrada
          `).bind(fecha).all()).results;

        } else {
          kpi = await env.CC_DB.prepare(
            'SELECT * FROM v_kpis_diarios WHERE id_tienda = ? AND fecha = ?'
          ).bind(id_tienda_req, fecha).first();

          ventasHora = (await env.CC_DB.prepare(`
            SELECT hora, SUM(total_linea) as ventas_eu, SUM(cantidad) as unidades
            FROM ventas_detalladas
            WHERE id_tienda = ? AND fecha = ?
            GROUP BY hora ORDER BY hora
          `).bind(id_tienda_req, fecha).all()).results;

          topProductos = (await env.CC_DB.prepare(`
            SELECT vd.id_producto, p.nombre, SUM(vd.cantidad) as unidades, SUM(vd.total_linea) as ventas_eu
            FROM ventas_detalladas vd JOIN productos p ON vd.id_producto = p.id_producto
            WHERE vd.id_tienda = ? AND vd.fecha = ?
            GROUP BY vd.id_producto ORDER BY ventas_eu DESC LIMIT 5
          `).bind(id_tienda_req, fecha).all()).results;

          personal = (await env.CC_DB.prepare(`
            SELECT u.nombre, gp.turno, gp.hora_entrada, gp.hora_salida, gp.horas_trabajadas, gp.kpi_ventas_hora
            FROM gestion_personal gp JOIN usuarios u ON gp.id_operario = u.id
            WHERE gp.id_tienda = ? AND gp.fecha = ?
            ORDER BY gp.hora_entrada
          `).bind(id_tienda_req, fecha).all()).results;
        }

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

        let results, facturas;
        
        if (id_tienda_req === 'TODAS') {
          results = (await env.CC_DB.prepare(`
            SELECT
              fecha, SUM(total_linea) as ventas_eu, COUNT(DISTINCT id_venta) as tickets, SUM(cantidad) as unidades
            FROM ventas_detalladas WHERE fecha LIKE ? GROUP BY fecha ORDER BY fecha
          `).bind(`${mes}%`).all()).results;

          facturas = (await env.CC_DB.prepare(`
            SELECT SUM(total_factura) as total_compras FROM facturas_proveedores WHERE fecha_factura LIKE ?
          `).bind(`${mes}%`).all()).results;
        } else {
          results = (await env.CC_DB.prepare(`
            SELECT
              fecha, SUM(total_linea) as ventas_eu, COUNT(DISTINCT id_venta) as tickets, SUM(cantidad) as unidades
            FROM ventas_detalladas WHERE id_tienda = ? AND fecha LIKE ? GROUP BY fecha ORDER BY fecha
          `).bind(id_tienda_req, `${mes}%`).all()).results;

          facturas = (await env.CC_DB.prepare(`
            SELECT SUM(total_factura) as total_compras FROM facturas_proveedores WHERE id_tienda = ? AND fecha_factura LIKE ?
          `).bind(id_tienda_req, `${mes}%`).all()).results;
        }

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

      // GET /api/tiendas/metricas — Lista de tiendas agrupables por franquiciado
      if (request.method === 'GET' && path === '/api/tiendas/metricas') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const mesActual = new Date().toISOString().slice(0, 7);
        const entorno = request.headers.get('x-entorno') || 'PROD';
        const envFilter = entorno === 'PROD' ? "AND t.id_tienda NOT LIKE 'MAD-%'" : "AND t.id_tienda LIKE 'MAD-%'";

        const { results } = await env.CC_DB.prepare(`
          SELECT 
            t.id_tienda, t.ciudad, t.perfil, t.franquiciado,
            COALESCE(SUM(v.total_linea), 0) as ventas_mes,
            COUNT(DISTINCT v.id_venta) as tickets_mes
          FROM tiendas t
          LEFT JOIN ventas_detalladas v 
            ON t.id_tienda = v.id_tienda 
            AND v.fecha LIKE ?
          WHERE t.activa = 1 ${envFilter}
          GROUP BY t.id_tienda
        `).bind(mesActual + '%').all();
        
        return jsonRes(results);
      }

      // GET /api/dashboard/global — Panel consolidado multi-tienda
      if (request.method === 'GET' && path === '/api/dashboard/global') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const fecha = url.searchParams.get('fecha') || new Date().toISOString().split('T')[0];

        const entorno = request.headers.get('x-entorno') || 'PROD';
        const envFilterT = entorno === 'PROD' ? "AND t.id_tienda NOT LIKE 'MAD-%'" : "AND t.id_tienda LIKE 'MAD-%'";

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
          WHERE t.activa = 1 ${envFilterT}
          ORDER BY t.id_tienda
        `).bind(fecha, fecha).all();

        const { results: foodCost } = await env.CC_DB.prepare(
          'SELECT * FROM v_food_cost_teorico ORDER BY id_producto'
        ).all();

        const envFilter = entorno === 'PROD' ? "AND id_tienda NOT LIKE 'MAD-%'" : "AND id_tienda LIKE 'MAD-%'";
        // Mermas por tienda
        const { results: mermas } = await env.CC_DB.prepare(`
          SELECT id_tienda, SUM(cantidad_ud) as total_ud, SUM(coste_economico) as total_eu
          FROM control_mermas WHERE fecha = ? ${envFilter}
          GROUP BY id_tienda
        `).bind(fecha).all();

        // Total nacional del día
        const totalVentas = kpis.reduce((a, k) => a + (k.ventas_netas_eu || 0), 0);
        const totalTickets = kpis.reduce((a, k) => a + (k.num_tickets || 0), 0);

        // Datos del día anterior para métricas comparativas
        const ayerRes = await env.CC_DB.prepare(`
          SELECT
            COALESCE(SUM(num_tickets), 0)       AS num_tickets,
            COALESCE(SUM(ventas_netas_eu), 0)   AS ventas_netas_eu
          FROM v_kpis_diarios
          WHERE fecha = date(?, '-1 day') ${envFilter}
        `).bind(fecha).first();
        
        const totalVentasAyer = ayerRes ? ayerRes.ventas_netas_eu : 0;
        const totalTicketsAyer = ayerRes ? ayerRes.num_tickets : 0;
        
        let delta_ventas_pct = 0;
        if (totalVentasAyer > 0) delta_ventas_pct = Math.round(((totalVentas - totalVentasAyer) / totalVentasAyer) * 100);
        else if (totalVentas > 0) delta_ventas_pct = 100;
        
        let delta_tickets_pct = 0;
        if (totalTicketsAyer > 0) delta_tickets_pct = Math.round(((totalTickets - totalTicketsAyer) / totalTicketsAyer) * 100);
        else if (totalTickets > 0) delta_tickets_pct = 100;

        const envFilterV = entorno === 'PROD' ? "AND v.id_tienda NOT LIKE 'MAD-%'" : "AND v.id_tienda LIKE 'MAD-%'";
        // Top 5 Productos del día
        const { results: topProductos } = await env.CC_DB.prepare(`
          SELECT p.nombre, SUM(v.cantidad) as total_cantidad, SUM(v.total_linea) as total_ventas
          FROM ventas_detalladas v
          JOIN productos p ON v.id_producto = p.id_producto
          WHERE v.fecha = ? ${envFilterV}
          GROUP BY v.id_producto
          ORDER BY total_ventas DESC
          LIMIT 5
        `).bind(fecha).all();

        return jsonRes({
          fecha,
          kpis_tiendas: kpis,
          mermas_tiendas: mermas,
          food_cost_teorico: foodCost,
          top_productos_dia: topProductos,
          consolidado: {
            ventas_netas_eu: Math.round(totalVentas * 100) / 100,
            total_tickets: totalTickets,
            ticket_medio_red: totalTickets > 0 ? Math.round((totalVentas / totalTickets) * 100) / 100 : 0,
            tiendas_activas: kpis.length,
            delta_ventas_pct,
            delta_tickets_pct
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
        const include_virtual = urlObj.searchParams.get('include_virtual') === 'true';

        let data = [];
        try {
          if (tipo === 'ventas') {
            let q = "SELECT id_tienda, fecha, hora, id_producto, cantidad, total_linea, canal FROM ventas_detalladas WHERE fecha >= ? AND fecha <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda = ?"; params.push(tienda); }
            else if (!include_virtual) { q += " AND id_tienda IN (SELECT id_tienda FROM tiendas WHERE is_virtual = 0)"; }
            data = (await env.CC_DB.prepare(q).bind(...params).all()).results;
          } 
          else if (tipo === 'inventario') {
            let q = "SELECT * FROM movimientos_inventario WHERE fecha >= ? AND fecha <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda = ?"; params.push(tienda); }
            else if (!include_virtual) { q += " AND id_tienda IN (SELECT id_tienda FROM tiendas WHERE is_virtual = 0)"; }
            data = (await env.CC_DB.prepare(q + " ORDER BY fecha DESC, hora DESC").bind(...params).all()).results;
          }
          else if (tipo === 'mermas') {
            let q = "SELECT id_tienda, fecha, id_producto, cantidad_ud, peso_g, motivo, coste_economico FROM control_mermas WHERE fecha >= ? AND fecha <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda = ?"; params.push(tienda); }
            else if (!include_virtual) { q += " AND id_tienda IN (SELECT id_tienda FROM tiendas WHERE is_virtual = 0)"; }
            data = (await env.CC_DB.prepare(q).bind(...params).all()).results;
          }
          else if (tipo === 'personal') {
            let q = "SELECT id_tienda, id_operario, fecha, turno, hora_entrada, hora_salida, horas_trabajadas, ventas_periodo FROM gestion_personal WHERE fecha >= ? AND fecha <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda = ?"; params.push(tienda); }
            else if (!include_virtual) { q += " AND id_tienda IN (SELECT id_tienda FROM tiendas WHERE is_virtual = 0)"; }
            data = (await env.CC_DB.prepare(q).bind(...params).all()).results;
          }
          else if (tipo === 'food_cost') {
            data = (await env.CC_DB.prepare("SELECT * FROM v_food_cost_teorico").all()).results;
          }
          else if (tipo === 'crm') {
            let q = "SELECT id_cliente, nombre, email, segmento, total_visitas, gasto_total_eu, ticket_medio FROM crm_clientes WHERE fecha_registro >= ? AND fecha_registro <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda_origen = ?"; params.push(tienda); }
            else if (!include_virtual) { q += " AND id_tienda_origen IN (SELECT id_tienda FROM tiendas WHERE is_virtual = 0)"; }
            data = (await env.CC_DB.prepare(q).bind(...params).all()).results;
          }
          else if (tipo === 'compras') {
            let q = "SELECT id_tienda, proveedor, numero_factura, fecha_factura, id_ingrediente, cantidad, total_factura FROM facturas_proveedores WHERE fecha_factura >= ? AND fecha_factura <= ?";
            let params = [desde, hasta];
            if (tienda && tienda !== 'TODAS') { q += " AND id_tienda = ?"; params.push(tienda); }
            else if (!include_virtual) { q += " AND id_tienda IN (SELECT id_tienda FROM tiendas WHERE is_virtual = 0)"; }
            data = (await env.CC_DB.prepare(q).bind(...params).all()).results;
          }
          else if (tipo === 'ventas-semana') {
            const entorno = request.headers.get('x-entorno') || 'PROD';
            const envFilter = entorno === 'PROD' ? "AND id_tienda NOT LIKE 'MAD-%'" : "AND id_tienda LIKE 'MAD-%'";
            let q = `
              SELECT fecha, SUM(total_linea) as ventas_dia 
              FROM ventas_detalladas 
              WHERE fecha >= date('now', '-7 days')
              ${envFilter}
              GROUP BY fecha
              ORDER BY fecha ASC
            `;
            data = (await env.CC_DB.prepare(q).all()).results;
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
        const { nombre, tipo, contacto_nombre, contacto_telefono, contacto_email, condiciones_pago } = await request.json();
        if (!nombre) return errRes('Nombre requerido');
        
        const id_proveedor = 'PROV-' + Date.now();
        await env.CC_DB.prepare(`
          INSERT INTO proveedores (id_proveedor, nombre, tipo, contacto_nombre, contacto_telefono, contacto_email, condiciones_pago)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(id_proveedor, nombre, tipo || 'EXTERNO', contacto_nombre || null, contacto_telefono || null, contacto_email || null, condiciones_pago || null).run();
        return jsonRes({ success: true, id_proveedor }, 201);
      }

      // PUT /api/proveedores/:id
      if (request.method === 'PUT' && path.startsWith('/api/proveedores/')) {
        const { error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);
        const id = path.replace('/api/proveedores/', '');
        const { nombre, tipo, contacto_nombre, contacto_telefono, contacto_email, condiciones_pago } = await request.json();
        if (!nombre) return errRes('Nombre requerido');
        
        await env.CC_DB.prepare(`
          UPDATE proveedores 
          SET nombre=?, tipo=?, contacto_nombre=?, contacto_telefono=?, contacto_email=?, condiciones_pago=?
          WHERE id_proveedor=?
        `).bind(nombre, tipo || 'EXTERNO', contacto_nombre || null, contacto_telefono || null, contacto_email || null, condiciones_pago || null, id).run();
        return jsonRes({ success: true });
      }

      // DELETE /api/proveedores/:id
      if (request.method === 'DELETE' && path.startsWith('/api/proveedores/')) {
        const { error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);
        const id = path.replace('/api/proveedores/', '');
        await env.CC_DB.prepare('DELETE FROM proveedores WHERE id_proveedor=?').bind(id).run();
        return jsonRes({ success: true });
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
        
        const { id_tienda_origen, id_tienda_destino, id_item, tipo_item, cantidad, unidad, estado_origen, estado_destino } = await request.json();
        if (!id_tienda_origen || !id_tienda_destino || !id_item || !tipo_item || !cantidad || !estado_origen || !estado_destino) {
          return errRes('Faltan campos para la transferencia');
        }

        const date = new Date();
        const fecha = date.toISOString().split('T')[0];
        const hora = date.toTimeString().split(' ')[0];

        const batch = [];
        
        // 1. Restar del origen
        batch.push(
          env.CC_DB.prepare(`
            UPDATE inventario_actual SET cantidad = cantidad - ?, ultima_actualizacion = ?
            WHERE id_tienda = ? AND id_item = ? AND estado = ?
          `).bind(cantidad, date.toISOString(), id_tienda_origen, id_item, estado_origen)
        );

        // 2. Sumar o crear en destino
        batch.push(
          env.CC_DB.prepare(`
            INSERT INTO inventario_actual (id_tienda, id_item, tipo_item, estado, cantidad, unidad, ultima_actualizacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id_tienda, id_item, estado) DO UPDATE SET 
              cantidad = cantidad + excluded.cantidad,
              ultima_actualizacion = excluded.ultima_actualizacion
          `).bind(id_tienda_destino, id_item, tipo_item, estado_destino, cantidad, unidad || 'ud', date.toISOString())
        );

        // 3. Registrar movimiento en ORIGEN
        if (id_tienda_origen === id_tienda_destino) {
          // Movimiento interno
          batch.push(
            env.CC_DB.prepare(`
              INSERT INTO movimientos_inventario (fecha, hora, id_tienda, id_item, tipo_item, cantidad, tipo_movimiento, origen, destino, operario_id)
              VALUES (?, ?, ?, ?, ?, ?, 'TRANSFERENCIA_INT', ?, ?, ?)
            `).bind(fecha, hora, id_tienda_origen, id_item, tipo_item, cantidad, estado_origen, estado_destino, user.id)
          );
        } else {
          // Movimiento B2B - Salida Origen
          batch.push(
            env.CC_DB.prepare(`
              INSERT INTO movimientos_inventario (fecha, hora, id_tienda, id_item, tipo_item, cantidad, tipo_movimiento, origen, destino, operario_id)
              VALUES (?, ?, ?, ?, ?, ?, 'ENVIO_B2B', ?, ?, ?)
            `).bind(fecha, hora, id_tienda_origen, id_item, tipo_item, cantidad, estado_origen, `${id_tienda_destino}(${estado_destino})`, user.id)
          );
          // Movimiento B2B - Entrada Destino
          batch.push(
            env.CC_DB.prepare(`
              INSERT INTO movimientos_inventario (fecha, hora, id_tienda, id_item, tipo_item, cantidad, tipo_movimiento, origen, destino, operario_id)
              VALUES (?, ?, ?, ?, ?, ?, 'RECEPCION_B2B', ?, ?, ?)
            `).bind(fecha, hora, id_tienda_destino, id_item, tipo_item, cantidad, `${id_tienda_origen}(${estado_origen})`, estado_destino, user.id)
          );
        }

        await env.CC_DB.batch(batch);
        return jsonRes({ success: true }, 201);
      }

      // GET /api/inventario/alertas — Alertas de reabastecimiento
      if (request.method === 'GET' && path === '/api/inventario/alertas') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const { results } = await env.CC_DB.prepare(`
          SELECT i.id_ingrediente, i.nombre, i.categoria, i.unidad, i.stock_seguridad_min, i.coste_por_unidad,
                 COALESCE((SELECT stock_fisico FROM inventarios_diarios d 
                  WHERE d.id_ingrediente = i.id_ingrediente 
                  ORDER BY fecha DESC LIMIT 1), 0) as stock_actual
          FROM ingredientes i
          WHERE i.activo = 1
        `).all();

        const alertas = results.filter(r => r.stock_actual <= r.stock_seguridad_min);
        
        let capital_inmovilizado = 0;
        results.forEach(r => {
          capital_inmovilizado += (r.stock_actual * r.coste_por_unidad);
        });

        return jsonRes({ 
          alertas: alertas.sort((a,b) => a.stock_actual - b.stock_actual),
          total_ingredientes: results.length,
          capital_inmovilizado: parseFloat(capital_inmovilizado.toFixed(2))
        });
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

      // POST /api/crm/clasificar — Clasificar clientes VIP por segmentos de gasto
      if (request.method === 'POST' && path === '/api/crm/clasificar') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        await env.CC_DB.prepare(`
          UPDATE crm_clientes 
          SET segmento = CASE 
            WHEN gasto_total_eu >= 1000 THEN 'VIP Platino'
            WHEN gasto_total_eu >= 500 THEN 'VIP Oro'
            WHEN gasto_total_eu >= 200 THEN 'VIP Plata'
            ELSE 'Base'
          END
        `).run();
        
        return jsonRes({ success: true, message: 'Clientes segmentados automáticamente' });
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
      // FRANQUICIAS: FASE 1
      // ══════════════════════════════════════════════════════

      // POST /api/franquicias/liquidaciones/generar
      if (request.method === 'POST' && path === '/api/franquicias/liquidaciones/generar') {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const { mes } = await request.json();
        if (!mes) return errRes('Mes requerido (YYYY-MM)', 400);

        const { results: tiendas } = await env.CC_DB.prepare(`
          SELECT 
            t.id_tienda, 
            t.pct_royalty, 
            t.pct_canon_publicidad,
            IFNULL(SUM(v.total_linea), 0) as ventas_netas
          FROM tiendas t
          LEFT JOIN ventas_detalladas v ON t.id_tienda = v.id_tienda AND strftime('%Y-%m', v.fecha) = ?
          WHERE t.activa = 1
          GROUP BY t.id_tienda
        `).bind(mes).all();

        for (const t of tiendas) {
          const royalty_eu = (t.ventas_netas * t.pct_royalty) / 100;
          const canon_eu = (t.ventas_netas * t.pct_canon_publicidad) / 100;

          await env.CC_DB.prepare(`
            INSERT INTO liquidaciones_mensuales (id_tienda, mes, ventas_netas, royalty_pct, royalty_eu, canon_pct, canon_eu)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id_tienda, mes) DO UPDATE SET
              ventas_netas = excluded.ventas_netas,
              royalty_eu = excluded.royalty_eu,
              canon_eu = excluded.canon_eu
          `).bind(t.id_tienda, mes, t.ventas_netas, t.pct_royalty, royalty_eu, t.pct_canon_publicidad, canon_eu).run();
        }

        return jsonRes({ success: true, generadas: tiendas.length });
      }

      // GET /api/franquicias/liquidaciones
      if (request.method === 'GET' && path === '/api/franquicias/liquidaciones') {
        const { user, error } = await authMiddleware(request, env, ['ADMIN', 'FRANQUICIADO']);
        if (error) return errRes(error, 401);

        let query = `
          SELECT l.*, t.nombre as tienda 
          FROM liquidaciones_mensuales l
          JOIN tiendas t ON l.id_tienda = t.id_tienda
        `;
        let params = [];
        
        if (user.role === 'FRANQUICIADO') {
          query += ` WHERE l.id_tienda = ? `;
          params.push(user.id_tienda);
        }
        query += ` ORDER BY l.mes DESC, t.nombre ASC`;

        const { results } = await env.CC_DB.prepare(query).bind(...params).all();
        return jsonRes(results);
      }

      // GET /api/franquicias/compliance
      if (request.method === 'GET' && path === '/api/franquicias/compliance') {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const { results } = await env.CC_DB.prepare(`
          SELECT c.*, t.nombre as tienda
          FROM v_compliance_compras c
          JOIN tiendas t ON c.id_tienda = t.id_tienda
          ORDER BY c.mes DESC, c.id_tienda ASC
        `).all();
        return jsonRes(results);
      }

      // ══════════════════════════════════════════════════════
      // SOPORTE Y HELPDESK
      // ══════════════════════════════════════════════════════

      if (request.method === 'GET' && path === '/api/soporte/tickets') {
        const { user, error } = await authMiddleware(request, env, ['ADMIN', 'FRANQUICIADO']);
        if (error) return errRes(error, 401);

        let query = `
          SELECT s.*, t.nombre as tienda 
          FROM soporte_tickets s
          JOIN tiendas t ON s.id_tienda = t.id_tienda
        `;
        let params = [];
        if (user.role === 'FRANQUICIADO') {
          query += ` WHERE s.id_tienda = ? `;
          params.push(user.id_tienda);
        }
        query += ` ORDER BY s.creado_en DESC`;

        const { results } = await env.CC_DB.prepare(query).bind(...params).all();
        return jsonRes(results);
      }

      if (request.method === 'POST' && path === '/api/soporte/tickets') {
        const { user, error } = await authMiddleware(request, env, ['FRANQUICIADO']);
        if (error) return errRes(error, 401);

        const { asunto, categoria, descripcion } = await request.json();
        if (!asunto || !categoria || !descripcion) return errRes('Datos incompletos', 400);

        await env.CC_DB.prepare(`
          INSERT INTO soporte_tickets (id_tienda, asunto, categoria, descripcion)
          VALUES (?, ?, ?, ?)
        `).bind(user.id_tienda, asunto, categoria, descripcion).run();

        return jsonRes({ success: true, message: 'Ticket creado exitosamente' });
      }

      if (request.method === 'PATCH' && path.startsWith('/api/soporte/tickets/')) {
        const { user, error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const id_ticket = path.split('/').pop();
        const { estado, respuesta_admin } = await request.json();

        await env.CC_DB.prepare(`
          UPDATE soporte_tickets 
          SET estado = ?, respuesta_admin = ?, actualizado_en = datetime('now')
          WHERE id_ticket = ?
        `).bind(estado, respuesta_admin || null, id_ticket).run();

        return jsonRes({ success: true, message: 'Ticket actualizado' });
      }

      // ══════════════════════════════════════════════════════
      // EXPANSIÓN Y ONBOARDING
      // ══════════════════════════════════════════════════════

      if (request.method === 'GET' && path === '/api/expansion/proyectos') {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const { results } = await env.CC_DB.prepare(`
          SELECT * FROM expansion_proyectos ORDER BY creado_en DESC
        `).all();
        
        for (let p of results) {
          const { results: tareas } = await env.CC_DB.prepare(`
            SELECT * FROM expansion_tareas WHERE id_proyecto = ?
          `).bind(p.id_proyecto).all();
          p.tareas = tareas;
        }
        
        return jsonRes(results);
      }

      if (request.method === 'POST' && path === '/api/expansion/proyectos') {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const { nombre_franquiciado, ciudad, fecha_estimada_apertura } = await request.json();
        if (!nombre_franquiciado || !ciudad) return errRes('Datos incompletos', 400);

        const { meta } = await env.CC_DB.prepare(`
          INSERT INTO expansion_proyectos (nombre_franquiciado, ciudad, fecha_estimada_apertura)
          VALUES (?, ?, ?)
        `).bind(nombre_franquiciado, ciudad, fecha_estimada_apertura).run();

        const id_proyecto = meta.last_row_id;
        
        const tareas_base = [
          { fase: 'Búsqueda Local', desc: 'Firma de contrato de reserva del local' },
          { fase: 'Búsqueda Local', desc: 'Aprobación de la Central del local propuesto' },
          { fase: 'Contratos', desc: 'Firma del contrato de franquicia final' },
          { fase: 'Reformas', desc: 'Solicitud de licencia de obra' },
          { fase: 'Reformas', desc: 'Inicio de obras y adecuación' },
          { fase: 'Reformas', desc: 'Fin de obra e instalación de maquinaria' },
          { fase: 'Formación', desc: 'Formación del franquiciado en central' },
          { fase: 'Formación', desc: 'Formación del equipo en tienda' },
          { fase: 'Apertura', desc: 'Primer pedido inicial recibido' },
          { fase: 'Apertura', desc: 'Inauguración y apertura de puertas' }
        ];

        let stmt = env.CC_DB.prepare(`INSERT INTO expansion_tareas (id_proyecto, fase, descripcion) VALUES (?, ?, ?)`);
        let batch = tareas_base.map(t => stmt.bind(id_proyecto, t.fase, t.desc));
        await env.CC_DB.batch(batch);

        return jsonRes({ success: true, message: 'Proyecto de expansión creado' });
      }

      if (request.method === 'PATCH' && path.startsWith('/api/expansion/proyectos/')) {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const id_proyecto = path.split('/').pop();
        const { estado_proyecto } = await request.json();

        await env.CC_DB.prepare(`
          UPDATE expansion_proyectos SET estado_proyecto = ? WHERE id_proyecto = ?
        `).bind(estado_proyecto, id_proyecto).run();

        return jsonRes({ success: true });
      }

      if (request.method === 'PATCH' && path.startsWith('/api/expansion/tareas/')) {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const id_tarea = path.split('/').pop();
        const { completada } = await request.json();

        await env.CC_DB.prepare(`
          UPDATE expansion_tareas 
          SET completada = ?, fecha_completada = CASE WHEN ? THEN date('now') ELSE NULL END
          WHERE id_tarea = ?
        `).bind(completada ? 1 : 0, completada ? 1 : 0, id_tarea).run();

        return jsonRes({ success: true });
      }

      // POST /api/expansion/simular
      if (request.method === 'POST' && path === '/api/expansion/simular') {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const { candidato, ubicacion, tipo, horario, personal, venta_diaria, delivery } = await request.json();

        // Reglas Heurísticas Financieras
        const dias_mes = 30;
        let venta_base_mensual = venta_diaria * dias_mes;
        
        // Ajustes por tipo de local
        if (tipo === 'CC') {
          venta_base_mensual *= 1.15;
        }

        const calcularEscenario = (modificadorVenta) => {
          const ventas = venta_base_mensual * modificadorVenta;
          const food_cost = ventas * 0.26; // 26% de FC
          const royalties = ventas * 0.05;
          const marketing = ventas * 0.02;
          
          // Costes laborales (estimación 14€/h coste empresa aprox)
          const laboral = personal * 1600; 

          // Alquiler estimado (CC más caro que Calle)
          const alquiler = (tipo === 'CC') ? 4500 : 2500;
          const suministros_fijos = 800;
          const fijos = alquiler + suministros_fijos;

          const ebitda = ventas - (food_cost + royalties + marketing + laboral + fijos);
          const ebitda_pct = (ventas > 0) ? (ebitda / ventas) * 100 : 0;
          
          return { ventas, food_cost, royalties, marketing, laboral, fijos, ebitda, ebitda_pct };
        };

        const pesimista = calcularEscenario(0.80);
        const promedio = calcularEscenario(1.00);
        const optimista = calcularEscenario(1.25);

        // Score de viabilidad
        let score = 50;
        if (promedio.ebitda_pct > 15) score += 20;
        if (promedio.ebitda_pct > 20) score += 10;
        if (pesimista.ebitda > 0) score += 20;
        if ((promedio.fijos / promedio.ventas) > 0.15) score -= 15;

        // Limitar score
        score = Math.max(0, Math.min(100, score));

        const simulacion = {
          candidato,
          ubicacion,
          tipo,
          horario,
          personal,
          venta_diaria,
          delivery,
          score,
          escenarios: {
            pesimista,
            promedio,
            optimista
          }
        };

        // Guardar en BD
        await env.CC_DB.prepare(`
          INSERT INTO expansion_simulaciones (
            nombre_candidato, ubicacion, tipo_local, horario, personal_requerido, 
            venta_estimada_diaria, pct_delivery, ebitda_estimado_anual, score_viabilidad, datos_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          candidato, ubicacion, tipo, horario, personal, 
          venta_diaria, delivery, promedio.ebitda * 12, score, JSON.stringify(simulacion)
        ).run();

        return jsonRes({ success: true, data: simulacion });
      }

      // ══════════════════════════════════════════════════════
      // FRANQUICIAS: FASE 2 (AUDITORÍAS QSC)
      // ══════════════════════════════════════════════════════

      // POST /api/franquicias/auditorias
      if (request.method === 'POST' && path === '/api/franquicias/auditorias') {
        const { user, error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const { id_tienda, respuestas, observaciones } = await request.json();
        if (!id_tienda || !respuestas || !Array.isArray(respuestas)) return errRes('Datos inválidos', 400);

        let puntos_obtenidos = 0;
        let puntos_posibles = 0;

        for (const r of respuestas) {
          if (r.calificacion !== -1) { // -1 means N/A
            puntos_posibles += 1;
            puntos_obtenidos += r.calificacion;
          }
        }

        const pct_cumplimiento = puntos_posibles > 0 ? (puntos_obtenidos / puntos_posibles) * 100 : 0;
        const fecha = new Date().toISOString().split('T')[0];

        const auditoriaResult = await env.CC_DB.prepare(`
          INSERT INTO auditorias (id_tienda, fecha, auditor_id, puntuacion_obtenida, puntuacion_maxima, pct_cumplimiento, observaciones)
          VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id_auditoria
        `).bind(id_tienda, fecha, user.id, puntos_obtenidos, puntos_posibles, pct_cumplimiento, observaciones || null).first();

        const id_auditoria = auditoriaResult.id_auditoria;

        for (const r of respuestas) {
          await env.CC_DB.prepare(`
            INSERT INTO auditoria_respuestas (id_auditoria, categoria, pregunta, calificacion, notas_adicionales)
            VALUES (?, ?, ?, ?, ?)
          `).bind(id_auditoria, r.categoria, r.pregunta, r.calificacion, r.notas || null).run();
        }

        return jsonRes({ success: true, id_auditoria, pct_cumplimiento });
      }

      // GET /api/franquicias/auditorias
      if (request.method === 'GET' && path === '/api/franquicias/auditorias') {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const { results } = await env.CC_DB.prepare(`
          SELECT a.*, t.nombre as tienda, u.nombre as auditor
          FROM auditorias a
          JOIN tiendas t ON a.id_tienda = t.id_tienda
          LEFT JOIN usuarios u ON a.auditor_id = u.id
          ORDER BY a.creado_en DESC
        `).all();
        return jsonRes(results);
      }

      // GET /api/franquicias/auditorias/:id
      if (request.method === 'GET' && path.startsWith('/api/franquicias/auditorias/')) {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const id_auditoria = path.replace('/api/franquicias/auditorias/', '');
        const auditoria = await env.CC_DB.prepare('SELECT * FROM auditorias WHERE id_auditoria = ?').bind(id_auditoria).first();
        if (!auditoria) return errRes('Auditoría no encontrada', 404);

        const { results: respuestas } = await env.CC_DB.prepare('SELECT * FROM auditoria_respuestas WHERE id_auditoria = ?').bind(id_auditoria).all();
        
        return jsonRes({ auditoria, respuestas });
      }

      // ══════════════════════════════════════════════════════
      // FRANQUICIAS: FASE 3 (SOLICITUDES DE EXPANSIÓN)
      // ══════════════════════════════════════════════════════

      // POST /api/franquicias/solicitudes (Público)
      if (request.method === 'POST' && path === '/api/franquicias/solicitudes') {
        const { nombre_completo, email, telefono, ciudad_interes, capital_disponible } = await request.json();
        if (!nombre_completo || !email || !telefono || !ciudad_interes || !capital_disponible) {
          return errRes('Todos los campos son obligatorios', 400);
        }

        await env.CC_DB.prepare(`
          INSERT INTO solicitudes_franquicia (nombre_completo, email, telefono, ciudad_interes, capital_disponible)
          VALUES (?, ?, ?, ?, ?)
        `).bind(nombre_completo, email, telefono, ciudad_interes, capital_disponible).run();

        return jsonRes({ success: true, message: 'Solicitud enviada correctamente' }, 201);
      }

      // GET /api/franquicias/solicitudes (Privado - ADMIN)
      if (request.method === 'GET' && path === '/api/franquicias/solicitudes') {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const { results } = await env.CC_DB.prepare(`
          SELECT * FROM solicitudes_franquicia ORDER BY creado_en DESC
        `).all();
        
        return jsonRes(results);
      }

      // PATCH /api/franquicias/solicitudes/:id/estado (Privado - ADMIN)
      if (request.method === 'PATCH' && path.startsWith('/api/franquicias/solicitudes/') && path.endsWith('/estado')) {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const id_solicitud = path.replace('/api/franquicias/solicitudes/', '').replace('/estado', '');
        const { estado } = await request.json();
        
        if (!estado) return errRes('Estado requerido', 400);

        await env.CC_DB.prepare(`
          UPDATE solicitudes_franquicia SET estado = ? WHERE id_solicitud = ?
        `).bind(estado, id_solicitud).run();

        return jsonRes({ success: true });
      }

      // ══════════════════════════════════════════════════════
      // FRANQUICIAS: FASE 4 (OPERACIONES Y SOPORTE)
      // ══════════════════════════════════════════════════════

      // TICKETS
      if (request.method === 'POST' && path === '/api/franquicias/tickets') {
        const { error, user } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const { id_tienda, asunto, categoria } = await request.json();
        if (!id_tienda || !asunto || !categoria) return errRes('Datos incompletos', 400);

        await env.CC_DB.prepare(`
          INSERT INTO tickets_soporte (id_tienda, asunto, categoria) VALUES (?, ?, ?)
        `).bind(id_tienda, asunto, categoria).run();

        return jsonRes({ success: true });
      }

      if (request.method === 'GET' && path === '/api/franquicias/tickets') {
        const { error, user } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const url = new URL(request.url);
        const tiendaId = url.searchParams.get('id_tienda');
        
        let q = 'SELECT t.*, d.nombre as tienda_nombre FROM tickets_soporte t JOIN tiendas d ON t.id_tienda = d.id_tienda';
        let params = [];
        if (user.rol === 'FRANQUICIADO' || tiendaId) {
          q += ' WHERE t.id_tienda = ?';
          params.push(tiendaId || user.id_tienda);
        }
        q += ' ORDER BY t.creado_en DESC';
        
        const { results } = await env.CC_DB.prepare(q).bind(...params).all();
        return jsonRes(results);
      }

      if (request.method === 'PATCH' && path.startsWith('/api/franquicias/tickets/') && path.endsWith('/estado')) {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const id_ticket = path.replace('/api/franquicias/tickets/', '').replace('/estado', '');
        const { estado } = await request.json();
        
        await env.CC_DB.prepare('UPDATE tickets_soporte SET estado = ? WHERE id_ticket = ?').bind(estado, id_ticket).run();
        return jsonRes({ success: true });
      }

      // OPEX (P&L)
      if (request.method === 'POST' && path === '/api/franquicias/opex') {
        const { error, user } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const { id_tienda, mes, alquiler, suministros, seguros, personal, otros_gastos } = await request.json();
        if (!id_tienda || !mes) return errRes('Tienda y mes obligatorios', 400);

        await env.CC_DB.prepare(`
          INSERT INTO opex_franquiciado (id_tienda, mes, alquiler, suministros, seguros, personal, otros_gastos)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id_tienda, mes) DO UPDATE SET 
            alquiler=excluded.alquiler,
            suministros=excluded.suministros,
            seguros=excluded.seguros,
            personal=excluded.personal,
            otros_gastos=excluded.otros_gastos
        `).bind(id_tienda, mes, alquiler || 0, suministros || 0, seguros || 0, personal || 0, otros_gastos || 0).run();

        return jsonRes({ success: true });
      }

      if (request.method === 'GET' && path === '/api/franquicias/opex') {
        const { error, user } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const url = new URL(request.url);
        const tiendaId = url.searchParams.get('id_tienda');
        const mes = url.searchParams.get('mes');
        
        let q = 'SELECT o.*, d.nombre as tienda_nombre FROM opex_franquiciado o JOIN tiendas d ON o.id_tienda = d.id_tienda WHERE 1=1';
        let params = [];
        
        if (user.rol === 'FRANQUICIADO') {
          q += ' AND o.id_tienda = ?';
          params.push(user.id_tienda);
        } else if (tiendaId) {
          q += ' AND o.id_tienda = ?';
          params.push(tiendaId);
        }

        if (mes) {
          q += ' AND o.mes = ?';
          params.push(mes);
        }
        
        q += ' ORDER BY o.mes DESC, o.id_tienda ASC';
        
        const { results } = await env.CC_DB.prepare(q).bind(...params).all();
        return jsonRes(results);
      }

      // ══════════════════════════════════════════════════════
      // FRANQUICIAS: FASE 5 (MARKETING, PUBLICIDAD Y ROI)
      // ══════════════════════════════════════════════════════

      // CAMPANAS
      if (request.method === 'GET' && path === '/api/franquicias/marketing/campanas') {
        const { error, user } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const { results } = await env.CC_DB.prepare('SELECT * FROM campanas_marketing ORDER BY creado_en DESC').all();
        return jsonRes(results);
      }

      if (request.method === 'POST' && path === '/api/franquicias/marketing/campanas') {
        const { error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const { nombre, descripcion, fecha_inicio, fecha_fin, presupuesto, tipo } = await request.json();
        if (!nombre || !fecha_inicio || !fecha_fin || !tipo) return errRes('Datos incompletos', 400);

        await env.CC_DB.prepare(`
          INSERT INTO campanas_marketing (nombre, descripcion, fecha_inicio, fecha_fin, presupuesto, tipo)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(nombre, descripcion || '', fecha_inicio, fecha_fin, presupuesto || 0, tipo).run();

        return jsonRes({ success: true });
      }

      // ROI MARKETING
      if (request.method === 'GET' && path === '/api/franquicias/marketing/roi') {
        const { error, user } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const url = new URL(request.url);
        const tiendaId = url.searchParams.get('id_tienda');
        const campanaId = url.searchParams.get('id_campana');
        
        let q = `
          SELECT r.*, c.nombre as campana_nombre, c.tipo as campana_tipo, d.nombre as tienda_nombre 
          FROM roi_marketing_tienda r
          JOIN campanas_marketing c ON r.id_campana = c.id_campana
          JOIN tiendas d ON r.id_tienda = d.id_tienda
          WHERE 1=1
        `;
        let params = [];

        if (user.rol === 'FRANQUICIADO') {
          q += ' AND r.id_tienda = ?';
          params.push(user.id_tienda);
        } else if (tiendaId) {
          q += ' AND r.id_tienda = ?';
          params.push(tiendaId);
        }

        if (campanaId) {
          q += ' AND r.id_campana = ?';
          params.push(campanaId);
        }

        q += ' ORDER BY r.creado_en DESC';

        const { results } = await env.CC_DB.prepare(q).bind(...params).all();
        return jsonRes(results);
      }

      if (request.method === 'POST' && path === '/api/franquicias/marketing/roi') {
        const { error, user } = await authMiddleware(request, env, ['FRANQUICIADO', 'ADMIN']);
        if (error) return errRes(error, 401);

        const { id_campana, id_tienda, inversion_real, tickets_promocion, ventas_atribuidas } = await request.json();
        if (!id_campana || !id_tienda) return errRes('Faltan datos clave', 400);

        // Si es franquiciado solo puede cargar ROI de su tienda
        if (user.rol === 'FRANQUICIADO' && user.id_tienda !== id_tienda) {
           return errRes('No autorizado', 403);
        }

        await env.CC_DB.prepare(`
          INSERT INTO roi_marketing_tienda (id_campana, id_tienda, inversion_real, tickets_promocion, ventas_atribuidas)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id_campana, id_tienda) DO UPDATE SET 
            inversion_real = excluded.inversion_real,
            tickets_promocion = excluded.tickets_promocion,
            ventas_atribuidas = excluded.ventas_atribuidas
        `).bind(id_campana, id_tienda, inversion_real || 0, tickets_promocion || 0, ventas_atribuidas || 0).run();

        return jsonRes({ success: true });
      }

      // ══════════════════════════════════════════════════════
      // PREDICCIONES Y ALGORITMOS
      // ══════════════════════════════════════════════════════

      // GET /api/predict/demand/:tienda
      if (request.method === 'GET' && path.match(/^\/api\/predict\/demand\/[^/]+$/)) {
        const { user, error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);

        const tienda_target = path.split('/').pop();
        
        // 1. Obtener datos de la tienda
        const tiendaInfo = await env.CC_DB.prepare(`SELECT ciudad FROM tiendas WHERE id_tienda = ?`).bind(tienda_target).first();
        const ciudad = tiendaInfo ? tiendaInfo.ciudad : 'Madrid';
        
        // 2. Factores Externos (Calendario de Eventos) para MAÑANA
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const eventosRes = await env.CC_DB.prepare(`
          SELECT descripcion, multiplicador_demanda 
          FROM calendario_eventos 
          WHERE fecha = ? AND ciudad = ?
        `).bind(tomorrow, ciudad).all();
        
        let multiplicador_externo = 1.0;
        let factores_activos = ['Histórico YoY', 'Día de la semana'];
        
        if (eventosRes && eventosRes.results && eventosRes.results.length > 0) {
          eventosRes.results.forEach(ev => {
            multiplicador_externo *= ev.multiplicador_demanda;
            factores_activos.push(ev.descripcion);
          });
        }
        
        // 3. Calcular Tendencia de Crecimiento (Últimos 28 días vs Mismos 28 días Año Anterior)
        const fecha_inicio_last_year = `date('now', '+1 day', '-1 year', '-28 days')`;
        const fecha_fin_last_year = `date('now', '+1 day', '-1 year')`;
        
        const trendRes = await env.CC_DB.prepare(`
          SELECT 
            SUM(CASE WHEN fecha >= date('now', '-28 days') THEN cantidad ELSE 0 END) as ventas_current,
            SUM(CASE WHEN fecha >= ${fecha_inicio_last_year} AND fecha <= ${fecha_fin_last_year} THEN cantidad ELSE 0 END) as ventas_last_year
          FROM ventas_detalladas
          WHERE id_tienda = ?
        `).bind(tienda_target).first();
        
        let tendencia = 1.0;
        if (trendRes && trendRes.ventas_last_year > 0) {
          tendencia = trendRes.ventas_current / trendRes.ventas_last_year;
          // Limitar tendencia para evitar picos extremos por falta de datos
          if(tendencia > 2.0) tendencia = 2.0;
          if(tendencia < 0.5) tendencia = 0.5;
        }
        
        // 4. Base Predictiva: Promedio 4 semanas actuales y Promedio 4 semanas YoY
        const dbResCurrent = await env.CC_DB.prepare(`
          SELECT v.id_producto, p.nombre, ROUND(SUM(v.cantidad) / 4.0, 1) as cant_base
          FROM ventas_detalladas v JOIN productos p ON v.id_producto = p.id_producto
          WHERE v.id_tienda = ? AND v.fecha >= date('now', '-28 days') AND strftime('%w', v.fecha) = strftime('%w', date('now', '+1 day'))
          GROUP BY v.id_producto
        `).bind(tienda_target).all();

        const dbResLastYear = await env.CC_DB.prepare(`
          SELECT id_producto, ROUND(SUM(cantidad) / 4.0, 1) as cant_yoy
          FROM ventas_detalladas
          WHERE id_tienda = ? AND fecha >= ${fecha_inicio_last_year} AND fecha <= ${fecha_fin_last_year} AND strftime('%w', fecha) = strftime('%w', date('now', '+1 day'))
          GROUP BY id_producto
        `).bind(tienda_target).all();

        const predicciones = [];
        dbResCurrent.results.forEach(row => {
          const yoyRow = dbResLastYear.results.find(y => y.id_producto === row.id_producto);
          let base_calc = 0;
          if (yoyRow && yoyRow.cant_yoy > 0) {
            base_calc = yoyRow.cant_yoy * tendencia;
          } else {
            base_calc = row.cant_base; // Fallback
            if(!factores_activos.includes('Fallback 4-semanas (Sin datos YoY)')) {
               factores_activos = factores_activos.filter(f => f !== 'Histórico YoY');
               factores_activos.push('Fallback 4-semanas (Sin datos YoY)');
            }
          }
          
          let final_calc = Math.round(base_calc * multiplicador_externo * 10) / 10;
          
          predicciones.push({
            id_producto: row.id_producto,
            nombre: row.nombre,
            cantidad_estimada: final_calc,
            confianza_pct: (yoyRow && yoyRow.cant_yoy > 0) ? 95 : 80
          });
        });
        
        predicciones.sort((a,b) => b.cantidad_estimada - a.cantidad_estimada);

        const mockPrediction = {
          tienda: tienda_target,
          fecha_proyectada: tomorrow,
          predicciones: predicciones,
          factores_considerados: factores_activos
        };
        
        return jsonRes(mockPrediction);
      }

      // GET /api/predict/production
      if (request.method === 'GET' && path === '/api/predict/production') {
        const { user, error } = await authMiddleware(request, env, ['ADMIN']);
        if (error) return errRes(error, 401);
        const urlObj = new URL(request.url);
        const include_virtual = urlObj.searchParams.get('include_virtual') === 'true';
        
        let q_demand = `
          SELECT 
              p.id_producto,
              p.nombre,
              SUM(v.cantidad) / 4.0 as total_estimado
          FROM ventas_detalladas v
          JOIN tiendas t ON v.id_tienda = t.id_tienda
          JOIN productos p ON v.id_producto = p.id_producto
          WHERE v.fecha >= date('now', '-28 days')
            AND strftime('%w', v.fecha) = strftime('%w', date('now', '+1 day'))
            ${include_virtual ? '' : 'AND t.is_virtual = 0'}
            AND p.categoria = 'GALLETAS'
          GROUP BY p.id_producto, p.nombre
        `;
        
        const demandRes = await env.CC_DB.prepare(q_demand).all();
        
        let produccion_estimada = [];
        let total_unidades = 0;
        let total_kilos = 0;

        for (const d of demandRes.results) {
           const unidades = Math.round(d.total_estimado);
           // Asumiendo 120g por unidad de masa
           const kilos_masa = parseFloat((unidades * 0.12).toFixed(2)); 
           
           total_unidades += unidades;
           total_kilos += kilos_masa;

           produccion_estimada.push({
             id_producto: d.id_producto,
             nombre: d.nombre,
             unidades: unidades,
             kilos_masa: kilos_masa
           });
        }
        
        // Ordenar por unidades de mayor a menor
        produccion_estimada.sort((a,b) => b.unidades - a.unidades);

        const productionRes = {
          fecha_produccion: new Date().toISOString().split('T')[0],
          detalle_produccion: produccion_estimada,
          totales: {
            unidades: total_unidades,
            kilos_masa: parseFloat(total_kilos.toFixed(2))
          },
          alertas_abastecimiento: []
        };
        
        return jsonRes(productionRes);
      }

      // GET /api/personal/cuadrantes/generar
      if (request.method === 'GET' && path === '/api/personal/cuadrantes/generar') {
        const { user, error } = await authMiddleware(request, env, ['ADMIN', 'FRANQUICIADO']);
        if (error) return errRes(error, 401);

        const tienda = url.searchParams.get('tienda');
        if (!tienda) return errRes('Falta el parámetro tienda', 400);
        
        // Consultar el promedio de ventas por hora de la tienda en los últimos 28 días
        const { results: ventasHora } = await env.CC_DB.prepare(`
          SELECT hora, SUM(total_linea) / 28.0 as promedio_hora
          FROM ventas_detalladas
          WHERE id_tienda = ? AND fecha >= date('now', '-28 days')
          GROUP BY hora
          ORDER BY hora
        `).bind(tienda).all();

        let turnos = [];
        const umbralExtra = 150;
        
        ventasHora.forEach(v => {
          let staff_necesario = 1; // Mínimo 1 operador base
          if (v.promedio_hora > umbralExtra) {
            staff_necesario += Math.floor(v.promedio_hora / umbralExtra);
          }
          
          turnos.push({
            hora: `${String(v.hora).padStart(2, '0')}:00`,
            promedio_eur: parseFloat(v.promedio_hora.toFixed(2)),
            staff_recomendado: staff_necesario
          });
        });

        // Fallback si no hay ventas (ej. simulación para BCN-01 o MAD-01)
        if (turnos.length === 0) {
           for (let h = 11; h <= 20; h++) {
             turnos.push({
               hora: `${String(h).padStart(2, '0')}:00`,
               promedio_eur: h >= 16 && h <= 19 ? 220 : 85,
               staff_recomendado: h >= 16 && h <= 19 ? 2 : 1
             });
           }
        }

        return jsonRes({
          tienda: tienda,
          umbral_refuerzo_eur: umbralExtra,
          cuadrante: turnos
        });
      }

      // ══════════════════════════════════════════════════════
      // ASESOR DE MARKETING IA
      // ══════════════════════════════════════════════════════
      if (request.method === 'GET' && path === '/api/ai/marketing-advisor') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);

        const tiendaFiltro = url.searchParams.get('tienda') || 'GLOBAL'; // BCN-01, MAD-01 o GLOBAL

        // Extraer los últimos registros de Instagram
        const { results: ig_kpis } = await env.CC_DB.prepare(
          'SELECT * FROM instagram_kpis ORDER BY fecha DESC LIMIT 4'
        ).all();

        // Extraer Top Productos de los últimos 7 días
        let queryVentas = `
          SELECT p.nombre, SUM(v.total_linea) as ingresos
          FROM ventas_detalladas v
          JOIN productos p ON v.id_producto = p.id_producto
          WHERE v.fecha >= date('now', '-7 days')
        `;
        let paramsVentas = [];
        if (tiendaFiltro !== 'GLOBAL') {
          queryVentas += ` AND v.id_tienda = ? `;
          paramsVentas.push(tiendaFiltro);
        }
        queryVentas += ` GROUP BY v.id_producto ORDER BY ingresos DESC LIMIT 3`;

        const { results: topProductos } = await env.CC_DB.prepare(queryVentas).bind(...paramsVentas).all();

        // Construir la estrategia basada en reglas (simulando una IA)
        let seguidoresActuales = ig_kpis.length > 0 ? ig_kpis[0].seguidores : 0;
        let crecimientoSeguidores = 0;
        if (ig_kpis.length > 1) {
          crecimientoSeguidores = ig_kpis[0].seguidores - ig_kpis[1].seguidores;
        }

        let productosTopText = topProductos.length > 0 
          ? topProductos.map(p => p.nombre).join(', ') 
          : 'Galleta Clásica, Nutella Bomb, Red Velvet';

        let estrategia = `### Análisis Semanal: Instagram vs Ventas\n\n`;
        estrategia += `**Rendimiento Social**: Actualmente contamos con **${seguidoresActuales.toLocaleString()} seguidores** orgánicos. En la última semana, hemos visto una variación de **${crecimientoSeguidores > 0 ? '+' : ''}${crecimientoSeguidores} seguidores**, lo que indica que el engagement promedio (${ig_kpis.length>0 ? ig_kpis[0].likes_promedio : 0} likes/post) mantiene un alcance de marca estable.\n\n`;
        
        let ambitoText = tiendaFiltro === 'GLOBAL' ? 'nivel nacional' : `la tienda ${tiendaFiltro}`;
        estrategia += `**Tendencias de Producto**: Los productos más vendidos a **${ambitoText}** en los últimos 7 días son: **${productosTopText}**. \n\n`;
        
        estrategia += `**Estrategia Recomendada (Crosti IA Advisor)**:\n`;
        estrategia += `- **Foco de Contenido (Reels)**: Crea videos cortos mostrando el proceso artesanal del obrador para los productos estrella (*${productosTopText}*). Estos productos ya tienen alta demanda y excelente retorno (ROI).\n`;
        
        if (tiendaFiltro === 'GLOBAL') {
           estrategia += `- **Impulso de Marca Global**: Crea campañas de expectación ("hype") a nivel nacional. Promueve votaciones en historias sobre próximos sabores para fomentar comunidad.\n`;
        } else if (tiendaFiltro === 'MAD-01') {
           estrategia += `- **Impulso Local Madrid**: Invita a la comunidad a probar estos productos directamente en la tienda piloto de Madrid (C. de Ferrer del Río, 24) mencionando que son "los favoritos de la capital".\n`;
        } else if (tiendaFiltro === 'BCN-01') {
           estrategia += `- **Impulso Local Barcelona**: Lanza una promoción flash geolocalizada en Instagram invitando a la comunidad a visitar la tienda de BCN (Carrer de Llull, 223) usando el código #CrostiBCN.\n`;
        }

        estrategia += `- **Interacción (Historias)**: Publica hoy 2 historias con encuestas preguntando a tu audiencia cuál de estos productos prefieren. Esto entrenará al algoritmo de Instagram para mostrar tus próximas publicaciones a más usuarios.\n`;

        return jsonRes({
          success: true,
          tienda: tiendaFiltro,
          instagram_kpis: ig_kpis,
          estrategia_ia: estrategia
        });
      }

      // POST /api/instagram/kpis
      if (request.method === 'POST' && path === '/api/instagram/kpis') {
        const { user, error } = await authMiddleware(request, env, 'ADMIN');
        if (error) return errRes(error, 401);
        
        const { fecha, seguidores, publicaciones, likes, comentarios, alcance } = await request.json();
        
        await env.CC_DB.prepare(`
          INSERT OR REPLACE INTO instagram_kpis (fecha, seguidores, publicaciones_totales, likes_promedio, comentarios_promedio, alcance_estimado)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(fecha || new Date().toISOString().split('T')[0], seguidores||0, publicaciones||0, likes||0, comentarios||0, alcance||0).run();
        
        return jsonRes({ success: true, message: 'KPIs de Instagram registrados correctamente' });
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
