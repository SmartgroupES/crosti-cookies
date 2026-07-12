import sys

def inject(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    libs = '''
  <!-- LIBRERIAS PARA REPORTES -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js"></script>
  <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
'''
    if 'jspdf.umd.min.js' not in content:
        content = content.replace('</head>', libs + '</head>')

    html_panel = '''
      <!-- ══ CENTRO DE REPORTES ══ -->
      <div class="tab-panel" id="panel-reportes">
        <div class="filter-bar">
          <select id="repTiendaSelect" class="filter-input">
            <option value="TODAS">Todas las tiendas (Consolidado)</option>
            <option value="BCN-01">BCN-01 - Barcelona (Piloto)</option>
            <option value="MAD-01">MAD-01 - Simulación Madrid</option>
            <option value="VAL-01">VAL-01 - Valencia</option>
          </select>
          <input type="date" id="repDesde" class="filter-input">
          <span style="font-size:12px;color:var(--text-muted)">hasta</span>
          <input type="date" id="repHasta" class="filter-input">
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-top: 24px;">
          <!-- Tarjetas de Reportes -->
          
          <div class="card">
            <div class="card-title">📈 Ventas Detalladas</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Desglose de tickets, unidades vendidas y totales.</p>
            <div style="display:flex;gap:8px">
              <button class="btn" style="flex:1" onclick="consultarReporte('ventas', 'Ventas Detalladas')">👁️ Ver</button>
              <button class="btn btn-primary" onclick="exportarPDF('ventas', 'Ventas Detalladas')">📄 PDF</button>
              <button class="btn btn-primary" style="background:#22863a" onclick="exportarExcel('ventas', 'Ventas Detalladas')">📗 XLSX</button>
            </div>
          </div>

          <div class="card">
            <div class="card-title">📦 Trazabilidad Inventario</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Libro mayor de movimientos (entradas, transferencias).</p>
            <div style="display:flex;gap:8px">
              <button class="btn" style="flex:1" onclick="consultarReporte('inventario', 'Trazabilidad Inventario')">👁️ Ver</button>
              <button class="btn btn-primary" onclick="exportarPDF('inventario', 'Trazabilidad Inventario')">📄 PDF</button>
              <button class="btn btn-primary" style="background:#22863a" onclick="exportarExcel('inventario', 'Trazabilidad Inventario')">📗 XLSX</button>
            </div>
          </div>

          <div class="card">
            <div class="card-title">🗑️ Control de Mermas</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Análisis de mermas por motivo y producto.</p>
            <div style="display:flex;gap:8px">
              <button class="btn" style="flex:1" onclick="consultarReporte('mermas', 'Control de Mermas')">👁️ Ver</button>
              <button class="btn btn-primary" onclick="exportarPDF('mermas', 'Control de Mermas')">📄 PDF</button>
              <button class="btn btn-primary" style="background:#22863a" onclick="exportarExcel('mermas', 'Control de Mermas')">📗 XLSX</button>
            </div>
          </div>

          <div class="card">
            <div class="card-title">🧑‍🍳 Rendimiento de Personal</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Horas trabajadas y ratio de ventas por hora.</p>
            <div style="display:flex;gap:8px">
              <button class="btn" style="flex:1" onclick="consultarReporte('personal', 'Rendimiento Personal')">👁️ Ver</button>
              <button class="btn btn-primary" onclick="exportarPDF('personal', 'Rendimiento Personal')">📄 PDF</button>
              <button class="btn btn-primary" style="background:#22863a" onclick="exportarExcel('personal', 'Rendimiento Personal')">📗 XLSX</button>
            </div>
          </div>

          <div class="card">
            <div class="card-title">📊 Food Cost Teórico</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Comparativa teórica de escandallos y precios.</p>
            <div style="display:flex;gap:8px">
              <button class="btn" style="flex:1" onclick="consultarReporte('food_cost', 'Food Cost')">👁️ Ver</button>
              <button class="btn btn-primary" onclick="exportarPDF('food_cost', 'Food Cost')">📄 PDF</button>
              <button class="btn btn-primary" style="background:#22863a" onclick="exportarExcel('food_cost', 'Food Cost')">📗 XLSX</button>
            </div>
          </div>

          <div class="card">
            <div class="card-title">👥 CRM VIP Club</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Listado de clientes segmentados y ticket medio.</p>
            <div style="display:flex;gap:8px">
              <button class="btn" style="flex:1" onclick="consultarReporte('crm', 'CRM Clientes')">👁️ Ver</button>
              <button class="btn btn-primary" onclick="exportarPDF('crm', 'CRM Clientes')">📄 PDF</button>
              <button class="btn btn-primary" style="background:#22863a" onclick="exportarExcel('crm', 'CRM Clientes')">📗 XLSX</button>
            </div>
          </div>

          <div class="card">
            <div class="card-title">🧾 Compras y Proveedores</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">Resumen de facturas y volumen de compra.</p>
            <div style="display:flex;gap:8px">
              <button class="btn" style="flex:1" onclick="consultarReporte('compras', 'Facturas de Compras')">👁️ Ver</button>
              <button class="btn btn-primary" onclick="exportarPDF('compras', 'Facturas de Compras')">📄 PDF</button>
              <button class="btn btn-primary" style="background:#22863a" onclick="exportarExcel('compras', 'Facturas de Compras')">📗 XLSX</button>
            </div>
          </div>

        </div>
      </div>

      <!-- Modal Vista Previa de Reporte -->
      <div id="modalReporte" class="modal" style="display:none;">
        <div class="modal-content" style="max-width: 900px; max-height: 80vh; overflow-y: auto;">
          <div class="modal-header">
            <h3 id="modalReporteTitulo">Vista Previa</h3>
            <button class="modal-close" onclick="document.getElementById('modalReporte').style.display='none'">&times;</button>
          </div>
          <div class="modal-body" style="margin-top: 16px; overflow-x: auto;">
            <table class="table" id="reportePreviewTable">
              <thead><tr id="reportePreviewHead"></tr></thead>
              <tbody id="reportePreviewBody"></tbody>
            </table>
          </div>
        </div>
      </div>
'''
    if 'id="panel-reportes"' not in content:
        content = content.replace("<!-- ══ VISTA POR TIENDA ══ -->", html_panel + "\n      <!-- ══ VISTA POR TIENDA ══ -->")

    js_logic = '''
  // ─── REPORTES Y EXPORTACIÓN ─────────────────────────────────
  function initFechasReportes() {
    const today = new Date();
    document.getElementById('repHasta').value = today.toISOString().split('T')[0];
    today.setDate(today.getDate() - 30);
    document.getElementById('repDesde').value = today.toISOString().split('T')[0];
  }

  async function getDatosReporte(tipo) {
    const tienda = document.getElementById('repTiendaSelect').value;
    const desde = document.getElementById('repDesde').value;
    const hasta = document.getElementById('repHasta').value;
    const res = await API(`/api/reportes/${tipo}?tienda=${tienda}&desde=${desde}&hasta=${hasta}`);
    if(!res.ok) throw new Error('Error al cargar reporte');
    return await res.json();
  }

  async function consultarReporte(tipo, titulo) {
    try {
      const data = await getDatosReporte(tipo);
      if(!data.length) return alert('No hay datos para este reporte en las fechas seleccionadas');
      
      const head = Object.keys(data[0]);
      document.getElementById('reportePreviewHead').innerHTML = head.map(h => `<th>${h}</th>`).join('');
      document.getElementById('reportePreviewBody').innerHTML = data.map(row => 
        `<tr>${head.map(h => `<td>${row[h] !== null ? row[h] : '-'}</td>`).join('')}</tr>`
      ).join('');
      
      document.getElementById('modalReporteTitulo').textContent = titulo;
      document.getElementById('modalReporte').style.display = 'flex';
    } catch(e) {
      alert(e.message);
    }
  }

  async function exportarPDF(tipo, titulo) {
    try {
      const data = await getDatosReporte(tipo);
      if(!data.length) return alert('No hay datos para exportar');
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('landscape');
      
      const head = Object.keys(data[0]);
      const body = data.map(row => head.map(h => row[h] !== null ? row[h] : '-'));
      
      doc.text(titulo + ' - Crosti Cookies', 14, 15);
      doc.setFontSize(10);
      doc.text(`Fecha Generación: ${new Date().toLocaleDateString()}`, 14, 22);
      
      doc.autoTable({
        head: [head],
        body: body,
        startY: 28,
        theme: 'grid',
        styles: { fontSize: 8 }
      });
      
      doc.save(`Reporte_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch(e) {
      alert(e.message);
    }
  }

  async function exportarExcel(tipo, titulo) {
    try {
      const data = await getDatosReporte(tipo);
      if(!data.length) return alert('No hay datos para exportar');
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");
      
      XLSX.writeFile(wb, `Reporte_${tipo}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch(e) {
      alert(e.message);
    }
  }
'''
    if 'function consultarReporte(' not in content:
        content = content.replace("// ─── INICIALIZACIÓN GLOBALES ───", js_logic + "\n  // ─── INICIALIZACIÓN GLOBALES ───")

    with open(filepath, 'w') as f:
        f.write(content)

inject('dashboard-admin.html')
