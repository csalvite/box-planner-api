# Dirección de producto: BoxPlanner como SaaS

## Visión del producto

BoxPlanner puede evolucionar hacia un SaaS para gimnasios, entrenadores y centros deportivos que necesitan planificar, organizar y reutilizar sesiones de entrenamiento de forma profesional.

La idea central es convertir la planificación deportiva en un sistema ordenado, reutilizable y fácil de mantener. En lugar de preparar clases desde cero cada vez, el entrenador podría construir una biblioteca de bloques, ejercicios y sesiones completas, adaptarlas según nivel o tipo de grupo y mantener una planificación más consistente.

El foco inicial debería mantenerse en boxeo y deportes de combate, porque el dominio ya está orientado a bloques, ejercicios, técnica, cardio, saco, niveles y sesiones personales o grupales. Más adelante podría abrirse a otros tipos de entrenamiento, pero no conviene diluir el producto demasiado pronto.

## Usuario objetivo

Los usuarios principales serían:

- Entrenadores personales de boxeo o deportes de combate.
- Gimnasios pequeños o medianos con clases grupales.
- Academias de boxeo, kickboxing, MMA o entrenamiento funcional con estructura por sesiones.
- Coaches que necesitan preparar entrenamientos personalizados para varios alumnos.
- Responsables técnicos que quieren estandarizar sesiones entre varios entrenadores.

En una primera versión SaaS, el perfil más realista es un entrenador o gimnasio pequeño que necesita orden y reutilización, pero no quiere una herramienta compleja de gestión empresarial.

## Problema que resuelve

Muchos entrenadores planifican clases en notas, hojas de cálculo, mensajes, documentos sueltos o directamente de memoria. Eso genera varios problemas:

- Se pierde tiempo preparando sesiones repetidas.
- Es difícil mantener consistencia entre clases.
- Los entrenamientos no siempre quedan documentados.
- Cuesta reutilizar bloques buenos de trabajo.
- Es complicado adaptar sesiones por nivel, duración o tamaño de grupo.
- Si hay varios entrenadores, cada uno trabaja con su propio método.
- No existe una biblioteca común de ejercicios, bloques y sesiones.

BoxPlanner resuelve esto centralizando la planificación en una estructura clara:

- Ejercicios.
- Bloques reutilizables.
- Entrenamientos completos.
- Orden y duración.
- Niveles.
- Tipos de sesión.
- Biblioteca propia de cada entrenador o gimnasio.

## Funcionalidades principales del SaaS

### Planificación de entrenamientos

- Crear bloques reutilizables de entrenamiento.
- Crear ejercicios dentro de bloques.
- Ordenar ejercicios dentro de un bloque.
- Calcular duración estimada de cada bloque.
- Crear entrenamientos completos combinando bloques.
- Ordenar bloques dentro de un entrenamiento.
- Ajustar duración personalizada de bloques dentro de una sesión.
- Calcular duración total del entrenamiento.
- Clasificar bloques por categoría.
- Filtrar por nivel, tipo de entrenamiento o duración.

### Gestión de usuarios y roles

- Crear usuarios administradores y entrenadores.
- Asignar roles.
- Permitir que un administrador gestione entrenadores.
- Consultar el usuario autenticado.
- Evolucionar desde contraseñas temporales hacia invitaciones por email.

### Biblioteca de contenido

- Mantener una biblioteca de bloques propios.
- Reutilizar bloques en distintos entrenamientos.
- Asociar media a ejercicios cuando el módulo esté implementado.
- Marcar ciertos bloques como públicos o compartidos dentro de una organización.

### Gestión para gimnasios

En una versión SaaS más completa, el sistema debería soportar:

- Organizaciones o gimnasios.
- Miembros dentro de una organización.
- Roles por organización.
- Biblioteca compartida del gimnasio.
- Entrenamientos creados por distintos entrenadores.
- Visibilidad entre contenido privado, compartido y público.

### Dashboard y seguimiento

El dashboard debería construirse solo cuando haya datos suficientes. Algunas métricas realistas serían:

- Número de bloques creados.
- Número de entrenamientos planificados.
- Duración media de las sesiones.
- Distribución por tipo de entrenamiento.
- Distribución por nivel.
- Bloques más reutilizados.

## Módulos del sistema

El producto puede dividirse en dos grandes áreas: gestión y planificación.

### Área de gestión

Esta parte cubre la administración del SaaS y de los usuarios.

Módulos esperados:

- Autenticación.
- Perfil de usuario.
- Roles y permisos.
- Administración de usuarios.
- Organizaciones o gimnasios.
- Miembros de organización.
- Configuración del gimnasio.
- Planes o suscripciones si se monetiza como SaaS.

### Área de planificación

Esta parte cubre el valor principal del producto.

Módulos esperados:

- Categorías de bloques.
- Bloques de entrenamiento.
- Ejercicios.
- Media asociada a ejercicios.
- Entrenamientos completos.
- Reordenación de ejercicios y bloques.
- Cálculo de duraciones.
- Biblioteca reutilizable.
- Filtros y búsqueda.
- Dashboard de planificación.

## Qué partes del sistema actual se reutilizan

El backend actual ya contiene una base aprovechable:

