# Modelo de datos SaaS v1

Este documento propone una evolución del modelo de datos actual de BoxPlanner hacia un SaaS multi-tenant para entrenadores y gimnasios.

No es una migración definitiva ni un schema cerrado. Es una propuesta inicial para orientar las próximas decisiones técnicas, manteniendo como núcleo premium la planificación de bloques, ejercicios y entrenamientos.

## 1. Problema del modelo actual

El modelo actual funciona para un producto de usuario individual, pero se queda corto para SaaS.

Actualmente existen:

- `Profile`
- `BlockCategory`
- `Block`
- `BlockExercise`
- `MediaAsset`
- `Training`
- `TrainingBlock`

La propiedad se basa principalmente en campos `userId` dentro de modelos como `Block`, `Training` y `MediaAsset`.

Este enfoque tiene varias limitaciones:

- No existe el concepto de organización, gimnasio o workspace.
- Un usuario no puede pertenecer formalmente a varios gimnasios.
- Los roles son globales, no por organización.
- No hay diferencia clara entre contenido personal, contenido compartido de un gimnasio y contenido público.
- No hay base preparada para alumnos, clases, reservas o planificación por calendario.
- `userId` no está modelado como relación Prisma hacia `Profile`.
- No hay multi-tenancy explícita, por lo que aislar datos entre gimnasios dependería demasiado de lógica manual.
- El rol actual en `Profile.role` no basta para un SaaS con distintos contextos.

El mayor problema no es el modelo de bloques y entrenamientos. Esa parte es aprovechable. El problema principal es que falta una capa de organización y membresía alrededor del núcleo de planificación.

## 2. Principios del nuevo modelo SaaS

El nuevo modelo debería seguir estos principios:

- La planificación sigue siendo el centro del producto.
- Todo recurso de negocio importante debe pertenecer a una organización.
- Un usuario puede pertenecer a una o varias organizaciones.
- Los roles deben vivir en la relación usuario-organización, no solo en el perfil global.
- El sistema debe seguir permitiendo saber quién creó cada recurso.
- La base debe permitir gimnasios pequeños sin complicar demasiado el MVP.
- El modelo debe preparar el camino para alumnos, clases y reservas, aunque no se implementen todavía.
- El contenido debe poder distinguir entre privado, compartido dentro de una organización y, quizá más adelante, público.
- Los campos críticos deben usar enums o constraints, no strings libres.
- Las relaciones principales deben tener índices y constraints desde el inicio.

## 3. Nuevos modelos propuestos

### `Organization`

Representa un gimnasio, academia, equipo de entrenadores o workspace.

Campos principales:

- `id`
- `name`
- `slug`
- `type`
- `createdAt`
- `updatedAt`

Este modelo es la base del multi-tenant. La mayoría de los datos de negocio deberían colgar de una organización.

### `OrganizationMember`

Representa la pertenencia de un usuario a una organización.

Campos principales:

- `id`
- `organizationId`
- `profileId`
- `role`
- `status`
- `createdAt`
- `updatedAt`

Permite que un mismo usuario tenga distintos roles en distintos gimnasios. Por ejemplo, puede ser `owner` en su gimnasio y `coach` en otro.

### `Invitation`

Representa una invitación pendiente para entrar en una organización.

Campos principales:

- `id`
- `organizationId`
- `email`
- `role`
- `status`
- `token`
- `invitedById`
- `acceptedById`
- `expiresAt`
- `createdAt`
- `acceptedAt`

Este modelo sustituiría gradualmente el flujo actual de contraseñas temporales.

### `Student`

Modelo preparado para el futuro, no necesariamente MVP inmediato.

Representa un alumno o cliente de un gimnasio.

Campos principales:

- `id`
- `organizationId`
- `createdById`
- `firstName`
- `lastName`
- `email`
- `phone`
- `status`
- `notes`
- `createdAt`
- `updatedAt`

Se puede dejar fuera del primer MVP si el foco inicial es solo planificación.

### `ClassSession`

Modelo futuro para clases programadas.

