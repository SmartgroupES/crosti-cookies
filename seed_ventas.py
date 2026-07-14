import random
import uuid

# Productos típicos
productos = [
    ("CC-CLA-001", 3.50),
    ("CC-DLX-001", 5.50),
    ("CC-CAF-001", 2.50),
    ("CC-CAF-002", 3.20)
]

tiendas = ["MAD-01", "BCN-01"]
fechas = ["2026-07-12", "2026-07-13"]

sql_statements = []

for tienda in tiendas:
    for fecha in fechas:
        # Generar entre 20 y 40 ventas por día por tienda
        num_ventas = random.randint(20, 40)
        
        for _ in range(num_ventas):
            id_venta = str(uuid.uuid4())
            hora = random.randint(9, 20)
            
            # Cada venta tiene entre 1 y 3 líneas (productos distintos)
            num_lineas = random.randint(1, 3)
            productos_venta = random.sample(productos, num_lineas)
            
            for p in productos_venta:
                id_prod = p[0]
                precio = p[1]
                cant = random.randint(1, 3)
                total = round(precio * cant, 2)
                
                sql_statements.append(
                    f"INSERT INTO ventas_detalladas (id_venta, id_tienda, fecha, hora, id_producto, cantidad, precio_unitario, total_linea) "
                    f"VALUES ('{id_venta}', '{tienda}', '{fecha}', {hora}, '{id_prod}', {cant}, {precio}, {total});"
                )

with open('seed_ventas.sql', 'w') as f:
    f.write("\n".join(sql_statements))

print(f"Generadas {len(sql_statements)} lineas de ventas en seed_ventas.sql")
