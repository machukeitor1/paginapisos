import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const BANNER_DIR = path.join(process.cwd(), "public", "banner");

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

  // Productos desde scraped_data.json (solo si no existen productos)
  const productCount = await prisma.producto.count();
  if (productCount === 0) {
    const jsonPath = path.join(process.cwd(), "scraped_data.json");
    if (existsSync(jsonPath)) {
      console.log("📦 Importando productos desde scraped_data.json...");
      const raw = readFileSync(jsonPath, "utf-8");
      const data = JSON.parse(raw);
      let inserted = 0;

      for (const [slugCat, info] of Object.entries(data) as any[]) {
        const categoria = await prisma.categoria.findUnique({ where: { slug: slugCat } });
        if (!categoria) continue;

        for (const prod of info.productos) {
          if (!prod.sku) continue;

          const slugify = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const baseSlug = slugify(prod.nombre || `prod-${inserted}`);
          const productSlug = `${baseSlug}-${slugify(prod.sku)}`;

          const existing = await prisma.producto.findUnique({ where: { sku: prod.sku } });
          if (existing) continue;

          try {
            await prisma.producto.create({
              data: {
                nombre: prod.nombre,
                slug: productSlug,
                sku: prod.sku,
                descripcion: prod.descripcion || "",
                dimensiones: prod.dimensiones || null,
                unidad: "m2",
                precio: prod.precio_m2 || prod.precio_unitario || 0,
                marca: "",
                imagenes: "[]",
                destacado: false,
                activo: true,
                orden: 0,
                categoriaId: categoria.id,
              },
            });

            // escanear imagenes locales que coincidan con el slug
            const imgRegex = new RegExp(`^${productSlug}-\\d+\\.`);
            let imgFiles: string[];
            try { imgFiles = readdirSync(UPLOAD_DIR).filter(f => imgRegex.test(f)).sort(); } catch { imgFiles = []; }
            if (imgFiles.length > 0) {
              const paths = imgFiles.map(f => `/uploads/${f}`);
              await prisma.producto.update({
                where: { sku: prod.sku },
                data: { imagenes: JSON.stringify(paths) },
              });
            }

            inserted++;
          } catch (e: any) {
            console.log(`  [ERROR] ${prod.sku}: ${e.message}`);
          }
        }
      }
      console.log(`✅ ${inserted} productos importados desde scraped_data.json`);
    } else {
      console.log("⏭️ scraped_data.json no encontrado, no se importaron productos");
    }
  } else {
    console.log(`⏭️ ${productCount} productos ya existen, se conservan`);
  }

  // Escanear imagenes para productos que aun no tienen
  const sinImagenes = await prisma.producto.findMany({
    where: { imagenes: "[]" },
  });
  if (sinImagenes.length > 0) {
    console.log(`🖼️ Buscando imagenes para ${sinImagenes.length} productos...`);
    let actualizados = 0;
    for (const prod of sinImagenes) {
      const imgRegex = new RegExp(`^${prod.slug}-\\d+\\.`);
      let imgFiles: string[];
      try { imgFiles = readdirSync(UPLOAD_DIR).filter(f => imgRegex.test(f)).sort(); } catch { imgFiles = []; }
      if (imgFiles.length > 0) {
        const paths = imgFiles.map(f => `/uploads/${f}`);
        await prisma.producto.update({
          where: { id: prod.id },
          data: { imagenes: JSON.stringify(paths) },
        });
        actualizados++;
      }
    }
    console.log(`✅ ${actualizados} productos actualizados con imagenes`);
  } else {
    console.log("⏭️ Todos los productos ya tienen imagenes");
  }

  // Banners (solo si no existen)
  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    let bannerImg = "";
    try {
      const bannerFiles = readdirSync(BANNER_DIR).sort();
      if (bannerFiles.length > 0) bannerImg = `/banner/${bannerFiles[0]}`;
    } catch {}

    const banners = [
      { titulo: "Revestimientos de Primera Calidad", subtitulo: "Transforma tus espacios con nuestros materiales", badge: "Hasta 40% Off", imagen: bannerImg, imagenMovil: null, url: "/revestimiento-exterior-metalico", orden: 1 },
      { titulo: "Pisos que Inspiran", subtitulo: "Descubre nuestra colección de pisos vinílicos SPC", badge: "Nuevos Ingresos", imagen: bannerImg, imagenMovil: null, url: "/pisos-spc", orden: 2 },
    ];
    await prisma.banner.createMany({ data: banners });
    console.log("✅ Banners creados por defecto" + (bannerImg ? ` (imagen: ${bannerImg})` : " (sin imagen)"));
  } else {
    console.log("⏭️ Banners ya existen, se conservan");
  }

  // Sucursales (solo si no existen)
  const sucursalCount = await prisma.sucursal.count();
  if (sucursalCount === 0) {
    const sucursales = [
      { nombre: "Santiago", zona: "Zona Centro - RM", direccion: "Av. Libertador Bernardo O'Higgins 1234, Santiago Centro", region: "Región Metropolitana", esCasaMatriz: true, horarioAtencion: "Lun a Vie: 08:30 - 18:30 | Sáb: 09:00 - 14:00", horarioEntrega: "Lun a Vie: 08:30 - 17:00 | Sáb: 09:00 - 13:00", whatsapp: "56958110962", telefono: "226001234", emailPostventa: "postventa.santiago@empresa.cl", urlMaps: "https://maps.google.com/?q=Av+Libertador+Bernardo+O'Higgins+1234+Santiago", activo: true, orden: 1 },
      { nombre: "Chillán", zona: "Zona Sur - Ñuble", direccion: "Av. O'Higgins 567, Chillán Centro", region: "Región de Ñuble", esCasaMatriz: false, horarioAtencion: "Lun a Vie: 09:00 - 18:00 | Sáb: 09:00 - 13:30", horarioEntrega: "Lun a Vie: 09:00 - 17:00 | Sáb: 09:00 - 13:00", whatsapp: "56958110962", telefono: "422201234", emailPostventa: "postventa.chillan@empresa.cl", urlMaps: "https://maps.google.com/?q=Av+O'Higgins+567+Chillan", activo: true, orden: 2 },
      { nombre: "Concepción", zona: "Zona Sur - Biobío", direccion: "Av. Paicaví 890, Concepción", region: "Región del Biobío", esCasaMatriz: false, horarioAtencion: "Lun a Vie: 09:00 - 18:30 | Sáb: 09:00 - 14:00", horarioEntrega: "Lun a Vie: 09:00 - 17:30 | Sáb: 09:00 - 13:00", whatsapp: "56958110962", telefono: "412201234", emailPostventa: "postventa.concepcion@empresa.cl", urlMaps: "https://maps.google.com/?q=Av+Paicaví+890+Concepcion", activo: true, orden: 3 },
    ];
    await prisma.sucursal.createMany({ data: sucursales });
    console.log("✅ Sucursales creadas por defecto");
  } else {
    console.log("⏭️ Sucursales ya existen, se conservan");
  }

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
      urlMapa: "https://maps.app.goo.gl/AThwa7H4twEtSbfC6",
    },
  });
  console.log("✅ Configuración creada");

  // Vendedores
  const passwordHashV = await bcrypt.hash("vendedor123", 10);
  const vendedores = [
    { nombre: "Felipe Alberico", rut: "45.678.901-2", telefono: "+56 9 5811 0962", email: "felipe@revestimientoschillan.cl", password: passwordHashV },
  ];

  for (const v of vendedores) {
    await prisma.vendedor.upsert({
      where: { rut: v.rut },
      update: {},
      create: v,
    });
  }
  console.log("✅ Vendedor creado (contraseña: vendedor123)");

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
