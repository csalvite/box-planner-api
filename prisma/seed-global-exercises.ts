import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  exercise_category as ExerciseCategory,
  exercise_intensity as ExerciseIntensity,
  exercise_level as ExerciseLevel,
  PrismaClient,
} from '@prisma/client';
import pg from 'pg';

type MaterialSeed = {
  name: string;
  slug: string;
};

type TagSeed = {
  name: string;
  slug: string;
  category?: string;
};

type ExerciseSeed = {
  name: string;
  shortDescription: string;
  detailedDescription?: string;
  category: ExerciseCategory;
  mainGoal: string;
  level?: ExerciseLevel;
  averageDurationMinutes?: number;
  intensity?: ExerciseIntensity;
  recommendedGroupSize?: string;
  spaceRequired?: string;
  requiresPartner?: boolean;
  coachNotes?: string;
  tagSlugs?: string[];
  materialSlugs?: string[];
};

const materials: MaterialSeed[] = [
  { name: 'Guantes', slug: 'guantes' },
  { name: 'Saco', slug: 'saco' },
  { name: 'Comba', slug: 'comba' },
  { name: 'Manoplas', slug: 'manoplas' },
  { name: 'Paos', slug: 'paos' },
  { name: 'Esterilla', slug: 'esterilla' },
  { name: 'Cronometro', slug: 'cronometro' },
];

const tags: TagSeed[] = [
  { name: 'Jab', slug: 'jab', category: 'golpes' },
  { name: 'Cross', slug: 'cross', category: 'golpes' },
  { name: 'Crochet', slug: 'crochet', category: 'golpes' },
  { name: 'Uppercut', slug: 'uppercut', category: 'golpes' },
  { name: 'Defensa', slug: 'defensa', category: 'tecnica' },
  { name: 'Esquivas', slug: 'esquivas', category: 'tecnica' },
  { name: 'Desplazamientos', slug: 'desplazamientos', category: 'tecnica' },
  { name: 'Guardia', slug: 'guardia', category: 'tecnica' },
  { name: 'Presion', slug: 'presion', category: 'tactica' },
  { name: 'Sombra', slug: 'sombra', category: 'tecnica' },
  { name: 'Saco', slug: 'saco', category: 'material' },
  { name: 'Cardio', slug: 'cardio', category: 'fisico' },
  { name: 'Core', slug: 'core', category: 'fisico' },
  { name: 'Coordinacion', slug: 'coordinacion', category: 'fisico' },
];

