# Guía de uso actual de BoxPlanner

## Qué es BoxPlanner ahora mismo

BoxPlanner es, ahora mismo, un backend NestJS para planificar entrenamientos de boxeo dentro de un modelo SaaS basado en organizaciones.

El sistema ya tiene una base multi-tenant: los recursos principales pertenecen a una organización y el usuario autenticado accede a ellos mediante membresía activa.

La parte más madura del producto es el núcleo de planificación:

- organizaciones
- miembros de organización
- bloques reutilizables
- ejercicios dentro de bloques
- entrenamientos compuestos por bloques
- cálculo de duración de bloques y entrenamientos
- autenticación con JWT de Supabase
- documentación Swagger

No es todavía una app completa de usuario final. Es una API preparada para conectar un frontend.

## Qué problema resuelve

BoxPlanner busca ayudar a entrenadores y gimnasios a dejar de planificar clases en notas sueltas, hojas de cálculo o de memoria.

El problema principal es ordenar y reutilizar trabajo técnico:

- crear una biblioteca de bloques de entrenamiento
- guardar ejercicios dentro de cada bloque
- montar sesiones completas combinando bloques
- ajustar orden y duración
- compartir contenido dentro de una organización o gimnasio
- mantener una estructura clara entre varios entrenadores

El valor inicial no está en gestionar todo un gimnasio, sino en planificar mejores sesiones con menos fricción.

## Quién lo usaría

### Funcionando como modelo de producto

- entrenadores de boxeo
- entrenadores personales de deportes de combate
- gimnasios pequeños o medianos
- academias de boxeo, kickboxing o MMA
- responsables técnicos que quieren organizar sesiones reutilizables

### Pendiente como experiencia final

Todavía no existe una interfaz completa para estos usuarios. El backend ya modela el dominio, pero la experiencia usable dependerá del frontend.

## Flujo principal actual

### Funcionando

El flujo backend actual es:

1. El usuario inicia sesión con Supabase Auth y obtiene un `access_token`.
2. El frontend envía ese token como `Authorization: Bearer <token>`.
3. El backend valida el JWT con `SUPABASE_JWT_SECRET`.
4. El usuario consulta o crea sus organizaciones.
5. Para acceder a recursos de una organización, el usuario debe tener una membresía activa.
6. Dentro de una organización puede crear bloques.
7. Dentro de un bloque puede crear ejercicios.
8. Puede reordenar ejercicios dentro de un bloque.
9. Puede crear entrenamientos.
10. Puede añadir bloques a entrenamientos.
11. Puede reordenar bloques dentro de entrenamientos.

### En desarrollo

El flujo de invitaciones y alta real de miembros todavía necesita completarse. Ya existe modelo de organización y membership, pero falta una experiencia completa para invitar, aceptar y gestionar miembros.

### Pendiente

No existe todavía un flujo visual completo tipo:

1. login en frontend
2. selector de organización
3. biblioteca de bloques
4. editor de bloque
5. editor de entrenamiento
6. vista de sesión lista para usar en clase

## Qué hace el backend

### Funcionando

El backend se encarga de:

- validar JWT de Supabase
- crear o asegurar perfiles de usuario
- listar y crear organizaciones
- validar acceso a organización con `OrganizationMemberGuard`
- exponer rutas SaaS bajo `/organizations/:organizationId`
- crear, listar, editar y borrar bloques
- crear, listar, editar, borrar y reordenar ejercicios
- crear, listar, editar y borrar entrenamientos
- añadir, quitar y reordenar bloques dentro de entrenamientos
- recalcular `estimatedDurationSec` en bloques
- recalcular `totalDurationSec` en entrenamientos
- evitar swaps inseguros en reordenaciones con constraints únicos
- validar variables de entorno obligatorias
- exponer Swagger en `/docs`

### En desarrollo

- administración de usuarios y roles está en transición hacia roles por organización
- media existe en el modelo, pero el módulo de API todavía está vacío
- dashboard existe como módulo, pero aún no tiene funcionalidad real
- invitaciones existen en el modelo, pero falta flujo completo

