# Estado actual del backend

## Objetivo actual del backend

`box-planner-api` es una API backend para planificar y gestionar entrenamientos de boxeo. El dominio actual gira alrededor de usuarios autenticados, bloques reutilizables de entrenamiento, ejercicios dentro de esos bloques y entrenamientos completos compuestos por bloques.

El proyecto parece pensado como una API real para un producto o portfolio, no como una demo mínima. Ya incorpora autenticación con Supabase, control básico de propiedad por usuario, creación de usuarios desde endpoints de admin, validación de DTOs, acceso a base de datos con Prisma y logging con Winston.

## Tecnologías principales

- Node.js
- NestJS 11
- TypeScript
- Prisma 7
- PostgreSQL mediante Supabase
- Supabase Auth
- `jsonwebtoken` para validar tokens JWT de Supabase
- `@supabase/supabase-js` para operaciones administrativas contra Supabase
- `class-validator` y `class-transformer` para validación de DTOs
- `@nestjs/mapped-types` para DTOs parciales de actualización
- `pg` y `@prisma/adapter-pg` para la conexión Prisma/PostgreSQL
- `winston`, `nest-winston` y `winston-daily-rotate-file` para logs
- Jest, `ts-jest`, `@nestjs/testing` y Supertest para testing
- ESLint y Prettier

## Módulos existentes

### `AppModule`

Módulo raíz. Importa:

- `BlocksModule`
- `TrainingsModule`
- `MediaModule`
- `ExercisesModule`
- `DashboardModule`
- `PrismaModule`
- `AuthModule`
- `AdminModule`

También expone un endpoint raíz `GET /` mediante `AppController`, que actualmente devuelve `Hello World!`.

### `PrismaModule`

Módulo global con `@Global()`. Exporta `PrismaService`, que extiende `PrismaClient`.

`PrismaService`:

- Lee `DATABASE_URL` desde variables de entorno.
- Crea un pool de PostgreSQL con `pg`.
- Usa `PrismaPg` como adapter.
- Conecta en `onModuleInit`.
- Desconecta Prisma y cierra el pool en `onModuleDestroy`.

### `AuthModule`

Existe, pero está vacío. La autenticación real está implementada en:

- `SupabaseAuthGuard`
- `AuthUser` decorator

No hay endpoints propios de login, registro, refresh token ni `/me`.

### `AdminModule`

Incluye `AdminController` y `AdminService`.

Funcionalidad actual:

- `POST /admin/users`
- Requiere autenticación con `SupabaseAuthGuard`.
- Verifica que el usuario autenticado tenga perfil con rol `admin`.
- Crea usuarios en Supabase Auth usando `SUPABASE_SERVICE_ROLE_KEY`.
- Inserta o actualiza el perfil en la tabla `profiles`.
- Devuelve una contraseña temporal.

Roles soportados en el DTO:

- `trainer`
- `admin`

### `BlocksModule`

Incluye `BlocksController` y `BlocksService`.

Endpoints:

- `POST /blocks`
- `GET /blocks`
- `GET /blocks/:id`
- `PATCH /blocks/:id`
- `DELETE /blocks/:id`

Funcionalidad actual:

- Crear bloques para el usuario autenticado.
- Listar bloques propios.
- Consultar un bloque propio con categoría y ejercicios.
- Actualizar bloque propio.
- Eliminar bloque propio.

El servicio filtra por `userId`, por lo que aplica control de propiedad básico.

### `ExercisesModule`

Incluye `ExercisesController` y `ExercisesService`.

Endpoints:

- `GET /blocks/:blockId/exercises`
- `POST /blocks/:blockId/exercises`
- `PATCH /blocks/:blockId/exercises/:exerciseId`
- `DELETE /blocks/:blockId/exercises/:exerciseId`
- `PATCH /blocks/:blockId/exercises/reorder`

Funcionalidad actual:

- Listar ejercicios de un bloque propio.
- Crear ejercicios dentro de un bloque propio.
- Actualizar ejercicios.
- Eliminar ejercicios.
- Reordenar ejercicios.
- Recalcular automáticamente la duración estimada del bloque sumando `durationSec + restSec` de sus ejercicios.

### `TrainingsModule`

Incluye `TrainingsController` y `TrainingsService`.

Endpoints:

- `POST /trainings`
- `GET /trainings`
- `GET /trainings/:trainingId`
- `PATCH /trainings/:trainingId`
- `DELETE /trainings/:trainingId`
- `POST /trainings/:trainingId/blocks`
- `DELETE /trainings/:trainingId/blocks/:trainingBlockId`
- `PATCH /trainings/:trainingId/blocks/reorder`

