# Visión y Contexto del Proyecto: Crosti Cookies PWA

## Objetivo Principal
Desarrollar un sistema de gestión inteligente e integral para **Crosti Cookies**, una empresa de fabricación y venta de galletas en España. El sistema actuará como el núcleo central para la toma de decisiones, predicción de demanda (producción y ventas) y alineación con los objetivos operativos de expansión nacional.

## Estructura Física y Logística
1. **Obrador Central**: Centro de producción y proveedor principal de todas las tiendas (propias y franquiciadas).
2. **Tienda Modelo (Barcelona)**: Tienda piloto física que servirá como entorno de pruebas real para validar procesos y operativas.
3. **Tienda Virtual (Test)**: Entorno simulado con datos teóricos (datasets) que permite probar nuevas funcionalidades, herramientas analíticas y modelos de predicción antes de su despliegue con datos reales.

## Pilares Tecnológicos y Funcionales
- **Inteligencia y Predicción**: Modelos para prever la demanda, optimizando tanto la venta al cliente final como la cadena de suministro y producción.
- **Gestión Integral**: Vinculación de métricas de ventas, fabricación, logística, marketing y promoción.
- **Evolución Continua**: La PWA es un ente vivo. La dirección irá agregando y modificando módulos según el crecimiento del negocio. Servirá como repositorio documental, respaldo en la nube y sistema de apoyo a la toma de decisiones.

## Roles del Sistema (Accesos)
1. **Dirección (Admin)**: Control total, análisis predictivo, evaluación de rendimiento, marketing y gestión de la expansión.
2. **Franquiciado**: Gestión operativa de su local específico, pedidos al obrador central, seguimiento de sus propias métricas.
3. **Operativo de Tienda**: Gestión del día a día, control de stock, caja, mermas y procesos estándar en tienda.

## Estrategia de Implementación
1. **Fase de Simulación**: Uso de la Tienda Virtual (Test) para desarrollar los módulos matemáticos e interfaces utilizando información teórica.
2. **Fase Piloto**: Conexión de los datos reales de la Tienda Modelo de Barcelona y del Obrador Central para validar y formalizar los procedimientos.
3. **Fase de Expansión**: Uso de la plataforma validada como estándar para las futuras franquicias que se abran en el resto de España.

## Visión a Largo Plazo: Evolución a SaaS Multi-Tenant (B2B)
El objetivo final de esta plataforma es evolucionar desde un software interno para Crosti Cookies hacia un producto **SaaS B2B Multi-Tenant**. 
El plan consta de 3 fases:
1. **Fase 1: Perfeccionar "El Piloto"**: Usar Crosti Cookies como prueba de estrés para pulir inventarios, mermas, *food cost* y operativas de franquicia.
2. **Fase 2: Arquitectura Multi-Tenant**: Agregar `id_empresa` a la base de datos para usar el mismo *Backbone* de código, aislando los datos de cada cliente.
3. **Fase 3: Particularidades por Módulos**: Encender/apagar módulos según la industria (ej. Heladerías vs Empanadas) usando la misma base lógica.