### Pendiente

- uploads reales a Supabase Storage
- endpoints de categorías de bloques
- filtros y búsqueda avanzada
- permisos finos por rol dentro de organización
- billing, planes o límites SaaS
- exportación de entrenamientos
- calendario o sesiones programadas

## Qué hace el frontend

### Funcionando

No hay frontend dentro de este repositorio.

Este repo es el backend: `box-planner-api`.

### En desarrollo

El frontend debería consumir esta API usando:

- Supabase Auth para iniciar sesión
- `access_token` en `Authorization: Bearer <token>`
- `FRONTEND_URL` configurado para CORS
- Swagger como referencia de endpoints

### Pendiente

El frontend deberá construir la experiencia de producto:

- pantalla de login
- creación o selección de organización
- navegación principal
- biblioteca de bloques
- editor de ejercicios
- editor de entrenamientos
- reordenación visual
- vista de detalle de entrenamiento
- gestión de miembros
- estados de carga, error y permisos

## Cómo levantar el backend en local

Desde este repositorio:

```bash
npm install
npm run start:dev
```

Por defecto el backend escucha en:

```text
http://localhost:3001
```

Si defines `PORT`, usará ese puerto.

Para ejecutar tests:

```bash
npm run test
```

Para validar build:

```bash
npm run build
```

En PowerShell, si hay bloqueo con scripts, usa:

```bash
npm.cmd run start:dev
npm.cmd run test
npm.cmd run build
```

## Cómo levantar el frontend en local

### Funcionando

No hay frontend en este repo, así que no hay comando real aquí para levantarlo.

### Cuando exista

En el repositorio del frontend, el flujo esperado será algo similar a:

```bash
npm install
npm run dev
```

La URL local esperada para desarrollo es:

```text
http://localhost:3000
```

El backend ya permite esa origin en desarrollo.

Si el frontend usa otra URL, hay que definir `FRONTEND_URL` en el backend.

## Variables de entorno necesarias

En el backend debe existir un `.env` en la raíz del proyecto.

### Obligatorias

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
```

Qué significa cada una:

- `DATABASE_URL`: conexión PostgreSQL/Supabase usada por Prisma.
- `SUPABASE_URL`: URL del proyecto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: clave de service role para acciones internas del backend.
- `SUPABASE_JWT_SECRET`: secreto para validar los JWT emitidos por Supabase.

### Opcionales

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

Notas:

- `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse al frontend.
- En producción conviene definir siempre `FRONTEND_URL`.
- Si `NODE_ENV` no es `production`, el backend permite `http://localhost:3000` en CORS.

## Cómo probar Swagger

### Funcionando

Con el backend levantado:

```text
http://localhost:3001/docs
```

Swagger muestra los endpoints principales:

- auth
- organizations
- blocks
- exercises
- trainings

Para probar endpoints protegidos:

1. Obtén un JWT de Supabase Auth.
2. Abre `/docs`.
3. Pulsa `Authorize`.
4. Pega el token como bearer token.
5. Ejecuta requests desde Swagger.

El token debe tener formato:

```text
Bearer <access_token>
```

En Swagger normalmente basta con pegar sólo el token si el esquema bearer está activo.

## Cómo iniciar sesión cuando esté implementado

### Funcionando a nivel backend

El backend espera recibir un JWT válido de Supabase en cada ruta protegida:

```http
Authorization: Bearer <access_token>
```

El endpoint actual para consultar el usuario autenticado es:

```http
GET /auth/me
```

### En desarrollo

El login visual todavía debe implementarse en el frontend.

El flujo esperado será:

1. El usuario introduce email y contraseña.
2. El frontend llama a Supabase Auth.
3. Supabase devuelve sesión y `access_token`.
4. El frontend guarda la sesión de forma segura.
5. El frontend llama al backend con `Authorization: Bearer <access_token>`.
6. El backend usa `/auth/me` para devolver perfil y memberships.