Representa una clase o sesión calendarizada en una fecha concreta, posiblemente basada en un `Training`.

Campos principales:

- `id`
- `organizationId`
- `trainingId`
- `coachId`
- `title`
- `startsAt`
- `endsAt`
- `capacity`
- `status`
- `createdAt`
- `updatedAt`

Este modelo conecta la planificación con la operación diaria del gimnasio.

### `Booking`

Modelo futuro para reservas de alumnos.

Campos principales:

- `id`
- `organizationId`
- `classSessionId`
- `studentId`
- `status`
- `createdAt`
- `cancelledAt`

Debe dejarse fuera del MVP si todavía no hay módulo de alumnos ni clases.

## 4. Modelos actuales que se mantienen

Los modelos que deberían mantenerse como base del producto son:

- `Profile`
- `BlockCategory`
- `Block`
- `BlockExercise`
- `MediaAsset`
- `Training`
- `TrainingBlock`

La lógica principal de negocio actual es válida:

- Bloques reutilizables.
- Ejercicios ordenados dentro de bloques.
- Duración estimada de bloques.
- Entrenamientos compuestos por bloques.
- Duración total de entrenamientos.
- Media asociada a ejercicios.

El núcleo de planificación no debería descartarse. Debe adaptarse al nuevo contexto multi-tenant.

## 5. Modelos actuales que deben cambiar

### `Profile`

Debe dejar de ser el lugar principal del rol de negocio.

Puede mantener datos globales del usuario:

- `id`
- `email`
- `displayName`
- `avatarUrl`
- `createdAt`
- `updatedAt`

El campo `role` global debería eliminarse a largo plazo o reservarse solo para roles internos de plataforma, como `platform_admin`.

Los roles de gimnasio deben vivir en `OrganizationMember`.

### `Block`

Debe añadir:

- `organizationId`
- `createdById`
- posiblemente `visibility`

El campo actual `userId` debería migrarse gradualmente a `createdById` o mantenerse temporalmente durante la migración.

### `Training`

Debe añadir:

- `organizationId`
- `createdById`
- posiblemente `visibility`

Igual que `Block`, el campo `userId` actual no es suficiente para SaaS.

### `MediaAsset`

Debe añadir:

- `organizationId`
- `createdById`

Esto permite separar media por gimnasio y controlar permisos.

### `BlockCategory`

Hay dos opciones razonables:

1. Catálogo global gestionado por la plataforma.
2. Categorías por organización.

Para MVP, lo más simple es mantener categorías globales. Más adelante se puede añadir `organizationId` opcional para categorías personalizadas.

### `BlockExercise`

No necesita `organizationId` si siempre pertenece a un `Block`. Aun así, puede ser útil para queries y seguridad, pero introduce duplicación.

Para MVP, puede seguir dependiendo de `Block`.

### `TrainingBlock`

No necesita `organizationId` si siempre pertenece a un `Training`. Igual que en `BlockExercise`, podría añadirse por rendimiento o seguridad, pero no es imprescindible al inicio.

## 6. Relaciones principales

Relaciones SaaS principales:

```txt
Profile 1 --- N OrganizationMember
Organization 1 --- N OrganizationMember

Organization 1 --- N Block
Organization 1 --- N Training
Organization 1 --- N MediaAsset

Profile 1 --- N Block createdById
Profile 1 --- N Training createdById
Profile 1 --- N MediaAsset createdById

BlockCategory 1 --- N Block
Block 1 --- N BlockExercise
MediaAsset 1 --- N BlockExercise

Training 1 --- N TrainingBlock
Block 1 --- N TrainingBlock
```

Relaciones futuras:

```txt
Organization 1 --- N Student
Organization 1 --- N ClassSession
Organization 1 --- N Booking

Training 1 --- N ClassSession
Profile 1 --- N ClassSession como coach
ClassSession 1 --- N Booking
Student 1 --- N Booking
```

La regla general debería ser:

- Los recursos principales pertenecen a una organización.
- Los recursos guardan quién los creó.
- Los recursos hijos se autorizan a través de su padre.

