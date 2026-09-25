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
          { zona: "brazo", multiplicador: 1.0 },
          { zona: "espalda", multiplicador: 0.85 },
          { zona: "pierna", multiplicador: 1.0 },
          { zona: "pecho", multiplicador: 1.15 },
          { zona: "cuello", multiplicador: 1.35 },
        ],
      },
      tecnicas: {
        create: [
          { nombre: "lineas_finas", multiplicadorHoras: 1.0 },
          { nombre: "blackwork", multiplicadorHoras: 1.15 },
          { nombre: "realismo", multiplicadorHoras: 1.6 },
          { nombre: "acuarela", multiplicadorHoras: 1.4 },
        ],
      },
      especializaciones: {
        create: [
          { nivel: "cualquiera_del_estudio", multiplicadorTarifa: 1.0 },
          { nivel: "pocos_en_la_zona", multiplicadorTarifa: 1.3 },
          { nivel: "soy_el_unico", multiplicadorTarifa: 1.7 },
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
