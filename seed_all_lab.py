import random
import uuid
from datetime import datetime, timedelta

# Fechas (últimos 30 días hasta hoy)
end_date = datetime(2026, 7, 13) # Hardcoded to the current known date context or dynamically calculated
start_date = end_date - timedelta(days=30)
fechas = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(31)]

tienda = "MAD-01"

productos = [
    ("CC-CLA-001", 3.50),
    ("CC-DLX-001", 5.50),
    ("CC-CAF-001", 2.50),
    ("CC-CAF-002", 3.20),
    ("CC-ESP-001", 4.00)
]

ingredientes = [
    "ING-HAR-01", "ING-CHO-01", "ING-MAN-01", "ING-HUE-01", "ING-AZU-01"
]

operarios = ["OP-MAD-001", "OP-MAD-002"]

sql_statements = []

for fecha in fechas:
    # 1. Ventas Detalladas
    num_ventas = random.randint(15, 35)
    ventas_dia_euros = 0
    for _ in range(num_ventas):
        id_venta = str(uuid.uuid4())
        hora = random.randint(10, 21)
        num_lineas = random.randint(1, 4)
        productos_venta = random.sample(productos, num_lineas)
        
        for p in productos_venta:
            cant = random.randint(1, 3)
            total = round(p[1] * cant, 2)
            ventas_dia_euros += total
            sql_statements.append(
                f"INSERT INTO ventas_detalladas (id_venta, id_tienda, fecha, hora, id_producto, cantidad, precio_unitario, total_linea) "
                f"VALUES ('{id_venta}', '{tienda}', '{fecha}', {hora}, '{p[0]}', {cant}, {p[1]}, {total});"
            )

    # 2. Control Mermas (1 a 3 mermas por día)
    for _ in range(random.randint(1, 3)):
        prod = random.choice(productos)
        cant_merma = random.randint(1, 3)
        coste = round(prod[1] * 0.3 * cant_merma, 2) # Coste ficticio 30% del precio
        motivo = random.choice(["Rotura", "Caducidad", "Control Calidad"])
        sql_statements.append(
            f"INSERT INTO control_mermas (id_tienda, fecha, id_producto, cantidad_ud, motivo, coste_economico, operario_id) "
            f"VALUES ('{tienda}', '{fecha}', '{prod[0]}', {cant_merma}, '{motivo}', {coste}, '{random.choice(operarios)}');"
        )

    # 3. Inventarios Diarios
    for ing in ingredientes:
        stock_apertura = round(random.uniform(10.0, 50.0), 2)
        entradas = round(random.uniform(0.0, 20.0), 2) if random.random() > 0.7 else 0
        consumo = round(random.uniform(5.0, 15.0), 2)
        stock_fisico = round(stock_apertura + entradas - consumo + random.uniform(-1.0, 1.0), 2) # Ligera desviación
        desviacion = round(stock_fisico - (stock_apertura + entradas - consumo), 2)
        sql_statements.append(
            f"INSERT INTO inventarios_diarios (id_tienda, fecha, id_ingrediente, stock_apertura, entradas_dia, consumo_teorico, stock_fisico, desviacion, operario_id) "
            f"VALUES ('{tienda}', '{fecha}', '{ing}', {stock_apertura}, {entradas}, {consumo}, {stock_fisico}, {desviacion}, '{random.choice(operarios)}');"
        )
        
    # 4. Gestión Personal (2 turnos al día)
    for op in operarios:
        if op == "OP-MAD-001":
            entrada = "09:00"
            salida = "16:00"
            horas = 7.0
        else:
            entrada = "15:00"
            salida = "22:00"
            horas = 7.0
            
        ventas_turno = round(ventas_dia_euros * random.uniform(0.4, 0.6), 2)
        kpi = round(ventas_turno / horas, 2)
        sql_statements.append(
            f"INSERT INTO gestion_personal (id_tienda, id_operario, fecha, turno, hora_entrada, hora_salida, horas_trabajadas, ventas_periodo, kpi_ventas_hora) "
            f"VALUES ('{tienda}', '{op}', '{fecha}', 'Normal', '{entrada}', '{salida}', {horas}, {ventas_turno}, {kpi});"
        )

# Dividir en chunks para no saturar SQLite (ej: 500 inserts por query)
chunk_size = 500
for i in range(0, len(sql_statements), chunk_size):
    chunk = sql_statements[i:i+chunk_size]
    with open(f'seed_lab_{i//chunk_size}.sql', 'w') as f:
        f.write("\n".join(chunk))

print(f"Generados {len(sql_statements)} statements en {len(sql_statements)//chunk_size + 1} archivos SQL.")