## 7. Roles recomendados

Roles por organización:

### `owner`

Propietario de la organización.

Puede:

- Gestionar la organización.
- Gestionar miembros.
- Cambiar roles.
- Crear, editar y borrar cualquier contenido de la organización.
- Gestionar billing en el futuro.

### `admin`

Administrador operativo del gimnasio.

Puede:

- Gestionar entrenadores.
- Crear y editar contenido compartido.
- Ver contenido de la organización.
- Gestionar clases y alumnos cuando existan.

No necesariamente debería gestionar billing.

### `coach`

Entrenador.

Puede:

- Crear bloques.
- Crear ejercicios.
- Crear entrenamientos.
- Usar biblioteca compartida.
- Gestionar sus propios contenidos.
- Ver contenido compartido de la organización.

### `viewer`

Rol de solo lectura para casos internos o colaboradores.

Puede:

- Ver contenido compartido.
- No puede modificar recursos.

Roles futuros:

- `student`, si los alumnos inician sesión.
- `platform_admin`, pero debería ser un rol global o interno, no un rol de organización.

## 8. Campos `organizationId` / `createdById` necesarios

### Deben tener `organizationId`

- `Block`
- `Training`
- `MediaAsset`
- `OrganizationMember`
- `Invitation`
- `Student`, futuro
- `ClassSession`, futuro
- `Booking`, futuro

### Deben tener `createdById`

- `Block`
- `Training`
- `MediaAsset`
- `Student`, futuro
- `ClassSession`, futuro

### Pueden no tener `organizationId` inicialmente

- `BlockExercise`, porque depende de `Block`.
- `TrainingBlock`, porque depende de `Training`.

### Consideración importante

Aunque `BlockExercise` y `TrainingBlock` no tengan `organizationId`, los servicios deben validar permisos a través de sus entidades padre:

- Para ejercicios, validar el `Block`.
- Para training blocks, validar el `Training`.

## 9. Índices y constraints recomendados

### Índices recomendados

En `Organization`:

- `slug` único.

En `OrganizationMember`:

- índice por `organizationId`.
- índice por `profileId`.
- único compuesto `organizationId + profileId`.

En `Invitation`:

- índice por `organizationId`.
- índice por `email`.
- `token` único.
- opcional: único compuesto para invitaciones pendientes por `organizationId + email`.

En `Block`:

- índice por `organizationId`.
- índice por `createdById`.
- índice por `categoryId`.
- índice compuesto por `organizationId + createdAt`.
- índice compuesto por `organizationId + visibility`.

En `BlockExercise`:

- índice por `blockId`.
- único compuesto `blockId + orderIndex`.

En `MediaAsset`:

- índice por `organizationId`.
- índice por `createdById`.
- índice por `type`.

En `Training`:

- índice por `organizationId`.
- índice por `createdById`.
- índice compuesto por `organizationId + updatedAt`.
- índice compuesto por `organizationId + trainingType`.
- índice compuesto por `organizationId + visibility`.

En `TrainingBlock`:

- índice por `trainingId`.
- índice por `blockId`.
- único compuesto `trainingId + orderIndex`.

Modelos futuros:

- `Student`: índices por `organizationId`, `email` y `status`.
- `ClassSession`: índices por `organizationId`, `startsAt`, `coachId`, `trainingId`.
- `Booking`: único compuesto `classSessionId + studentId`.

### Constraints recomendados

- No permitir dos miembros iguales en la misma organización.
- No permitir dos ejercicios con el mismo `orderIndex` dentro del mismo bloque.
- No permitir dos bloques con el mismo `orderIndex` dentro del mismo entrenamiento.
- Validar que `groupSizeMax` sea mayor o igual que `groupSizeMin`.
- Validar que duraciones no sean negativas.
- Validar que capacidad de clases no sea negativa.
- Validar que fechas de clase tengan `endsAt > startsAt`.

Algunas constraints pueden vivir en base de datos y otras en aplicación, pero las más críticas deberían estar también en base de datos.

## 10. Enums recomendados

### `OrganizationType`

