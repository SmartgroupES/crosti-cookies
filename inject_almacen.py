import sys

def inject(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    html_panel = '''
      <!-- ══ CONTROL DE ALMACEN ══ -->
      <div class="tab-panel" id="panel-almacen">
        <div class="filter-bar">
          <select id="almacenTiendaSelect" class="filter-input" onchange="cargarAlmacen()">
            <option value="BCN-01">BCN-01 - Barcelona (Piloto)</option>
            <option value="MAD-01">MAD-01 - Madrid</option>
            <option value="VAL-01">VAL-01 - Valencia</option>
          </select>
          <button class="btn" onclick="cargarAlmacen()">↻ Actualizar</button>
          <button class="btn btn-primary" onclick="abrirModalTransferir()">⇄ Transferir Stock</button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 24px;">
          <!-- ZONAS DE ALMACENAMIENTO -->
          <div class="card">
            <div class="card-title">❄️ Congelador (Masa IQF)</div>
            <table class="table" id="almacenCongeladorTable">
              <thead><tr><th>Item</th><th>Stock</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
          
          <div class="card">
            <div class="card-title">🧊 Refrigerado & Seco</div>
            <table class="table" id="almacenSecoTable">
              <thead><tr><th>Item</th><th>Stock</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>

          <div class="card">
            <div class="card-title">⏳ Fermentación & Adecuación</div>
            <table class="table" id="almacenTransitoTable">
              <thead><tr><th>Item</th><th>Stock</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>

          <div class="card">
            <div class="card-title">🍪 Vitrina (Horneado)</div>
            <table class="table" id="almacenVitrinaTable">
              <thead><tr><th>Item</th><th>Stock</th></tr></thead>
              <tbody></tbody>
            </table>
          </div>
        </div>

        <div class="card" style="margin-top: 24px">
          <div class="card-title">Libro de Movimientos Recientes</div>
          <table class="table" id="almacenMovimientosTable">
            <thead>
              <tr><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Origen</th><th>Destino</th><th>Item</th><th>Cant.</th></tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>

      <!-- Modal Transferir Stock -->
      <div id="modalTransferir" class="modal">
        <div class="modal-content" style="max-width: 400px">
          <div class="modal-header">
            <h3>Transferir Stock</h3>
            <button class="modal-close" onclick="document.getElementById('modalTransferir').style.display='none'">&times;</button>
          </div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:12px; margin-top: 16px;">
            <select id="trfItem" class="filter-input"></select>
            
            <div style="display:flex; gap:12px">
              <div style="flex:1">
                <label style="font-size:12px; color:var(--text-muted)">Origen</label>
                <select id="trfOrigen" class="filter-input">
                  <option value="CONGELADO">Congelador</option>
                  <option value="TRANSITO">Fermentación</option>
                  <option value="SECO">Almacén Seco</option>
                  <option value="VITRINA">Vitrina</option>
                </select>
              </div>
              <div style="flex:1">
                <label style="font-size:12px; color:var(--text-muted)">Destino</label>
                <select id="trfDestino" class="filter-input">
                  <option value="TRANSITO">Fermentación</option>
                  <option value="VITRINA">Vitrina</option>
                  <option value="CONGELADO">Congelador</option>
                  <option value="SECO">Almacén Seco</option>
                </select>
              </div>
            </div>

            <input type="number" id="trfCant" class="filter-input" placeholder="Cantidad" min="1">

            <button class="btn btn-primary" style="width:100%" onclick="ejecutarTransferencia()">Confirmar Movimiento</button>
          </div>
        </div>
      </div>
'''
    
    # Check if already injected
    if 'id="panel-almacen"' not in content:
        content = content.replace("<!-- ══ VISTA POR TIENDA ══ -->", html_panel + "\n      <!-- ══ VISTA POR TIENDA ══ -->")

    js_logic = '''
  // ─── ALMACEN Y MOVIMIENTOS ─────────────────────────────────
  async function cargarAlmacen() {
    const tienda = document.getElementById('almacenTiendaSelect').value;
    try {
      const res = await API('/api/inventario/stock/' + tienda);
      const stock = await res.json();
      
      const cong = stock.filter(s => s.estado === 'CONGELADO');
      const seco = stock.filter(s => s.estado === 'SECO' || s.estado === 'REFRIGERADO');
      const trans = stock.filter(s => s.estado === 'TRANSITO');
      const vitri = stock.filter(s => s.estado === 'VITRINA');

      const renderTbody = (arr, id) => {
        const tbody = document.querySelector('#' + id + ' tbody');
        if(!arr.length) tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#888">Sin stock</td></tr>';
        else tbody.innerHTML = arr.map(s => `<tr><td>${s.id_item}</td><td style="text-align:right;font-weight:600">${s.cantidad} ${s.unidad}</td></tr>`).join('');
      };

      renderTbody(cong, 'almacenCongeladorTable');
      renderTbody(seco, 'almacenSecoTable');
      renderTbody(trans, 'almacenTransitoTable');
      renderTbody(vitri, 'almacenVitrinaTable');

      // Cargar movimientos
      const rMov = await API('/api/inventario/movimientos/' + tienda);
      const movs = await rMov.json();
      const mBody = document.querySelector('#almacenMovimientosTable tbody');
      if(!movs.length) mBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888">Sin movimientos</td></tr>';
      else mBody.innerHTML = movs.map(m => `
        <tr>
          <td>${m.fecha.split('-').reverse().join('/')}</td>
          <td>${m.hora.substring(0,5)}</td>
          <td><span class="badge badge-${m.tipo_movimiento.toLowerCase()}">${m.tipo_movimiento}</span></td>
          <td>${m.origen || '-'}</td>
          <td>${m.destino || '-'}</td>
          <td>${m.id_item}</td>
          <td style="text-align:right;font-weight:600">${m.cantidad}</td>
        </tr>
      `).join('');

      // Poblar select de transferencias
      const itemsSelect = document.getElementById('trfItem');
      const items = [...new Set(stock.map(s => s.id_item))];
      itemsSelect.innerHTML = '<option value="">Selecciona un Item...</option>' + items.map(i => `<option value="${i}">${i}</option>`).join('');

    } catch (e) {
      console.error(e);
      // alert('Error cargando almacén');
    }
  }

  function abrirModalTransferir() {
    document.getElementById('trfItem').value = '';
    document.getElementById('trfCant').value = '';
    document.getElementById('modalTransferir').style.display = 'flex';
  }

  async function ejecutarTransferencia() {
    const item = document.getElementById('trfItem').value;
    const origen = document.getElementById('trfOrigen').value;
    const destino = document.getElementById('trfDestino').value;
    const cant = parseFloat(document.getElementById('trfCant').value);
    const tienda = document.getElementById('almacenTiendaSelect').value;

    if(!item || !cant || origen === destino) return alert('Datos inválidos');

    try {
      const res = await API('/api/inventario/transferir', {
        method: 'POST',
        body: JSON.stringify({
          id_tienda: tienda,
          id_item: item,
          tipo_item: item.startsWith('ING') ? 'INGREDIENTE' : 'PRODUCTO',
          cantidad: cant,
          unidad: 'ud',
          origen: origen,
          destino: destino
        })
      });
      if(res.ok) {
        document.getElementById('modalTransferir').style.display = 'none';
        cargarAlmacen();
      } else {
        const err = await res.json();
        alert(err.error || 'Error en transferencia');
      }
    } catch(e) {
      alert('Error de red');
    }
  }
'''
    if 'async function cargarAlmacen()' not in content:
        content = content.replace("// ─── INICIALIZACIÓN GLOBALES ───", js_logic + "\n  // ─── INICIALIZACIÓN GLOBALES ───")

    with open(filepath, 'w') as f:
        f.write(content)

inject('dashboard-admin.html')
