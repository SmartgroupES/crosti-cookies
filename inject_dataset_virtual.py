import datetime
import random
import uuid

# Productos y sus precios
PRODUCTOS = [
    ('CC-CLA-001', 3.50, 0.4), # 40% de probabilidad
    ('CC-CLA-002', 3.50, 0.25),
    ('CC-CLA-003', 3.50, 0.15),
    ('CC-CLA-004', 3.50, 0.10),
    ('CC-DLX-001', 5.50, 0.05),
    ('CC-DLX-002', 5.50, 0.03),
    ('CC-DLX-003', 5.50, 0.02),
]

TIENDA = 'MAD-01'
CIUDAD = 'Madrid'

def generar_dataset(dias=400):
    hoy = datetime.date.today()
    fecha_inicio = hoy - datetime.timedelta(days=dias)
    
    sql_statements = [
        "DELETE FROM ventas_detalladas WHERE id_tienda = 'MAD-01';",
        "DELETE FROM control_mermas WHERE id_tienda = 'MAD-01';",
        f"DELETE FROM calendario_eventos WHERE ciudad = '{CIUDAD}';"
    ]
    
    # 1. Generar eventos externos
    festivos = []
    lluvias = []
    temporadas = []
    
    for i in range(dias + 30): # Proyectamos eventos futuros tmb
        fecha_eval = fecha_inicio + datetime.timedelta(days=i)
        mes = fecha_eval.month
        dia = fecha_eval.day
        
        # Festivos fijos (simulados)
        if (mes == 12 and dia == 25) or (mes == 1 and dia == 1) or (mes == 5 and dia == 2):
            festivos.append(fecha_eval)
            sql_statements.append(f"INSERT INTO calendario_eventos (fecha, ciudad, tipo, descripcion, multiplicador_demanda) VALUES ('{fecha_eval}', '{CIUDAD}', 'FESTIVO', 'Festivo Nacional/Local', 1.4);")
            continue
            
        # Lluvia aleatoria (aprox 10% de los días)
        if random.random() < 0.10:
            lluvias.append(fecha_eval)
            sql_statements.append(f"INSERT INTO calendario_eventos (fecha, ciudad, tipo, descripcion, multiplicador_demanda) VALUES ('{fecha_eval}', '{CIUDAD}', 'LLUVIA', 'Día Lluvioso', 0.85);")
            continue
            
        # Vacaciones Escolares (Agosto completo)
        if mes == 8:
            temporadas.append(fecha_eval)
            # Solo insertar una vez si queremos o todos los días. Mejor todos los días para simplificar SQL.
            sql_statements.append(f"INSERT OR IGNORE INTO calendario_eventos (fecha, ciudad, tipo, descripcion, multiplicador_demanda) VALUES ('{fecha_eval}', '{CIUDAD}', 'TEMPORADA_BAJA', 'Vacaciones Verano', 0.7);")

    # 2. Generar ventas
    for i in range(dias):
        fecha = fecha_inicio + datetime.timedelta(days=i)
        is_weekend = fecha.weekday() >= 5
        
        # Base de ventas
        base_ventas = random.randint(30, 60) if not is_weekend else random.randint(80, 150)
        
        # Ajustar por eventos
        if fecha in festivos:
            base_ventas = int(base_ventas * 1.4)
        elif fecha in lluvias:
            base_ventas = int(base_ventas * 0.85)
        elif fecha.month == 8:
            base_ventas = int(base_ventas * 0.7)
            
        # Simular una tendencia de crecimiento anual (ej: un 20% más este año respecto al año pasado)
        dias_desde_inicio = i
        factor_crecimiento = 1.0 + (0.2 * (dias_desde_inicio / 365.0))
        base_ventas = int(base_ventas * factor_crecimiento)
        
        # Ventas
        for v in range(base_ventas):
            hora = random.randint(11, 20) # Horario 11:30 a 20:30
            id_venta = f"V-{fecha.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6]}"
            
            # Elegir producto
            r = random.random()
            acum = 0
            prod_elegido = PRODUCTOS[0]
            for p in PRODUCTOS:
                acum += p[2]
                if r <= acum:
                    prod_elegido = p
                    break
                    
            cant = random.randint(1, 3)
            precio = prod_elegido[1]
            total = cant * precio
            
            sql = f"INSERT INTO ventas_detalladas (id_venta, id_tienda, fecha, hora, id_producto, cantidad, precio_unitario, total_linea) VALUES ('{id_venta}', '{TIENDA}', '{fecha}', {hora}, '{prod_elegido[0]}', {cant}, {precio}, {total});"
            sql_statements.append(sql)
            
        # Mermas (1 a 3 mermas por día)
        for m in range(random.randint(1, 3)):
            p = random.choice(PRODUCTOS)
            cant_merma = random.randint(1, 4)
            coste = round(cant_merma * 0.8, 2)
            sql_merma = f"INSERT INTO control_mermas (id_tienda, fecha, id_producto, cantidad_ud, motivo, coste_economico) VALUES ('{TIENDA}', '{fecha}', '{p[0]}', {cant_merma}, 'Rotura o caducidad', {coste});"
            sql_statements.append(sql_merma)

    with open('dataset_virtual_400.sql', 'w') as f:
        f.write("\n".join(sql_statements))
    
    print(f"✅ Generado dataset_virtual_400.sql con {dias} días de histórico y eventos externos.")

if __name__ == '__main__':
    generar_dataset(400)