```txt
GYM
COACH
TEAM
OTHER
```

### `OrganizationRole`

```txt
OWNER
ADMIN
COACH
VIEWER
```

### `MemberStatus`

```txt
ACTIVE
INVITED
SUSPENDED
REMOVED
```

### `InvitationStatus`

```txt
PENDING
ACCEPTED
EXPIRED
CANCELLED
```

### `TrainingType`

```txt
PERSONAL
GROUP
```

### `MediaType`

```txt
IMAGE
VIDEO
```

### `Visibility`

```txt
PRIVATE
ORGANIZATION
PUBLIC
```

Para MVP se puede usar solo:

```txt
PRIVATE
ORGANIZATION
```

Y dejar `PUBLIC` para una biblioteca pública futura.

### `ClassStatus`, futuro

```txt
DRAFT
SCHEDULED
CANCELLED
COMPLETED
```

### `BookingStatus`, futuro

```txt
BOOKED
CANCELLED
ATTENDED
NO_SHOW
```

### `StudentStatus`, futuro

```txt
ACTIVE
INACTIVE
ARCHIVED
```

## 11. Qué dejar fuera del MVP por ahora

Para no sobredimensionar el producto, conviene dejar fuera:

- Reservas de alumnos.
- Pagos de alumnos.
- Facturación a alumnos.
- Calendario avanzado.
- Asistencia a clases.
- Chat o mensajería.
- App móvil.
- Marketplace público de entrenamientos.
- Biblioteca pública global.
- Automatizaciones complejas.
- Programas de entrenamiento de varias semanas.
- Analítica avanzada.
- Marca blanca completa.
- Integraciones externas con calendarios.

MVP recomendado:

- Organizaciones.
- Miembros.
- Roles básicos.
- Bloques.
- Ejercicios.
- Entrenamientos.
- Biblioteca compartida por organización.
- Autenticación clara.
- Invitaciones simples.
- Dashboard básico más adelante.

## 12. Propuesta de schema Prisma inicial

Esta propuesta es orientativa. No debe aplicarse directamente sin revisar tipos reales, nombres de tablas existentes y estrategia de migración.