### Para pruebas manuales

Mientras no haya pantalla de login, se puede obtener un token llamando directamente a Supabase Auth:

```http
POST https://<project-ref>.supabase.co/auth/v1/token?grant_type=password
```

Headers:

```text
apikey: <supabase_anon_key>
Content-Type: application/json
```

Body:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

Después usa `access_token` contra el backend.

## Qué partes ya funcionan

### Backend

- ConfigModule global.
- Validación de variables obligatorias.
- CORS preparado para frontend local.
- Swagger en `/docs`.
- Autenticación JWT con Supabase.
- `/auth/me`.
- Creación y listado de organizaciones.
- Guard de membresía activa por organización.
- Decoradores `OrganizationId` y `OrganizationMembership`.
- CRUD de bloques por organización.
- CRUD de ejercicios por bloque y organización.
- Reordenación segura de ejercicios.
- CRUD de entrenamientos por organización.
- Añadir y quitar bloques en entrenamientos.
- Reordenación segura de bloques en entrenamientos.
- Cálculo automático de duración de bloques.
- Cálculo automático de duración de entrenamientos.
- Tests unitarios principales.

### Modelo de datos

- `Profile`
- `Organization`
- `OrganizationMember`
- `Invitation`
- `BlockCategory`
- `Block`
- `BlockExercise`
- `Training`
- `TrainingBlock`
- `MediaAsset`

## Qué partes están en transición

- El producto está pasando de ownership por usuario a ownership por organización.
- Admin y roles están evolucionando hacia roles por organización.
- Invitations existen en el schema, pero falta flujo API completo.
- Media existe en schema y módulo, pero no está implementado como funcionalidad.
- Dashboard existe como módulo, pero todavía no ofrece datos reales.
- Swagger es usable, pero los DTOs aún no están documentados al detalle con `ApiProperty`.
- La documentación antigua puede mencionar partes legacy y debe leerse junto a esta guía.

## Qué partes aún no existen

- Frontend funcional.
- Pantalla de login.
- Selector de organización.
- Gestión completa de miembros.
- Invitaciones por email.
- Aceptación de invitaciones.
- Gestión de categorías de bloques.
- Upload de imágenes o videos.
- Integración con Supabase Storage.
- Dashboard real.
- Búsqueda y filtros avanzados.
- Roles y permisos finos por acción.
- Planes de pago o billing.
- Exportación a PDF.
- Calendario de clases.
- Alumnos, reservas o asistencia.

## Próximos pasos funcionales

### Prioridad alta

1. Crear frontend base.
2. Implementar login con Supabase Auth.
3. Consumir `/auth/me`.
4. Crear pantalla de organizaciones.
5. Resolver cómo se crea la primera organización y membership del usuario.
6. Crear navegación por organización activa.
7. Construir CRUD visual de bloques.
8. Construir editor de ejercicios dentro de bloque.
9. Construir CRUD visual de entrenamientos.
10. Construir flujo para añadir bloques a entrenamientos.

### Prioridad media

1. Mejorar Swagger con `ApiProperty` en DTOs.
2. Añadir endpoints para categorías.
3. Implementar invitaciones.
4. Implementar gestión básica de miembros.
5. Añadir filtros por categoría, nivel y tipo.
6. Crear dashboard mínimo con métricas reales.
7. Añadir tests e2e de rutas principales.

### Prioridad futura

1. Media con Supabase Storage.
2. Plantillas de entrenamientos.
3. Biblioteca compartida por organización.
4. Visibilidad `PRIVATE`, `ORGANIZATION` y `PUBLIC` con reglas claras.
5. Exportación o impresión de sesiones.
6. Billing y planes SaaS si el producto se monetiza.

## Resumen corto

BoxPlanner ya tiene un backend SaaS razonablemente sólido para organizar planificación de entrenamientos de boxeo por organización.

Lo que falta para que parezca producto es la experiencia frontend: login, selección de organización, biblioteca de bloques y editor de entrenamientos.

La API ya está lista para empezar esa integración.