Funcionalidad actual:

- Crear entrenamientos para el usuario autenticado.
- Listar entrenamientos propios con sus bloques.
- Consultar un entrenamiento propio con bloques y ejercicios.
- Actualizar entrenamientos.
- Eliminar entrenamientos.
- Añadir bloques propios a entrenamientos propios.
- Eliminar bloques de un entrenamiento.
- Reordenar bloques dentro de un entrenamiento.
- Recalcular duración total del entrenamiento usando la duración del bloque o una duración personalizada.

### `MediaModule`

Existe con `MediaController` y `MediaService`, pero ambos están vacíos.

Hay modelo de datos para `MediaAsset`, pero no hay endpoints implementados para crear, listar, subir, actualizar o borrar media.

### `DashboardModule`

Existe con `DashboardController` y `DashboardService`, pero ambos están vacíos.

No hay endpoints ni lógica implementada actualmente para dashboard.

## Modelos de datos actuales

El archivo `prisma/schema.prisma` define modelos sobre PostgreSQL, principalmente en el schema `public`. También declara el schema `auth`, aunque no define modelos Prisma para tablas como `auth.users`.

### `BlockCategory`

Tabla real: `public.block_categories`

Representa categorías de bloques de entrenamiento, por ejemplo calentamiento, técnica, cardio o saco.

Campos:

- `id`: entero autoincremental, clave primaria.
- `key`: string único, clave funcional de la categoría.
- `name`: nombre visible.
- `description`: descripción opcional.

Relaciones:

- Una categoría tiene muchos `Block`.

### `Block`

Tabla real: `public.blocks`

Representa un bloque reutilizable de entrenamiento creado por un usuario.

Campos:

- `id`: UUID, clave primaria.
- `userId`: identificador del usuario propietario.
- `name`: nombre del bloque.
- `description`: descripción opcional.
- `level`: nivel opcional.
- `estimatedDurationSec`: duración estimada en segundos, por defecto `0`.
- `isPublic`: indica si el bloque es público, por defecto `false`.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de actualización automática.
- `categoryId`: categoría opcional.

Relaciones:

- Pertenece opcionalmente a `BlockCategory`.
- Tiene muchos `BlockExercise`.
- Puede aparecer en muchos `TrainingBlock`.

### `BlockExercise`

Tabla real: `public.block_exercises`

Representa un ejercicio dentro de un bloque.

Campos:

- `id`: UUID, clave primaria.
- `blockId`: bloque al que pertenece.
- `name`: nombre del ejercicio.
- `description`: descripción opcional.
- `durationSec`: duración opcional en segundos.
- `reps`: repeticiones opcionales.
- `restSec`: descanso en segundos, por defecto `0`.
- `orderIndex`: posición dentro del bloque.
- `targetArea`: zona objetivo opcional.
- `mediaId`: media asociada opcional.
- `notes`: notas opcionales.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de actualización automática.

Relaciones:

- Pertenece a un `Block`.
- Puede tener un `MediaAsset`.

### `MediaAsset`

Tabla real: `public.media_assets`

Representa recursos multimedia, como imágenes o videos, asociados a ejercicios.

Campos:

- `id`: UUID, clave primaria.
- `userId`: identificador del usuario propietario.
- `url`: URL del recurso.
- `type`: tipo de recurso. El comentario indica `"image" | "video"`, pero en Prisma es `String`.
- `title`: título opcional.
- `description`: descripción opcional.
- `tags`: array de strings.
- `createdAt`: fecha de creación.

Relaciones:

- Puede estar asociado a muchos `BlockExercise`.

### `Training`

Tabla real: `public.trainings`

Representa una sesión completa de entrenamiento.

Campos:

- `id`: UUID, clave primaria.
- `userId`: identificador del usuario propietario.
- `title`: título del entrenamiento.
- `description`: descripción opcional.
- `trainingType`: tipo de entrenamiento. El comentario indica `"personal" | "group"`, pero en Prisma es `String`.
- `level`: nivel opcional.
- `groupSizeMin`: tamaño mínimo de grupo opcional.
- `groupSizeMax`: tamaño máximo de grupo opcional.
- `totalDurationSec`: duración total en segundos, por defecto `0`.
- `notes`: notas opcionales.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de actualización automática.

Relaciones:

- Tiene muchos `TrainingBlock`.

### `TrainingBlock`

Tabla real: `public.training_blocks`