```prisma
enum OrganizationType {
  GYM
  COACH
  TEAM
  OTHER
}

enum OrganizationRole {
  OWNER
  ADMIN
  COACH
  VIEWER
}

enum MemberStatus {
  ACTIVE
  INVITED
  SUSPENDED
  REMOVED
}

enum InvitationStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELLED
}

enum TrainingType {
  PERSONAL
  GROUP
}

enum MediaType {
  IMAGE
  VIDEO
}

enum Visibility {
  PRIVATE
  ORGANIZATION
  PUBLIC
}

model Profile {
  id          String   @id @db.Uuid
  email       String?  @unique
  displayName String?  @map("display_name")
  avatarUrl   String?  @map("avatar_url")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  memberships OrganizationMember[]
  createdBlocks Block[] @relation("BlockCreatedBy")
  createdTrainings Training[] @relation("TrainingCreatedBy")
  createdMedia MediaAsset[] @relation("MediaCreatedBy")
  sentInvitations Invitation[] @relation("InvitationInvitedBy")
  acceptedInvitations Invitation[] @relation("InvitationAcceptedBy")

  @@map("profiles")
  @@schema("public")
}

model Organization {
  id        String           @id @default(uuid()) @db.Uuid
  name      String
  slug      String           @unique
  type      OrganizationType @default(GYM)
  createdAt DateTime         @default(now()) @map("created_at")
  updatedAt DateTime         @updatedAt @map("updated_at")

  members     OrganizationMember[]
  invitations Invitation[]
  blocks      Block[]
  trainings   Training[]
  mediaAssets MediaAsset[]

  @@map("organizations")
  @@schema("public")
}

model OrganizationMember {
  id             String           @id @default(uuid()) @db.Uuid
  organizationId String           @map("organization_id") @db.Uuid
  profileId      String           @map("profile_id") @db.Uuid
  role           OrganizationRole @default(COACH)
  status         MemberStatus     @default(ACTIVE)
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  profile      Profile      @relation(fields: [profileId], references: [id])

  @@unique([organizationId, profileId])
  @@index([organizationId])
  @@index([profileId])
  @@map("organization_members")
  @@schema("public")
}

model Invitation {
  id             String           @id @default(uuid()) @db.Uuid
  organizationId String           @map("organization_id") @db.Uuid
  email          String
  role           OrganizationRole @default(COACH)
  status         InvitationStatus @default(PENDING)
  token          String           @unique
  invitedById    String           @map("invited_by_id") @db.Uuid
  acceptedById   String?          @map("accepted_by_id") @db.Uuid
  expiresAt      DateTime         @map("expires_at")
  createdAt      DateTime         @default(now()) @map("created_at")
  acceptedAt     DateTime?        @map("accepted_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  invitedBy    Profile      @relation("InvitationInvitedBy", fields: [invitedById], references: [id])
  acceptedBy   Profile?     @relation("InvitationAcceptedBy", fields: [acceptedById], references: [id])

  @@index([organizationId])
  @@index([email])
  @@map("invitations")
  @@schema("public")
}

model BlockCategory {
  id          Int     @id @default(autoincrement())
  key         String  @unique
  name        String
  description String?

  blocks Block[]

  @@map("block_categories")
  @@schema("public")
}

model Block {
  id                   String     @id @default(uuid()) @db.Uuid
  organizationId       String     @map("organization_id") @db.Uuid
  createdById          String     @map("created_by_id") @db.Uuid
  name                 String
  description          String?
  level                String?
  estimatedDurationSec Int        @default(0) @map("estimated_duration_sec")
  visibility           Visibility @default(PRIVATE)
  createdAt            DateTime   @default(now()) @map("created_at")
  updatedAt            DateTime   @updatedAt @map("updated_at")

  categoryId Int? @map("category_id")

  organization Organization   @relation(fields: [organizationId], references: [id])
  createdBy    Profile        @relation("BlockCreatedBy", fields: [createdById], references: [id])
  category     BlockCategory? @relation(fields: [categoryId], references: [id])
  exercises    BlockExercise[]
  trainingBlocks TrainingBlock[]

  @@index([organizationId])
  @@index([createdById])
  @@index([categoryId])
  @@index([organizationId, createdAt])
  @@index([organizationId, visibility])
  @@map("blocks")
  @@schema("public")
}

model BlockExercise {
  id          String   @id @default(uuid()) @db.Uuid
  blockId     String   @map("block_id") @db.Uuid
  name        String
  description String?
  durationSec Int?     @map("duration_sec")
  reps        Int?
  restSec     Int      @default(0) @map("rest_sec")
  orderIndex  Int      @map("order_index")
  targetArea  String?  @map("target_area")
  mediaId     String?  @map("media_id") @db.Uuid
  notes       String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  block Block @relation(fields: [blockId], references: [id])
  media MediaAsset? @relation(fields: [mediaId], references: [id])

  @@unique([blockId, orderIndex])
  @@index([blockId])
  @@map("block_exercises")
  @@schema("public")
}

model MediaAsset {
  id             String    @id @default(uuid()) @db.Uuid
  organizationId String    @map("organization_id") @db.Uuid
  createdById    String    @map("created_by_id") @db.Uuid
  url            String
  type           MediaType
  title          String?
  description    String?
  tags           String[]
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  createdBy    Profile      @relation("MediaCreatedBy", fields: [createdById], references: [id])
  exercises    BlockExercise[]

  @@index([organizationId])
  @@index([createdById])
  @@index([type])
  @@map("media_assets")
  @@schema("public")
}

model Training {
  id               String       @id @default(uuid()) @db.Uuid
  organizationId   String       @map("organization_id") @db.Uuid
  createdById      String       @map("created_by_id") @db.Uuid
  title            String
  description      String?
  trainingType     TrainingType @map("training_type")
  level            String?
  groupSizeMin     Int?         @map("group_size_min")
  groupSizeMax     Int?         @map("group_size_max")
  totalDurationSec Int          @default(0) @map("total_duration_sec")
  visibility       Visibility   @default(PRIVATE)
  notes            String?
  createdAt        DateTime     @default(now()) @map("created_at")
  updatedAt        DateTime     @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  createdBy    Profile      @relation("TrainingCreatedBy", fields: [createdById], references: [id])
  blocks       TrainingBlock[]

  @@index([organizationId])
  @@index([createdById])
  @@index([organizationId, updatedAt])
  @@index([organizationId, trainingType])
  @@index([organizationId, visibility])
  @@map("trainings")
  @@schema("public")
}

model TrainingBlock {
  id                String  @id @default(uuid()) @db.Uuid
  trainingId        String  @map("training_id") @db.Uuid
  blockId           String  @map("block_id") @db.Uuid
  orderIndex        Int     @map("order_index")
  customDurationSec Int?    @map("custom_duration_sec")
  notes             String?

  training Training @relation(fields: [trainingId], references: [id])
  block    Block    @relation(fields: [blockId], references: [id])

  @@unique([trainingId, orderIndex])
  @@index([trainingId])
  @@index([blockId])
  @@map("training_blocks")
  @@schema("public")
}
```

