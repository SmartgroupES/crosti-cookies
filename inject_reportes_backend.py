import sys

def inject(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    backend_code = '''
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
'''
    if 'GET /api/reportes/' not in content:
        content = content.replace("// ─── API INVENTARIO & PROVEEDORES", backend_code + "\n      // ─── API INVENTARIO & PROVEEDORES")

    with open(filepath, 'w') as f:
        f.write(content)

inject('_worker.js')