const exercises: ExerciseSeed[] = [
  {
    name: 'Sombra libre',
    shortDescription: 'Trabajo libre de sombra para activar tecnica y ritmo.',
    category: ExerciseCategory.SHADOW,
    mainGoal: 'Mejorar fluidez, coordinacion y visualizacion.',
    averageDurationMinutes: 5,
    intensity: ExerciseIntensity.MEDIUM,
    spaceRequired: 'Espacio libre pequeno',
    tagSlugs: ['sombra', 'coordinacion', 'guardia'],
    materialSlugs: ['cronometro'],
  },
  {
    name: 'Jab-cross frente al espejo',
    shortDescription: 'Practica de jab-cross cuidando guardia, eje y retorno.',
    category: ExerciseCategory.TECHNIQUE,
    mainGoal: 'Pulir mecanica basica de golpes rectos.',
    averageDurationMinutes: 6,
    intensity: ExerciseIntensity.LOW,
    spaceRequired: 'Frente a espejo o pared',
    tagSlugs: ['jab', 'cross', 'guardia'],
  },
  {
    name: 'Desplazamientos basicos',
    shortDescription: 'Pasos laterales, avance y retroceso manteniendo guardia.',
    category: ExerciseCategory.WARMUP,
    mainGoal: 'Activar piernas y mejorar equilibrio.',
    averageDurationMinutes: 8,
    intensity: ExerciseIntensity.LOW,
    tagSlugs: ['desplazamientos', 'guardia', 'coordinacion'],
  },
  {
    name: 'Comba suave',
    shortDescription: 'Salto continuo a ritmo comodo para entrar en calor.',
    category: ExerciseCategory.CARDIO,
    mainGoal: 'Elevar pulsaciones y coordinar pies.',
    averageDurationMinutes: 5,
    intensity: ExerciseIntensity.LOW,
    materialSlugs: ['comba', 'cronometro'],
    tagSlugs: ['cardio', 'coordinacion'],
  },
  {
    name: 'Comba por intervalos',
    shortDescription: 'Bloques de comba con cambios de ritmo controlados.',
    category: ExerciseCategory.HIIT,
    mainGoal: 'Trabajar condicion fisica e intervalos.',
    averageDurationMinutes: 10,
    intensity: ExerciseIntensity.HIGH,
    materialSlugs: ['comba', 'cronometro'],
    tagSlugs: ['cardio', 'coordinacion'],
  },
  {
    name: 'Saco jab-cross',
    shortDescription: 'Series de jab-cross al saco con control de distancia.',
    category: ExerciseCategory.BAG,
    mainGoal: 'Transferir golpes rectos a impacto.',
    averageDurationMinutes: 8,
    intensity: ExerciseIntensity.MEDIUM,
    materialSlugs: ['guantes', 'saco', 'cronometro'],
    tagSlugs: ['jab', 'cross', 'saco'],
  },
  {
    name: 'Saco combinaciones libres',
    shortDescription: 'Trabajo libre de combinaciones al saco manteniendo defensa.',
    category: ExerciseCategory.BAG,
    mainGoal: 'Mejorar continuidad ofensiva y ritmo.',
    averageDurationMinutes: 10,
    intensity: ExerciseIntensity.HIGH,
    materialSlugs: ['guantes', 'saco', 'cronometro'],
    tagSlugs: ['jab', 'cross', 'crochet', 'uppercut', 'saco', 'presion'],
  },
  {
    name: 'Defensa con esquivas',
    shortDescription: 'Esquivas laterales y flexiones de tronco con retorno a guardia.',
    category: ExerciseCategory.TECHNIQUE,
    mainGoal: 'Automatizar defensa y recuperacion de posicion.',
    averageDurationMinutes: 7,
    intensity: ExerciseIntensity.MEDIUM,
    tagSlugs: ['defensa', 'esquivas', 'guardia'],
  },
  {
    name: 'Tocar hombros por parejas',
    shortDescription: 'Juego por parejas para tocar hombros sin perder base.',
    category: ExerciseCategory.PARTNER,
    mainGoal: 'Entrenar distancia, reaccion y desplazamientos.',
    averageDurationMinutes: 6,
    intensity: ExerciseIntensity.MEDIUM,
    recommendedGroupSize: 'Parejas',
    requiresPartner: true,
    tagSlugs: ['desplazamientos', 'defensa', 'coordinacion'],
  },
  {
    name: 'Guardia y pasos adelante/atras',
    shortDescription: 'Drill tecnico de guardia con pasos lineales.',
    category: ExerciseCategory.TECHNIQUE,
    mainGoal: 'Consolidar postura y movimiento basico.',
    averageDurationMinutes: 6,
    intensity: ExerciseIntensity.LOW,
    tagSlugs: ['guardia', 'desplazamientos'],
  },
  {
    name: 'Manoplas jab-cross',
    shortDescription: 'Trabajo de jab-cross con entrenador usando manoplas.',
    category: ExerciseCategory.PARTNER,
    mainGoal: 'Mejorar precision, distancia y timing.',
    averageDurationMinutes: 8,
    intensity: ExerciseIntensity.MEDIUM,
    recommendedGroupSize: 'Parejas',
    requiresPartner: true,
    materialSlugs: ['guantes', 'manoplas', 'cronometro'],
    tagSlugs: ['jab', 'cross', 'coordinacion'],
  },
  {
    name: 'Burpees',
    shortDescription: 'Burpees con tecnica controlada y ritmo constante.',
    category: ExerciseCategory.HIIT,
    mainGoal: 'Desarrollar potencia y resistencia general.',
    averageDurationMinutes: 4,
    intensity: ExerciseIntensity.HIGH,
    tagSlugs: ['cardio'],
  },
  {
    name: 'Sentadillas',
    shortDescription: 'Sentadillas de peso corporal para fuerza de piernas.',
    category: ExerciseCategory.STRENGTH,
    mainGoal: 'Fortalecer tren inferior.',
    averageDurationMinutes: 5,
    intensity: ExerciseIntensity.MEDIUM,
  },
  {
    name: 'Flexiones',
    shortDescription: 'Flexiones de brazos con linea corporal estable.',
    category: ExerciseCategory.STRENGTH,
    mainGoal: 'Fortalecer empuje y estabilidad.',
    averageDurationMinutes: 5,
    intensity: ExerciseIntensity.MEDIUM,
    tagSlugs: ['core'],
  },
  {
    name: 'Plancha frontal',
    shortDescription: 'Plancha frontal manteniendo respiracion y control lumbar.',
    category: ExerciseCategory.CORE,
    mainGoal: 'Mejorar estabilidad central.',
    averageDurationMinutes: 3,
    intensity: ExerciseIntensity.MEDIUM,
    materialSlugs: ['esterilla', 'cronometro'],
    tagSlugs: ['core'],
  },
  {
    name: 'Abdominales basicos',
    shortDescription: 'Trabajo abdominal sencillo y controlado.',
    category: ExerciseCategory.CORE,
    mainGoal: 'Fortalecer abdomen.',
    averageDurationMinutes: 5,
    intensity: ExerciseIntensity.MEDIUM,
    materialSlugs: ['esterilla'],
    tagSlugs: ['core'],
  },
  {
    name: 'Mountain climbers',
    shortDescription: 'Rodillas alternas al pecho en posicion de plancha.',
    category: ExerciseCategory.CARDIO,
    mainGoal: 'Elevar pulsaciones y activar core.',
    averageDurationMinutes: 4,
    intensity: ExerciseIntensity.HIGH,
    materialSlugs: ['cronometro'],
    tagSlugs: ['cardio', 'core', 'coordinacion'],
  },
  {
    name: 'Movilidad de hombros',
    shortDescription: 'Movilidad articular de hombros y escapulas.',
    category: ExerciseCategory.WARMUP,
    mainGoal: 'Preparar hombros para golpeo y guardia.',
    averageDurationMinutes: 4,
    intensity: ExerciseIntensity.LOW,
  },
  {
    name: 'Estiramientos finales',
    shortDescription: 'Estiramientos suaves para cerrar la sesion.',
    category: ExerciseCategory.COOLDOWN,
    mainGoal: 'Reducir tension y favorecer recuperacion.',
    averageDurationMinutes: 8,
    intensity: ExerciseIntensity.LOW,
    materialSlugs: ['esterilla'],
  },
  {
    name: 'Respiracion y vuelta a la calma',
    shortDescription: 'Respiracion guiada y pausa final de recuperacion.',
    category: ExerciseCategory.OTHER,
    mainGoal: 'Normalizar pulsaciones y cerrar el entrenamiento.',
    averageDurationMinutes: 5,
    intensity: ExerciseIntensity.LOW,
    materialSlugs: ['esterilla'],
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed global exercises');
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const materialIds = await seedMaterials(prisma);
    const tagIds = await seedTags(prisma);
    await seedExercises(prisma, tagIds, materialIds);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

async function seedMaterials(prisma: PrismaClient) {
  const ids = new Map<string, string>();

  for (const material of materials) {
    const existing = await prisma.material.findFirst({
      where: {
        slug: material.slug,
        isGlobal: true,
        organizationId: null,
      },
    });

    const saved = existing
      ? await prisma.material.update({
          where: { id: existing.id },
          data: {
            name: material.name,
            slug: material.slug,
            isGlobal: true,
            organizationId: null,
          },
        })
      : await prisma.material.create({
          data: {
            name: material.name,
            slug: material.slug,
            isGlobal: true,
            organizationId: null,
          },
        });

    ids.set(material.slug, saved.id);
  }

  return ids;
}

async function seedTags(prisma: PrismaClient) {
  const ids = new Map<string, string>();

  for (const tag of tags) {
    const existing = await prisma.exerciseTag.findFirst({
      where: {
        slug: tag.slug,
        isGlobal: true,
        organizationId: null,
      },
    });

    const saved = existing
      ? await prisma.exerciseTag.update({
          where: { id: existing.id },
          data: {
            name: tag.name,
            slug: tag.slug,
            category: tag.category,
            isGlobal: true,
            organizationId: null,
          },
        })
      : await prisma.exerciseTag.create({
          data: {
            name: tag.name,
            slug: tag.slug,
            category: tag.category,
            isGlobal: true,
            organizationId: null,
          },
        });

    ids.set(tag.slug, saved.id);
  }

  return ids;
}

async function seedExercises(
  prisma: PrismaClient,
  tagIds: Map<string, string>,
  materialIds: Map<string, string>,
) {
  for (const exercise of exercises) {
    const existing = await prisma.exercise.findFirst({
      where: {
        name: exercise.name,
        isGlobal: true,
        organizationId: null,
      },
    });

    const saved = existing
      ? await prisma.exercise.update({
          where: { id: existing.id },
          data: exerciseData(exercise),
        })
      : await prisma.exercise.create({
          data: exerciseData(exercise),
        });

    for (const slug of exercise.tagSlugs ?? []) {
      const tagId = tagIds.get(slug);
      if (!tagId) {
        continue;
      }

      await prisma.exerciseToTag.upsert({
        where: {
          exerciseId_tagId: {
            exerciseId: saved.id,
            tagId,
          },
        },
        update: {},
        create: {
          exerciseId: saved.id,
          tagId,
        },
      });
    }

    for (const slug of exercise.materialSlugs ?? []) {
      const materialId = materialIds.get(slug);
      if (!materialId) {
        continue;
      }

      await prisma.exerciseToMaterial.upsert({
        where: {
          exerciseId_materialId: {
            exerciseId: saved.id,
            materialId,
          },
        },
        update: {},
        create: {
          exerciseId: saved.id,
          materialId,
        },
      });
    }
  }
}

function exerciseData(exercise: ExerciseSeed) {
  return {
    organizationId: null,
    createdByProfileId: null,
    name: exercise.name,
    shortDescription: exercise.shortDescription,
    detailedDescription: exercise.detailedDescription,
    category: exercise.category,
    mainGoal: exercise.mainGoal,
    level: exercise.level ?? ExerciseLevel.ALL_LEVELS,
    averageDurationMinutes: exercise.averageDurationMinutes,
    intensity: exercise.intensity ?? ExerciseIntensity.MEDIUM,
    recommendedGroupSize: exercise.recommendedGroupSize,
    spaceRequired: exercise.spaceRequired,
    requiresPartner: exercise.requiresPartner ?? false,
    coachNotes: exercise.coachNotes,
    isGlobal: true,
    isActive: true,
  };
}

main()
  .then(() => {
    console.log('Global exercise library seed completed.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