Modelos futuros, no recomendados para aplicar en el primer cambio:

```prisma
enum StudentStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum ClassStatus {
  DRAFT
  SCHEDULED
  CANCELLED
  COMPLETED
}

enum BookingStatus {
  BOOKED
  CANCELLED
  ATTENDED
  NO_SHOW
}

model Student {
  id             String        @id @default(uuid()) @db.Uuid
  organizationId String        @map("organization_id") @db.Uuid
  createdById    String        @map("created_by_id") @db.Uuid
  firstName      String        @map("first_name")
  lastName       String?       @map("last_name")
  email          String?
  phone          String?
  status         StudentStatus @default(ACTIVE)
  notes          String?
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  @@index([organizationId])
  @@index([email])
  @@index([status])
  @@map("students")
  @@schema("public")
}

model ClassSession {
  id             String      @id @default(uuid()) @db.Uuid
  organizationId String      @map("organization_id") @db.Uuid
  trainingId     String?     @map("training_id") @db.Uuid
  coachId        String?     @map("coach_id") @db.Uuid
  title          String
  startsAt       DateTime    @map("starts_at")
  endsAt         DateTime    @map("ends_at")
  capacity       Int?
  status         ClassStatus @default(SCHEDULED)
  createdAt      DateTime    @default(now()) @map("created_at")
  updatedAt      DateTime    @updatedAt @map("updated_at")

  @@index([organizationId])
  @@index([startsAt])
  @@index([coachId])
  @@index([trainingId])
  @@map("class_sessions")
  @@schema("public")
}

model Booking {
  id             String        @id @default(uuid()) @db.Uuid
  organizationId String        @map("organization_id") @db.Uuid
  classSessionId String        @map("class_session_id") @db.Uuid
  studentId      String        @map("student_id") @db.Uuid
  status         BookingStatus @default(BOOKED)
  createdAt      DateTime      @default(now()) @map("created_at")
  cancelledAt    DateTime?     @map("cancelled_at")

  @@unique([classSessionId, studentId])
  @@index([organizationId])
  @@index([studentId])
  @@map("bookings")
  @@schema("public")
}
```

## 13. Riesgos de migración desde la base actual

### Datos existentes sin organización

Los bloques, entrenamientos y media actuales tienen `userId`, pero no `organizationId`.

Habrá que decidir cómo crear organizaciones iniciales:

- Una organización personal por usuario.
- Una organización única temporal para todos los datos.
- Migración manual por usuario real.

La opción más segura para SaaS es crear una organización por cada usuario propietario actual.

### `userId` sin relación formal

Si hay datos con `userId` que no existen en `profiles`, la migración puede fallar al crear relaciones.

Antes de migrar conviene auditar:

- Usuarios en `profiles`.
- `userId` únicos en `blocks`.
- `userId` únicos en `trainings`.
- `userId` únicos en `media_assets`.