- Arquitectura NestJS modular.
- Conexión a Supabase/PostgreSQL con Prisma.
- Modelo de `Profile` para usuarios y roles.
- Guard de autenticación con JWT de Supabase.
- Decorador `AuthUser`.
- Creación de usuarios desde `AdminService`.
- CRUD de bloques.
- CRUD de ejercicios.
- CRUD de entrenamientos.
- Tabla intermedia `TrainingBlock` para reutilizar bloques.
- Cálculo de duración de bloques.
- Cálculo de duración de entrenamientos.
- DTOs con validación.
- Logging con Winston.
- Tests iniciales.

El dominio principal ya está bien orientado: bloques, ejercicios y entrenamientos forman una estructura coherente para una herramienta de planificación.

## Qué partes nuevas hay que construir

Para convertirlo en un SaaS real habría que construir, como mínimo:

- Endpoint `/auth/me`.
- Gestión más completa de sesión y perfil.
- Guard reusable de roles.
- Modelo de organización o gimnasio.
- Relación entre usuarios y organizaciones.
- Roles por organización.
- Separación multi-tenant de datos.
- Permisos claros sobre quién puede ver, crear, editar o borrar contenido.
- Gestión real de invitaciones por email.
- Endpoints para categorías de bloques o seeds controlados.
- Implementación real del módulo de media.
- Integración con Supabase Storage si se quieren imágenes o videos.
- Implementación real del dashboard.
- Búsqueda y filtros.
- Documentación OpenAPI/Swagger.
- Tests de autorización y casos de negocio.
- Estrategia clara de migraciones de base de datos.
- Sistema de planes, límites y billing si se monetiza como SaaS.

También habría que revisar el modelo actual para añadir integridad referencial, índices, enums y constraints de orden.

## Valor para portfolio

Este proyecto tiene valor como portfolio porque demuestra trabajo backend más allá de un CRUD genérico:

- Usa NestJS con una arquitectura modular.
- Integra autenticación real con Supabase.
- Tiene control básico de roles.
- Usa Prisma contra PostgreSQL.
- Modela un dominio concreto y entendible.
- Implementa relaciones reales entre entidades.
- Incluye lógica de negocio como ordenación y cálculo de duraciones.
- Tiene una ruta clara hacia multiusuario, SaaS y permisos.
- Permite hablar de decisiones técnicas reales: ownership, roles, media, multi-tenancy, testing y evolución del schema.

Bien documentado y con algunos módulos completados, puede mostrar capacidad para construir un backend realista, mantenible y orientado a producto.

## Valor para negocio

El valor de negocio está en ahorrar tiempo y mejorar la calidad de la planificación para entrenadores y gimnasios.

Un gimnasio pequeño no siempre necesita un ERP completo. Muchas veces necesita una herramienta simple para preparar clases, compartir estructura entre entrenadores y mantener una biblioteca de sesiones que pueda reutilizarse.

BoxPlanner podría ocupar ese espacio si se mantiene enfocado:

- Planificación sencilla.
- Reutilización de contenido.
- Organización por niveles y tipos de sesión.
- Trabajo colaborativo para gimnasios.
- Bajo coste de adopción.

El producto no debería intentar competir de inicio con plataformas completas de gestión de gimnasios. Su punto fuerte debería ser la planificación técnica de entrenamientos.

## Posibles formas de monetización

### Plan gratuito

Para entrenadores individuales.

Posibles límites:

- Número limitado de bloques.
- Número limitado de entrenamientos.
- Sin organización compartida.
- Sin media avanzada.

### Plan individual

Para entrenadores personales.

Posibles ventajas:

- Bloques ilimitados.
- Entrenamientos ilimitados.
- Biblioteca personal.
- Filtros avanzados.
- Exportación o impresión de sesiones.

### Plan gimnasio

Para gimnasios o academias pequeñas.

Posibles ventajas:

- Varios entrenadores.
- Biblioteca compartida.
- Roles por organización.
- Dashboard.
- Invitaciones.
- Contenido compartido entre miembros.

### Plan profesional

Para centros con más volumen.

Posibles ventajas:

- Más usuarios.
- Más almacenamiento de media.
- Soporte prioritario.
- Plantillas avanzadas.
- Historial y analítica más completa.

### Monetización adicional

Opciones realistas a futuro:

- Packs de plantillas de entrenamiento.
- Biblioteca premium de bloques.
- Exportaciones profesionales en PDF.
- Marca blanca ligera para gimnasios.
- Almacenamiento adicional para videos.

Estas opciones deberían considerarse después de validar que los usuarios realmente valoran la planificación, reutilización y organización de entrenamientos.

## Dirección recomendada

La dirección más sólida es construir primero un SaaS pequeño pero completo para entrenadores y gimnasios pequeños:

1. Autenticación clara.
2. Perfil de usuario.
3. Biblioteca personal de bloques.
4. Creación de entrenamientos completos.
5. Reutilización y ordenación.
6. Dashboard básico.
7. Organizaciones.
8. Invitaciones.
9. Biblioteca compartida.
10. Planes de pago.

El producto debe crecer desde la planificación, no desde la administración. La administración es necesaria para SaaS, pero el valor diferencial está en que un entrenador pueda preparar mejores sesiones en menos tiempo.
