import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD_DEMO = "demo1234";

async function main() {
  const slug = "demo";

  await prisma.tenant.deleteMany({ where: { slug } });

  await prisma.tenant.create({
    data: {
      slug,
      nombre: "Estudio Demo",
      moneda: "ARS",
      tarifaHoraria: 25000,
      minimoEstudio: 15000,
      cmPorHora: 4,
      passwordHash: await bcrypt.hash(PASSWORD_DEMO, 10),
      zonas: {
        create: [
          { zona: "espalda_alta", multiplicador: 0.85 },
          { zona: "espalda_media", multiplicador: 0.85 },
          { zona: "muslo", multiplicador: 0.85 },
          { zona: "gluteo", multiplicador: 0.85 },
          { zona: "pantorrilla", multiplicador: 0.9 },
          { zona: "zona_lumbar", multiplicador: 0.95 },
          { zona: "brazo", multiplicador: 1.0 },
          { zona: "antebrazo", multiplicador: 1.0 },
          { zona: "triceps", multiplicador: 1.0 },
          { zona: "hombro", multiplicador: 1.0 },
          { zona: "abdomen", multiplicador: 1.0 },
          { zona: "pecho", multiplicador: 1.05 },
          { zona: "nuca", multiplicador: 1.05 },
          { zona: "muslo_interno", multiplicador: 1.1 },
          { zona: "cuello", multiplicador: 1.15 },
          { zona: "cadera", multiplicador: 1.15 },
          { zona: "muneca", multiplicador: 1.15 },
          { zona: "axila", multiplicador: 1.2 },
          { zona: "espinilla", multiplicador: 1.2 },
          { zona: "clavicula", multiplicador: 1.3 },
          { zona: "columna", multiplicador: 1.3 },
          { zona: "tobillo", multiplicador: 1.3 },
          { zona: "mano", multiplicador: 1.35 },
          { zona: "pie", multiplicador: 1.4 },
          { zona: "costillas", multiplicador: 1.4 },
          { zona: "codo", multiplicador: 1.5 },
          { zona: "rodilla", multiplicador: 1.5 },
          { zona: "esternon", multiplicador: 1.55 },
        ],
      },
      tecnicas: {
        create: [
          { nombre: "lineas_finas", multiplicadorHoras: 1.0 },
          { nombre: "lettering", multiplicadorHoras: 0.85 },
          { nombre: "tribal", multiplicadorHoras: 0.95 },
          { nombre: "tradicional_americano", multiplicadorHoras: 1.1 },
          { nombre: "blackwork", multiplicadorHoras: 1.15 },
          { nombre: "new_school", multiplicadorHoras: 1.2 },
          { nombre: "stick_and_poke", multiplicadorHoras: 1.3 },
          { nombre: "chicano", multiplicadorHoras: 1.3 },
          { nombre: "blackout", multiplicadorHoras: 1.3 },
          { nombre: "neotradicional", multiplicadorHoras: 1.35 },
          { nombre: "trash_polka", multiplicadorHoras: 1.35 },
          { nombre: "acuarela", multiplicadorHoras: 1.4 },
          { nombre: "geometrico", multiplicadorHoras: 1.45 },
          { nombre: "japones", multiplicadorHoras: 1.5 },
          { nombre: "realismo", multiplicadorHoras: 1.6 },
          { nombre: "aguja_unica", multiplicadorHoras: 1.7 },
          { nombre: "puntillismo", multiplicadorHoras: 1.75 },
          { nombre: "realismo_color", multiplicadorHoras: 1.85 },
        ],
      },
      calidadesProducto: {
        create: [
          { nivel: "estandar", costoFijo: 0 },
          { nivel: "premium", costoFijo: 8000 },
        ],
      },
      horarios: {
        create: [
          { franja: "horario_habitual", recargoPorcentual: 0 },
          { franja: "fuera_de_horario", recargoPorcentual: 15 },
          { franja: "urgente_mismo_dia", recargoPorcentual: 30 },
        ],
      },
    },
  });

  console.log(`Tenant "${slug}" creado. Contraseña de dev: "${PASSWORD_DEMO}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