Representa la inclusión de un bloque dentro de un entrenamiento. Es la tabla intermedia entre `Training` y `Block`.

Campos:

- `id`: UUID, clave primaria.
- `trainingId`: entrenamiento al que pertenece.
- `blockId`: bloque incluido.
- `orderIndex`: posición dentro del entrenamiento.
- `customDurationSec`: duración personalizada opcional.
- `notes`: notas opcionales.

Relaciones:

- Pertenece a un `Training`.
- Pertenece a un `Block`.

### `Profile`

Tabla real: `public.profiles`

Representa el perfil de aplicación asociado a un usuario de Supabase Auth.

Campos:

- `id`: UUID, clave primaria. Parece corresponder al ID del usuario de Supabase.
- `email`: email opcional y único.
- `role`: rol del usuario, por defecto `trainer`.
- `createdAt`: fecha de creación.

Relaciones:

- No tiene relaciones Prisma explícitas con otros modelos.

## Relaciones principales

Relaciones de dominio:

- `BlockCategory` uno a muchos `Block`.
- `Block` uno a muchos `BlockExercise`.
- `MediaAsset` uno a muchos `BlockExercise`.
- `Training` uno a muchos `TrainingBlock`.
- `Block` uno a muchos `TrainingBlock`.

Relación conceptual de usuarios:

- `Profile` representa un usuario interno.
- `Block.userId`, `Training.userId` y `MediaAsset.userId` representan propiedad por usuario.
- Sin embargo, estos campos no están modelados como relaciones Prisma hacia `Profile`.

Resumen del dominio:

```txt
Usuario/Profile
  crea Blocks
  crea Trainings
  posee MediaAssets

BlockCategory
  clasifica Blocks

Block
  contiene BlockExercises
  se reutiliza en Trainings mediante TrainingBlock

Training
  contiene Blocks mediante TrainingBlock

BlockExercise
  puede usar MediaAsset
```

## Cómo funciona la autenticación con Supabase

La API no implementa login propio. El flujo esperado es:

1. El usuario se autentica contra Supabase Auth desde frontend, Postman u otro cliente.
2. Supabase devuelve un `access_token`.
3. El cliente llama a la API enviando:

```txt
Authorization: Bearer <access_token>
```

4. `SupabaseAuthGuard` extrae el token.
5. El guard valida el JWT con `jsonwebtoken` usando `SUPABASE_JWT_SECRET`.
6. Si el token es válido, guarda en `request.user`:

```txt
id: payload.sub
email: payload.email
```

7. Los controllers recuperan el usuario mediante el decorador `@AuthUser()`.
8. Los services usan `user.id` para filtrar recursos por propietario.

En endpoints de admin, además de validar el JWT, `AdminService` consulta `Profile` y exige que `profile.role` sea `admin`.

Variables de entorno usadas:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `PORT`, opcional

## Funcionalidades implementadas

- Arranque de aplicación NestJS en puerto `3001` por defecto.
- Validación global con `ValidationPipe`.
- Rechazo global de propiedades no declaradas en DTOs mediante `forbidNonWhitelisted`.
- Logging con Winston y rotación diaria de archivos.
- Conexión a PostgreSQL/Supabase con Prisma.
- Autenticación por JWT de Supabase.
- Decorador para obtener usuario autenticado.
- Creación de usuarios desde endpoint admin.
- Verificación básica de rol `admin`.
- CRUD de bloques propios.
- CRUD de ejercicios dentro de bloques propios.
- Reordenación de ejercicios.
- Recalculo de duración estimada de bloques.
- CRUD de entrenamientos propios.
- Añadir bloques propios a entrenamientos propios.
- Eliminar bloques de entrenamientos.
- Reordenar bloques dentro de entrenamientos.
- Recalculo de duración total de entrenamientos.
- Tests unitarios básicos.
- Tests más completos para parte de `BlocksService`.
- Build correcto con `npm.cmd run build`.
- Suite de tests actual pasando con `npm.cmd run test`.

## Funcionalidades incompletas

- `AuthModule` no contiene lógica propia.
- No hay endpoint `/auth/login`.
- No hay endpoint `/auth/me`.
- No hay refresh token ni gestión de sesión desde la API.
- No hay guard reusable de roles.
- No hay endpoints para gestionar categorías de bloques.
- `MediaModule` no implementa endpoints.
- No hay subida real de archivos a Supabase Storage.
- `DashboardModule` no implementa endpoints.
- No hay Swagger/OpenAPI.
- No hay endpoints públicos para consumir bloques con `isPublic = true`.
- No hay gestión de invitaciones por email; se usa contraseña temporal.
- No hay migraciones Prisma versionadas en el repo.
- No hay seeds visibles para datos base como categorías.
- No hay tests significativos para `TrainingsService`, `ExercisesService`, `AdminService` ni flujos e2e reales.

