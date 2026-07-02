import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Insertando datos semilla...");

  // Admin
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.admin.upsert({
    where: { email: "admin@empresa.cl" },
    update: {},
    create: {
      email: "admin@empresa.cl",
      password: passwordHash,
    },
  });
  console.log("✅ Admin creado: admin@empresa.cl / admin123");

  // Categorias
  const categorias = [
    { nombre: "Metal Siding", slug: "revestimiento-exterior-metalico", descripcion: "Revestimiento exterior metálico de alta resistencia y durabilidad.", imagen: null, orden: 1 },
    { nombre: "Piso Vinílico", slug: "pisos-spc", descripcion: "Pisos vinílicos de SPC rígidos de alta calidad para interiores.", imagen: null, orden: 2 },
    { nombre: "Piso Flotante", slug: "piso-flotante", descripcion: "Pisos flotantes elegantes y fáciles de instalar.", imagen: null, orden: 3 },
    { nombre: "Piso Deck", slug: "pisos-deck-wpc", descripcion: "Decks de WPC (madera plástica) ideales para terrazas y exteriores.", imagen: null, orden: 4 },
    { nombre: "Siding Granito", slug: "siding-tipo-granito", descripcion: "Revestimientos texturados con apariencia de granito natural.", imagen: null, orden: 5 },
    { nombre: "Piso Porcelanato", slug: "porcelanatos", descripcion: "Pisos de porcelanato de alta gama y gran resistencia.", imagen: null, orden: 6 },
    { nombre: "Siding WPC", slug: "revestimiento-exterior-wpc", descripcion: "Revestimientos exteriores de compuesto de madera plástica.", imagen: null, orden: 7 },
    { nombre: "Siding Interior", slug: "revestimientos-de-interior", descripcion: "Revestimientos decorativos de interior con diseño moderno.", imagen: null, orden: 8 },
    { nombre: "Tabla WPC Cortavista", slug: "cortavista", descripcion: "Tablas de WPC para cercos, portones y divisorios cortavista.", imagen: null, orden: 9 },
    { nombre: "Siding PVC", slug: "revestimiento-exterior-de-pvc", descripcion: "Revestimientos exteriores de PVC livianos y de nulo mantenimiento.", imagen: null, orden: 10 },
    { nombre: "Piedras PU", slug: "siding-piedras-pu", descripcion: "Paneles de poliuretano texturados con imitación piedra natural.", imagen: null, orden: 11 },
    { nombre: "Cercos WPC", slug: "cercos-wpc", descripcion: "Cercos y cierres perimetrales de WPC duraderos.", imagen: null, orden: 12 },
  ];

  for (const cat of categorias) {
    await prisma.categoria.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log("✅ Categorías creadas");

  // Productos
  const productos = [
    // Metal Siding
    { nombre: "Metal Siding Liso 290cm", slug: "metal-siding-liso-290cm", sku: "MSL-001", descripcion: "Revestimiento metálico liso de 290 cm de largo.", dimensiones: "290 cm x 38.3 cm x 1.6 cm", unidad: "m2", precio: 13380, precioAntes: 17840, descuento: 25, marca: "Marca Propia", categoriaSlug: "revestimiento-exterior-metalico", destacado: true },
    { nombre: "Metal Siding Térmico", slug: "metal-siding-termico", sku: "MST-002", descripcion: "Revestimiento metálico con aislamiento térmico incorporado.", dimensiones: "290 cm x 40 cm x 2.5 cm", unidad: "m2", precio: 18900, precioAntes: 25200, descuento: 25, marca: "Marca Propia", categoriaSlug: "revestimiento-exterior-metalico", destacado: true },
    { nombre: "Metal Siding Texturado", slug: "metal-siding-texturado", sku: "MSTX-003", descripcion: "Revestimiento metálico con textura similar a la madera.", dimensiones: "290 cm x 38.3 cm x 1.6 cm", unidad: "m2", precio: 15400, precioAntes: null, descuento: null, marca: "Marca Propia", categoriaSlug: "revestimiento-exterior-metalico", destacado: false },
    // Siding WPC
    { nombre: "Siding WPC Marrón", slug: "siding-wpc-marron", sku: "SWPC-001", descripcion: "Revestimiento WPC color marrón, ideal para fachadas.", dimensiones: "300 cm x 20 cm x 2.2 cm", unidad: "m2", precio: 22500, precioAntes: 30000, descuento: 25, marca: "Marca Propia", categoriaSlug: "revestimiento-exterior-wpc", destacado: true },
    { nombre: "Siding WPC Gris", slug: "siding-wpc-gris", sku: "SWPC-002", descripcion: "Revestimiento WPC color gris moderno.", dimensiones: "300 cm x 20 cm x 2.2 cm", unidad: "m2", precio: 22500, precioAntes: null, descuento: null, marca: "Marca Propia", categoriaSlug: "revestimiento-exterior-wpc", destacado: false },
    { nombre: "Siding WPC Blanco", slug: "siding-wpc-blanco", sku: "SWPC-003", descripcion: "Revestimiento WPC color blanco para fachadas luminosas.", dimensiones: "300 cm x 20 cm x 2.2 cm", unidad: "m2", precio: 23500, precioAntes: 31300, descuento: 25, marca: "Marca Propia", categoriaSlug: "revestimiento-exterior-wpc", destacado: true },
    // Piso Vinilico SPC
    { nombre: "Piso SPC Roble Natural", slug: "piso-spc-roble-natural", sku: "SPC-001", descripcion: "Piso vinílico SPC con terminación roble natural.", dimensiones: "122 cm x 18 cm x 0.4 cm", unidad: "m2", precio: 18900, precioAntes: 25200, descuento: 25, marca: "Marca Propia", categoriaSlug: "pisos-spc", destacado: true },
    { nombre: "Piso SPC Concreto", slug: "piso-spc-concreto", sku: "SPC-002", descripcion: "Piso vinílico SPC con apariencia de concreto pulido.", dimensiones: "122 cm x 18 cm x 0.4 cm", unidad: "m2", precio: 19900, precioAntes: null, descuento: null, marca: "Marca Propia", categoriaSlug: "pisos-spc", destacado: false },
    { nombre: "Piso SPC Madera Oscura", slug: "piso-spc-madera-oscura", sku: "SPC-003", descripcion: "Piso vinílico SPC en tono madera oscura.", dimensiones: "122 cm x 18 cm x 0.4 cm", unidad: "m2", precio: 20900, precioAntes: 27800, descuento: 25, marca: "Marca Propia", categoriaSlug: "pisos-spc", destacado: false },
    // Piso Deck WPC
    { nombre: "Deck WPC Marrón Oscuro", slug: "deck-wpc-marron-oscuro", sku: "DWPC-001", descripcion: "Deck WPC color marrón oscuro para terrazas.", dimensiones: "300 cm x 14 cm x 2.5 cm", unidad: "m2", precio: 28500, precioAntes: 38000, descuento: 25, marca: "Marca Propia", categoriaSlug: "pisos-deck-wpc", destacado: true },
    { nombre: "Deck WPC Gris Claro", slug: "deck-wpc-gris-claro", sku: "DWPC-002", descripcion: "Deck WPC color gris claro para exteriores modernos.", dimensiones: "300 cm x 14 cm x 2.5 cm", unidad: "m2", precio: 27500, precioAntes: null, descuento: null, marca: "Marca Propia", categoriaSlug: "pisos-deck-wpc", destacado: false },
    { nombre: "Deck WPC Roble", slug: "deck-wpc-roble", sku: "DWPC-003", descripcion: "Deck WPC con terminación roble.", dimensiones: "300 cm x 14 cm x 2.5 cm", unidad: "m2", precio: 29500, precioAntes: 39300, descuento: 25, marca: "Marca Propia", categoriaSlug: "pisos-deck-wpc", destacado: false },
    // Siding Granito
    { nombre: "Siding Granito Clásico", slug: "siding-granito-clasico", sku: "SGR-001", descripcion: "Revestimiento con apariencia de granito clásico.", dimensiones: "300 cm x 20 cm x 2.5 cm", unidad: "m2", precio: 16800, precioAntes: 22400, descuento: 25, marca: "Marca Propia", categoriaSlug: "siding-tipo-granito", destacado: true },
    { nombre: "Siding Granito Blanco", slug: "siding-granito-blanco", sku: "SGR-002", descripcion: "Revestimiento granito en tono blanco.", dimensiones: "300 cm x 20 cm x 2.5 cm", unidad: "m2", precio: 17800, precioAntes: null, descuento: null, marca: "Marca Propia", categoriaSlug: "siding-tipo-granito", destacado: false },
    { nombre: "Siding Granito Gris", slug: "siding-granito-gris", sku: "SGR-003", descripcion: "Revestimiento granito color gris.", dimensiones: "300 cm x 20 cm x 2.5 cm", unidad: "m2", precio: 17300, precioAntes: 23000, descuento: 25, marca: "Marca Propia", categoriaSlug: "siding-tipo-granito", destacado: false },
  ];

  for (const prod of productos) {
    const categoria = await prisma.categoria.findUnique({ where: { slug: prod.categoriaSlug } });
    if (!categoria) continue;

    await prisma.producto.upsert({
      where: { slug: prod.slug },
      update: {},
      create: {
        nombre: prod.nombre,
        slug: prod.slug,
        sku: prod.sku,
        descripcion: prod.descripcion,
        dimensiones: prod.dimensiones,
        unidad: prod.unidad,
        precio: prod.precio,
        precioAntes: prod.precioAntes,
        descuento: prod.descuento,
        marca: prod.marca,
        imagenes: "[]",
        destacado: prod.destacado,
        categoriaId: categoria.id,
      },
    });
  }
  console.log("✅ Productos creados");

  // Banners (limpiar y recrear)
  await prisma.banner.deleteMany();
  const banners = [
    { titulo: "Revestimientos de Primera Calidad", subtitulo: "Transforma tus espacios con nuestros materiales", badge: "Hasta 40% Off", imagen: "", imagenMovil: null, url: "/revestimiento-exterior-metalico", orden: 1 },
    { titulo: "Pisos que Inspiran", subtitulo: "Descubre nuestra colección de pisos vinílicos SPC", badge: "Nuevos Ingresos", imagen: "", imagenMovil: null, url: "/pisos-spc", orden: 2 },
  ];
  await prisma.banner.createMany({ data: banners });
  console.log("✅ Banners creados");

  // Sucursales (limpiar y recrear)
  await prisma.sucursal.deleteMany();
  const sucursales = [
    { nombre: "Santiago", zona: "Zona Centro - RM", direccion: "Av. Libertador Bernardo O'Higgins 1234, Santiago Centro", region: "Región Metropolitana", esCasaMatriz: true, horarioAtencion: "Lun a Vie: 08:30 - 18:30 | Sáb: 09:00 - 14:00", horarioEntrega: "Lun a Vie: 08:30 - 17:00 | Sáb: 09:00 - 13:00", whatsapp: "56958110962", telefono: "226001234", emailPostventa: "postventa.santiago@empresa.cl", urlMaps: "https://maps.google.com/?q=Av+Libertador+Bernardo+O'Higgins+1234+Santiago", activo: true, orden: 1 },
    { nombre: "Chillán", zona: "Zona Sur - Ñuble", direccion: "Av. O'Higgins 567, Chillán Centro", region: "Región de Ñuble", esCasaMatriz: false, horarioAtencion: "Lun a Vie: 09:00 - 18:00 | Sáb: 09:00 - 13:30", horarioEntrega: "Lun a Vie: 09:00 - 17:00 | Sáb: 09:00 - 13:00", whatsapp: "56958110962", telefono: "422201234", emailPostventa: "postventa.chillan@empresa.cl", urlMaps: "https://maps.google.com/?q=Av+O'Higgins+567+Chillan", activo: true, orden: 2 },
    { nombre: "Concepción", zona: "Zona Sur - Biobío", direccion: "Av. Paicaví 890, Concepción", region: "Región del Biobío", esCasaMatriz: false, horarioAtencion: "Lun a Vie: 09:00 - 18:30 | Sáb: 09:00 - 14:00", horarioEntrega: "Lun a Vie: 09:00 - 17:30 | Sáb: 09:00 - 13:00", whatsapp: "56958110962", telefono: "412201234", emailPostventa: "postventa.concepcion@empresa.cl", urlMaps: "https://maps.google.com/?q=Av+Paicaví+890+Concepcion", activo: true, orden: 3 },
  ];
  await prisma.sucursal.createMany({ data: sucursales });
  console.log("✅ Sucursales creadas");

  // Configuracion
  await prisma.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nombreEmpresa: "Revestimientos Chillán",
      logo: null,
      whatsappGlobal: "56994316620",
      facebook: "https://facebook.com/revestimientoschillan",
      instagram: "https://instagram.com/revestimientoschillan",
      tiktok: "https://tiktok.com/@revestimientoschillan",
      youtube: "https://youtube.com/@revestimientoschillan",
      emailContacto: "ventas@revestimienteschillan.cl",
      metaTitle: "Revestimientos Chillán - Materiales de Construcción",
      metaDescription: "Venta de revestimientos metálicos, WPC, pisos vinílicos SPC, deck y siding granito. Despacho a todo Chile.",
    },
  });
  console.log("✅ Configuración creada");

  // Vendedores
  const passwordHashV = await bcrypt.hash("vendedor123", 10);
  const vendedores = [
    { nombre: "Carlos Muñoz", rut: "12.345.678-9", telefono: "56994316620", email: "carlos@revestimienteschillan.cl", password: passwordHashV },
    { nombre: "María González", rut: "23.456.789-0", telefono: "56981289079", email: "maria@revestimienteschillan.cl", password: passwordHashV },
    { nombre: "Pedro Soto", rut: "34.567.890-1", telefono: "56994316620", email: "pedro@revestimienteschillan.cl", password: passwordHashV },
    { nombre: "Felipe Muñoz", rut: "45.678.901-2", telefono: "56981289079", email: "felipe@revestimientoschillan.cl", password: passwordHashV },
  ];

  for (const v of vendedores) {
    await prisma.vendedor.upsert({
      where: { rut: v.rut },
      update: {},
      create: v,
    });
  }
  console.log("✅ Vendedores creados (contraseña: vendedor123)");

  // Actualizar rendimientos y unidades de venta específicos de productos según su categoría
  console.log("⚙️ Actualizando rendimientos y unidades de venta...");
  
  // 1. Revestimientos Exteriores Metálicos (Metal Siding) -> 8.8 m2 por caja
  const catMetal = await prisma.categoria.findUnique({ where: { slug: "revestimiento-exterior-metalico" } });
  if (catMetal) {
    await prisma.producto.updateMany({
      where: { categoriaId: catMetal.id },
      data: { rendimiento: 8.8, unidadVenta: "caja" }
    });
  }

  // 2. Piso Vinílico SPC -> 2.64 m2 por caja
  const catSPC = await prisma.categoria.findUnique({ where: { slug: "pisos-spc" } });
  if (catSPC) {
    await prisma.producto.updateMany({
      where: { categoriaId: catSPC.id },
      data: { rendimiento: 2.64, unidadVenta: "caja" }
    });
  }

  // 3. Piso Flotante -> 2.3 m2 por caja
  const catFlotante = await prisma.categoria.findUnique({ where: { slug: "piso-flotante" } });
  if (catFlotante) {
    await prisma.producto.updateMany({
      where: { categoriaId: catFlotante.id },
      data: { rendimiento: 2.3, unidadVenta: "caja" }
    });
  }

  // 4. Piso Deck -> 0.3124 m2 por unidad
  const catDeck = await prisma.categoria.findUnique({ where: { slug: "pisos-deck-wpc" } });
  if (catDeck) {
    await prisma.producto.updateMany({
      where: { categoriaId: catDeck.id },
      data: { rendimiento: 0.3124, unidadVenta: "un" }
    });
  }

  // 5. Revestimientos de Interior -> 0.3333 m2 por unidad
  const catInterior = await prisma.categoria.findUnique({ where: { slug: "revestimientos-de-interior" } });
  if (catInterior) {
    await prisma.producto.updateMany({
      where: { categoriaId: catInterior.id },
      data: { rendimiento: 0.3333, unidadVenta: "un" }
    });
  }
  console.log("✅ Rendimientos y unidades de venta actualizados en todos los productos");

  console.log("🌱 ¡Datos semilla insertados correctamente!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
