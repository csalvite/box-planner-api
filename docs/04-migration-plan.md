# Plan de migración destructiva hacia SaaS v1

Este documento describe el plan para resetear y reestructurar la base de datos de Supabase hacia el modelo SaaS v1 de BoxPlanner.

No contiene SQL final. No debe ejecutarse nada a partir de este documento sin una revisión posterior y sin generar un script SQL específico.

## 1. Objetivo de la migración

El objetivo es pasar de un modelo centrado en usuario individual a un modelo SaaS multi-tenant basado en organizaciones.

El modelo actual usa principalmente `userId` como propietario de recursos como bloques, media y entrenamientos. Para convertir BoxPlanner en un SaaS para entrenadores y gimnasios, los recursos principales deben pertenecer a una organización y conservar quién los creó.

El nuevo núcleo MVP será:

- `profiles`
- `organizations`
- `organization_members`
- `invitations`
- `block_categories`
- `blocks`
- `block_exercises`
- `media_assets`
- `trainings`
- `training_blocks`

No se incluirán todavía:

- `students`
- `class_sessions`
- `bookings`
- `payments`
- `billing`
- planes de suscripción

La migración será destructiva porque el proyecto está en fase temprana y se acepta perder los datos actuales para simplificar el rediseño.

## 2. Tablas actuales afectadas

Las tablas actuales afectadas son:

- `profiles`
- `block_categories`
- `blocks`
- `block_exercises`
- `media_assets`
- `trainings`
- `training_blocks`

También pueden existir tablas internas de Supabase en el schema `auth`, especialmente `auth.users`. Esas tablas no deben eliminarse ni modificarse directamente salvo que se esté haciendo un reset completo controlado del proyecto Supabase.

Tablas de Supabase Auth que deben tratarse con especial cuidado:

- `auth.users`
- tablas relacionadas con sesiones, identidades o refresh tokens

La migración propuesta se centra en el schema `public`.

## 3. Tablas nuevas

### `organizations`

Representa gimnasios, academias, equipos o workspaces.

Será la entidad principal de multi-tenancy.

### `organization_members`

Relaciona usuarios (`profiles`) con organizaciones.

Define el rol del usuario dentro de cada organización.

### `invitations`

Gestiona invitaciones pendientes o aceptadas para que usuarios se unan a una organización.

Sustituirá progresivamente la creación de usuarios con contraseña temporal.

## 4. Tablas que se mantienen conceptualmente pero se recrean

Estas tablas se mantienen como concepto de negocio, pero se recomienda recrearlas para adaptarlas correctamente al modelo SaaS:

### `profiles`

Se mantiene como perfil de aplicación asociado a usuarios de Supabase Auth.

Cambios conceptuales:

- El rol global deja de ser el centro del sistema.
- Los roles pasan a vivir en `organization_members`.
- Puede conservar datos globales como email, nombre visible o avatar.

### `block_categories`

Se mantiene como catálogo de categorías de bloques.

Para MVP se recomienda mantener categorías globales, no por organización.

### `blocks`

Se mantiene como bloque reutilizable de entrenamiento.

Cambios necesarios:

- Añadir `organization_id`.
- Añadir `created_by_id`.
- Sustituir o deprecar `user_id`.
- Añadir visibilidad si se quiere distinguir privado y compartido.

### `block_exercises`

Se mantiene como ejercicio dentro de un bloque.

Puede seguir dependiendo de `block_id` sin `organization_id` propio, siempre que la autorización se haga a través del bloque.

### `media_assets`

Se mantiene como recurso multimedia.

Cambios necesarios:

- Añadir `organization_id`.
- Añadir `created_by_id`.
- Convertir `type` a enum o constraint.

### `trainings`

Se mantiene como entrenamiento completo.

Cambios necesarios:

- Añadir `organization_id`.
- Añadir `created_by_id`.
- Sustituir o deprecar `user_id`.
- Convertir `training_type` a enum o constraint.
- Añadir visibilidad si aplica.

### `training_blocks`

Se mantiene como tabla puente entre entrenamientos y bloques.

Puede seguir dependiendo de `training_id` y `block_id` sin `organization_id` propio, siempre que se valide a través del entrenamiento y del bloque.

## 5. Datos que se perderán

Como la migración aceptada es destructiva, se perderán los datos actuales del schema `public` relacionados con:

- perfiles de aplicación existentes
- categorías de bloques existentes
- bloques existentes
- ejercicios existentes
- media existente
- entrenamientos existentes
- relaciones entre entrenamientos y bloques

También se perderán:

- duraciones calculadas actuales
- orden actual de ejercicios
- orden actual de bloques dentro de entrenamientos
- notas y descripciones existentes
- relaciones de media con ejercicios

Si se elimina o resetea también Supabase Auth, se perderán además:

- usuarios de autenticación
- contraseñas
- sesiones
- identidades
- refresh tokens

Recomendación: para esta migración, evitar tocar `auth` salvo que se decida conscientemente resetear todo el proyecto Supabase.

## 6. Orden recomendado de reset

El reset debe hacerse con cuidado por las claves foráneas.

Orden conceptual para eliminar o recrear tablas del schema `public`:

1. `training_blocks`
2. `block_exercises`
3. `trainings`
4. `blocks`
5. `media_assets`
6. `block_categories`
7. `invitations`, si ya existiera
8. `organization_members`, si ya existiera
9. `organizations`, si ya existiera
10. `profiles`

Notas:

- El orden puede variar si se usa `DROP TABLE ... CASCADE`, pero `CASCADE` debe usarse con mucha prudencia.
- Antes de ejecutar SQL destructivo, revisar dependencias reales en Supabase.
- No eliminar tablas del schema `auth` como parte de este plan.

## 7. Orden recomendado de creación

Orden conceptual para crear el nuevo modelo:

1. Crear enums.
2. Crear `profiles`.
3. Crear `organizations`.
4. Crear `organization_members`.
5. Crear `invitations`.
6. Crear `block_categories`.
7. Crear `media_assets`.
8. Crear `blocks`.
9. Crear `block_exercises`.
10. Crear `trainings`.
11. Crear `training_blocks`.
12. Crear índices.
13. Crear constraints adicionales.
14. Crear seeds iniciales.
15. Verificar acceso desde Prisma.

Este orden evita referencias a tablas que todavía no existen.

## 8. Estrategia para enums

Se recomienda introducir enums desde el inicio para evitar strings libres en campos críticos.

Enums MVP recomendados:

### `organization_type`

Valores:

- `GYM`
- `COACH`
- `TEAM`
- `OTHER`

### `organization_role`

Valores:

- `OWNER`
- `ADMIN`
- `COACH`
- `VIEWER`

### `member_status`

Valores:

- `ACTIVE`
- `INVITED`
- `SUSPENDED`
- `REMOVED`

### `invitation_status`

Valores:

- `PENDING`
- `ACCEPTED`
- `EXPIRED`
- `CANCELLED`

### `training_type`

Valores:

- `PERSONAL`
- `GROUP`

### `media_type`

Valores:

- `IMAGE`
- `VIDEO`

### `visibility`

Valores:

- `PRIVATE`
- `ORGANIZATION`
- `PUBLIC`

Para el MVP puede usarse solo `PRIVATE` y `ORGANIZATION` en lógica de aplicación, aunque el enum incluya `PUBLIC` para futuro.

Consideraciones:

- Prisma puede mapear estos enums.
- Supabase/PostgreSQL usará tipos enum nativos si se crean en SQL.
- Si se prefiere mayor flexibilidad inicial, se pueden usar strings con constraints `CHECK`, pero es menos expresivo en Prisma.
- Una vez creados enums nativos en PostgreSQL, modificarlos requiere migraciones cuidadosas.

## 9. Estrategia para seeds iniciales

Después del reset se necesitarán datos mínimos para que el sistema sea usable.

### Seed de categorías de bloques

Crear categorías iniciales realistas, por ejemplo:

- `warm_up` / Calentamiento
- `technique` / Técnica
- `footwork` / Desplazamientos
- `bag_work` / Saco
- `pads` / Manoplas
- `sparring` / Sparring
- `conditioning` / Condicionamiento
- `cool_down` / Vuelta a la calma

Estas categorías pueden mantenerse globales.

### Seed de organización inicial

Para desarrollo local o staging:

- Crear una organización demo.
- Asociar el usuario principal como `OWNER`.

Ejemplo conceptual:

- Organization: `BoxPlanner Demo Gym`
- Role del usuario principal: `OWNER`

### Seed de perfiles

Si se conserva Supabase Auth:

- Crear `profiles` para los usuarios existentes necesarios.
- El `id` debe coincidir con el UUID de Supabase Auth.

Si se resetea también Auth:

- Crear usuarios desde Supabase Auth primero.
- Luego crear `profiles` y `organization_members`.

### Seed de contenido

Para MVP puede ser útil crear:

- Algunos bloques de ejemplo.
- Ejercicios dentro de esos bloques.
- Un entrenamiento completo demo.

Pero no es obligatorio para la primera migración. Lo prioritario es validar estructura, autenticación y permisos.

## 10. Riesgos

### Pérdida de datos

La migración es destructiva. Cualquier dato actual del schema `public` puede perderse.

### Desalineación con Supabase Auth

Si se recrea `profiles` sin respetar IDs de `auth.users`, la autenticación funcionará pero el backend no encontrará perfiles o memberships.

### Errores por enums

Si el código todavía envía valores en minúscula como `personal`, `group`, `image` o `video`, pero la base espera enums en mayúscula, habrá errores.

Habrá que alinear DTOs, services y Prisma schema cuando se implemente.

### Rutas y services actuales

El backend actual filtra por `userId`. Con el nuevo modelo deberá filtrar por `organizationId` y validar membresía.

El código actual no funcionará correctamente contra el nuevo schema hasta que se adapte.

### Prisma schema no actualizado

Este plan no modifica `schema.prisma`. Si la base se cambia antes de actualizar Prisma, el cliente Prisma quedará desincronizado.

### Foreign keys y orden de creación

Crear tablas en orden incorrecto puede fallar por referencias inexistentes.

Eliminar tablas en orden incorrecto puede fallar por dependencias.

### Constraints nuevas

Constraints como orden único pueden fallar si se insertan datos duplicados.

### Supabase Row Level Security

Si se habilita RLS en Supabase, habrá que definir políticas compatibles con el backend y con el uso de service role.

Para el MVP backend, puede gestionarse autorización desde NestJS, pero no debe olvidarse el impacto de RLS si el frontend accede directamente a Supabase.

## 11. Checklist antes de ejecutar SQL

Antes de ejecutar cualquier SQL destructivo:

- Confirmar que no es producción.
- Confirmar que se acepta perder datos.
- Hacer backup si existe cualquier dato que pueda ser útil.
- Exportar el schema actual.
- Revisar tablas existentes en `public`.
- Revisar si hay triggers, policies, functions o views en Supabase.
- Confirmar si se va a conservar `auth.users`.
- Identificar el usuario principal de desarrollo.
- Tener preparado el nuevo `schema.prisma`.
- Tener preparado el SQL final.
- Tener preparados seeds mínimos.
- Tener claro el orden de ejecución.
- Cerrar conexiones activas si hiciera falta.
- Confirmar variables de entorno locales.
- Confirmar que el backend no se desplegará contra un schema a medio migrar.

## 12. Checklist después de ejecutar SQL

Después de ejecutar el reset y la creación:

- Verificar que existen todas las tablas nuevas.
- Verificar que existen todos los enums.
- Verificar claves primarias.
- Verificar claves foráneas.
- Verificar índices.
- Verificar constraints únicas.
- Insertar seeds iniciales.
- Verificar que `profiles.id` coincide con usuarios reales de Supabase Auth.
- Verificar que el usuario principal tiene membership `OWNER`.
- Ejecutar introspección o actualizar `schema.prisma`, según la estrategia elegida.
- Regenerar Prisma Client.
- Actualizar services para usar `organizationId` y `createdById`.
- Actualizar DTOs para enums nuevos.
- Actualizar tests.
- Probar autenticación.
- Probar creación de organización.
- Probar lectura de membership.
- Probar CRUD de bloques en una organización.
- Probar CRUD de entrenamientos en una organización.
- Probar que un usuario sin membership no puede acceder a recursos de otra organización.

## 13. Nota clara sobre producción

Este plan no debe ejecutarse en producción.

La migración descrita es destructiva y está pensada únicamente para una fase temprana del proyecto, en entorno local, desarrollo o como máximo staging controlado.

Antes de aplicar algo parecido en producción haría falta:

- estrategia de backup
- migraciones reversibles o parcialmente reversibles
- scripts de transformación de datos
- ventana de mantenimiento
- validación previa en staging
- plan de rollback
- auditoría de datos existentes
- pruebas automatizadas de migración

Mientras BoxPlanner esté en fase temprana, aceptar un reset puede ser razonable. Pero esa decisión deja de ser aceptable en cuanto existan usuarios reales, contenido real o datos de negocio que deban conservarse.