### Cambio de roles

El rol actual vive en `Profile.role`. En el nuevo modelo, el rol principal vive en `OrganizationMember.role`.

Habrá que mapear:

- `admin` actual a `OWNER` o `ADMIN`.
- `trainer` actual a `COACH`.

### Cambio de strings a enums

Campos como `trainingType` y `media.type` actualmente son strings.

Antes de convertirlos a enum hay que revisar si existen valores no esperados.

### Constraints de orden

Añadir `@@unique([blockId, orderIndex])` puede fallar si ya existen ejercicios duplicados en el mismo bloque.

Añadir `@@unique([trainingId, orderIndex])` puede fallar si ya existen bloques duplicados en la misma posición dentro de un entrenamiento.

Primero habría que limpiar o recalcular orden.

### Duraciones desnormalizadas

Los campos calculados pueden quedar desactualizados durante una migración:

- `Block.estimatedDurationSec`
- `Training.totalDurationSec`

Después de migrar conviene ejecutar un recalculo controlado.

### Cambios de API

El backend actual espera `user.id` y filtra por `userId`.

Con organizaciones, los endpoints deberán recibir o resolver `organizationId`.

Opciones:

- Enviar `organizationId` en la ruta: `/organizations/:organizationId/blocks`.
- Enviar organización activa como header.
- Resolver organización activa desde sesión/preferencia.

Para claridad y seguridad, lo mejor al inicio es usar rutas con `organizationId`.

## 14. Orden recomendado para aplicar los cambios

### Fase 1: Preparación

1. Documentar el modelo actual y la dirección SaaS.
2. Auditar datos actuales.
3. Añadir tests sobre ownership actual.
4. Corregir riesgos existentes de reorder y rutas.
5. Decidir estrategia de organización inicial para datos existentes.

### Fase 2: Base multi-tenant

1. Crear `Organization`.
2. Crear `OrganizationMember`.
3. Crear una organización inicial por cada usuario actual.
4. Crear memberships iniciales.
5. Migrar roles desde `Profile.role` hacia `OrganizationMember.role`.

### Fase 3: Adaptar recursos existentes

1. Añadir `organizationId` y `createdById` a `Block`.
2. Añadir `organizationId` y `createdById` a `Training`.
3. Añadir `organizationId` y `createdById` a `MediaAsset`.
4. Poblar esos campos desde los `userId` actuales.
5. Mantener `userId` temporalmente si hace falta compatibilidad.
6. Actualizar services para filtrar por organización y permisos.

### Fase 4: Endpoints SaaS

1. Crear endpoints de organizaciones.
2. Crear endpoints de miembros.
3. Crear endpoint `/auth/me` con organizaciones disponibles.
4. Cambiar rutas principales hacia contexto de organización.
5. Añadir guard de membership.
6. Añadir guard de roles por organización.

### Fase 5: Limpieza y constraints

1. Verificar datos migrados.
2. Añadir índices.
3. Añadir constraints de orden.
4. Convertir strings controlados a enums.
5. Eliminar o deprecar `userId` en recursos principales.
6. Eliminar o redefinir `Profile.role`.

### Fase 6: Funcionalidades futuras

1. Implementar invitaciones reales.
2. Implementar media con Supabase Storage.
3. Implementar dashboard básico.
4. Diseñar alumnos.
5. Diseñar clases.
6. Diseñar reservas.
7. Añadir billing cuando el producto base esté validado.

## Conclusión

El modelo actual ya contiene el núcleo más valioso de BoxPlanner: planificación mediante bloques, ejercicios y entrenamientos reutilizables.

La evolución SaaS no requiere rehacer ese núcleo. Requiere añadir una capa sólida de organización, miembros y permisos, y mover la propiedad desde `userId` individual hacia `organizationId` más `createdById`.

La prioridad debería ser construir primero un multi-tenant simple y seguro. Alumnos, clases y reservas tienen sentido como evolución futura, pero no deberían desplazar el foco inicial: ayudar a entrenadores y gimnasios a planificar mejor sus sesiones.
