import datetime
import random

def generate_instagram_data(weeks=12):
    hoy = datetime.date.today()
    sql_statements = []
    
    # Valores iniciales (hace 12 semanas)
    seguidores = 10500
    publicaciones = 310
    
    # Generar un registro por semana
    for i in range(weeks, -1, -1):
        fecha = hoy - datetime.timedelta(weeks=i)
        
        # Crecimiento orgánico semanal
        seguidores += random.randint(20, 150)
        
        # Publicaciones en esa semana (1 a 4)
        posts_semana = random.randint(1, 4)
        publicaciones += posts_semana
        
        # Engagement
        likes_promedio = random.randint(300, 800) + (seguidores * 0.01)
        comentarios_promedio = random.randint(10, 50)
        alcance_estimado = seguidores * random.uniform(0.3, 0.6)
        
        sql = f"""INSERT OR IGNORE INTO instagram_kpis 
        (fecha, seguidores, publicaciones_totales, likes_promedio, comentarios_promedio, alcance_estimado)
        VALUES ('{fecha}', {seguidores}, {publicaciones}, {round(likes_promedio, 2)}, {round(comentarios_promedio, 2)}, {round(alcance_estimado, 2)});"""
        
        sql_statements.append(sql)

    with open('ig_data.sql', 'w') as f:
        f.write("\n".join(sql_statements))
        
    print(f"✅ Se han generado {weeks} semanas de histórico de Instagram.")

if __name__ == '__main__':
    generate_instagram_data()
