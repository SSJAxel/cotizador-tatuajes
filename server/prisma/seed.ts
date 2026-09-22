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
      agujasIncluidas: 1,
      agujasPrecioExtra: 1500,
      passwordHash: await bcrypt.hash(PASSWORD_DEMO, 10),
      zonas: {
        create: [
          { zona: "brazo", precioPorCm: 8000 },
          { zona: "espalda", precioPorCm: 7000 },
          { zona: "pierna", precioPorCm: 7500 },
          { zona: "pecho", precioPorCm: 8500 },
          { zona: "cuello", precioPorCm: 10000 },
        ],
      },
      tecnicas: {
        create: [
          { nombre: "lineas_finas", multiplicador: 1.0, costoInsumoTintas: 1500 },
          { nombre: "blackwork", multiplicador: 1.1, costoInsumoTintas: 1500 },
          { nombre: "realismo", multiplicador: 1.4, costoInsumoTintas: 6000 },
          { nombre: "acuarela", multiplicador: 1.3, costoInsumoTintas: 8000 },
        ],
      },
      especializaciones: {
        create: [
          { nivel: "cualquiera_del_estudio", multiplicador: 1.0 },
          { nivel: "pocos_en_la_zona", multiplicador: 1.2 },
          { nivel: "soy_el_unico", multiplicador: 1.5 },
        ],
      },
      calidadesProducto: {
        create: [
          { nivel: "estandar", costoFijo: 0 },
          { nivel: "premium", costoFijo: 5000 },
        ],
      },
      horarios: {
        create: [
          { franja: "horario_habitual", recargoPorcentual: 0 },
          { franja: "fuera_de_horario", recargoPorcentual: 15 },
          { franja: "urgente_mismo_dia", recargoPorcentual: 25 },
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