## Riesgos técnicos detectados

- `userId` no está relacionado en Prisma con `Profile.id`.
- `Block.userId`, `Training.userId` y `MediaAsset.userId` no tienen integridad referencial visible en el schema.
- `Profile` tampoco está relacionado en Prisma con `auth.users`.
- Campos que deberían ser enums están como `String`:
  - `Profile.role`
  - `Training.trainingType`
  - `MediaAsset.type`
  - posiblemente `level`
- No hay índices explícitos en campos de búsqueda frecuentes como `userId`, `blockId`, `trainingId` o `categoryId`.
- No hay constraints de unicidad para `orderIndex` por bloque o por entrenamiento.
- La reordenación de ejercicios actualiza por `exerciseId` sin validar explícitamente que todos los ejercicios del payload pertenezcan al `blockId`.
- La reordenación de bloques de entrenamiento actualiza por `trainingBlockId` sin validar explícitamente que todos pertenezcan al `trainingId`.
- La ruta `PATCH /blocks/:blockId/exercises/reorder` está declarada después de `PATCH /blocks/:blockId/exercises/:exerciseId`, lo que puede causar conflicto de routing.
- No hay `onDelete` explícitos en relaciones Prisma.
- La duración desnormalizada requiere disciplina:
  - `Block.estimatedDurationSec`
  - `Training.totalDurationSec`
- Si se cambia la duración de un bloque ya usado en entrenamientos, no está claro que se recalculen automáticamente todos los entrenamientos afectados.
- `SUPABASE_SERVICE_ROLE_KEY` se usa en backend, lo cual es correcto, pero exige cuidado fuerte de despliegue y variables.
- `PrismaService` lanza error al importar si no existe `DATABASE_URL`, lo que puede complicar ciertos tests unitarios o tooling si no se mockea.
- El README y algunos comentarios tienen problemas de encoding.
- El test e2e actual importa `AppModule`, por lo que puede depender de variables reales de entorno y conexión a base de datos.

## Limitaciones actuales para convertirlo en SaaS

- Falta modelo de organización, workspace, gimnasio o tenant.
- La propiedad actual es por usuario individual, no por equipo ni cuenta SaaS.
- No hay separación multi-tenant explícita.
- No hay planes, suscripciones, billing ni límites por plan.
- No hay invitaciones reales a usuarios por email.
- No hay gestión completa de roles y permisos por organización.
- No hay auditoría de acciones.
- No hay soft delete ni recuperación de datos.
- No hay estrategia clara de almacenamiento de media.
- No hay panel de administración funcional más allá de crear usuarios.
- No hay documentación OpenAPI para consumidores externos.
- No hay versionado de API.
- No hay política clara de datos públicos frente a privados.
- No hay observabilidad completa más allá de logs.
- No hay rate limiting.
- No hay protección adicional para endpoints sensibles más allá del guard JWT y la comprobación manual de admin.
- No hay estrategia visible para migraciones seguras de base de datos.

## Próximos pasos recomendados

1. Añadir `ConfigModule` y validación formal de variables de entorno.
2. Corregir la ruta de reorder de ejercicios para evitar conflicto con `:exerciseId`.
3. Validar ownership completo en reorder de ejercicios y bloques de entrenamiento.
4. Crear un sistema reusable de roles y permisos.
5. Añadir endpoint `/auth/me`.
6. Definir si el producto será single-user o multi-tenant antes de avanzar hacia SaaS.
7. Si será SaaS, introducir modelos como `Organization`, `Membership` y roles por organización.
8. Convertir strings críticos en enums o constraints equivalentes.
9. Añadir índices y constraints de orden en base de datos.
10. Definir estrategia de migraciones Prisma o documentar claramente que el schema se basa en introspección de una base existente.
11. Implementar gestión de categorías o seeds para categorías iniciales.
12. Implementar `MediaModule` con Supabase Storage si la media forma parte del producto.
13. Implementar `DashboardModule` solo cuando estén claras las métricas necesarias.
14. Añadir Swagger/OpenAPI.
15. Ampliar tests de servicios principales y casos de autorización.
16. Preparar tests e2e con entorno controlado.
17. Revisar encoding del README y documentación existente.
18. Documentar convenciones de duración, ordenación, propiedad y visibilidad pública.
