import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const BANNER_DIR = path.join(process.cwd(), "public", "banner");

const sortNumerico = (a: string, b: string) => {
  const nA = parseInt(a.match(/-(\d+)\.\w+$/)?.[1] || "0");
  const nB = parseInt(b.match(/-(\d+)\.\w+$/)?.[1] || "0");
  return nA - nB;
};

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
            const pu = prod.precio_unitario || 0;
            const pm2 = prod.precio_m2 || 0;
            const rend = (pu > 0 && pm2 > 0 && pu !== pm2) ? Math.round((pu / pm2) * 1000) / 1000 : 1.0;
            const unidadVenta = (prod.nombre || '').toLowerCase().includes('caja') ? 'caja' : 'un';
            await prisma.producto.create({
              data: {
                nombre: prod.nombre,
                slug: productSlug,
                sku: prod.sku,
                descripcion: prod.descripcion || "",
                dimensiones: prod.dimensiones || null,
                unidad: "m2",
                precio: pm2 || pu || 0,
                marca: "",
                imagenes: "[]",
                destacado: false,
                activo: true,
                orden: 0,
                rendimiento: rend,
                precioUnitario: pu > 0 ? Math.round(pu) : Math.round(pm2 * rend),
                unidadVenta,
                categoriaId: categoria.id,
              },
            });

            // escanear imagenes locales que coincidan con el slug
            const imgRegex = new RegExp(`^${productSlug}-\\d+\\.`);
            let imgFiles: string[];
            try { imgFiles = readdirSync(UPLOAD_DIR).filter(f => imgRegex.test(f)).sort(sortNumerico); } catch { imgFiles = []; }
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

  // Escanear imagenes de todos los productos (asegura orden correcto siempre)
  const todosProductos = await prisma.producto.findMany({ select: { id: true, slug: true } });
  console.log(`🖼️ Escaneando imagenes para ${todosProductos.length} productos...`);
  let actualizados = 0;
  for (const prod of todosProductos) {
    const imgRegex = new RegExp(`^${prod.slug}-\\d+\\.`);
    let imgFiles: string[];
    try { imgFiles = readdirSync(UPLOAD_DIR).filter(f => imgRegex.test(f)).sort(sortNumerico); } catch { imgFiles = []; }
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

  // Asignar imagen a categorias desde el primer producto
  const catsSinImg = await prisma.categoria.findMany({
    where: { imagen: null },
    include: { productos: { take: 1, orderBy: { orden: "asc" } } },
  });
  let catsActualizadas = 0;
  for (const cat of catsSinImg) {
    if (cat.productos.length === 0) continue;
    const imgs = JSON.parse(cat.productos[0].imagenes || "[]");
    if (imgs.length > 0) {
      await prisma.categoria.update({
        where: { id: cat.id },
        data: { imagen: imgs[0] },
      });
      catsActualizadas++;
    }
  }
  if (catsActualizadas > 0) console.log(`✅ ${catsActualizadas} categorias actualizadas con imagen`);
  else console.log("⏭️ Categorias ya tienen imagen o no hay productos");

  // Banners (siempre actualizar)
  let bannerFiles: string[] = [];
  try { bannerFiles = readdirSync(BANNER_DIR).sort(); } catch {}

  const makeBannerImg = (idx: number) =>
    bannerFiles[idx] ? `/banner/${bannerFiles[idx]}` : (bannerFiles[0] ? `/banner/${bannerFiles[0]}` : "");

  await prisma.banner.deleteMany();
  const banners = [
    { titulo: "", subtitulo: null, badge: null, imagen: makeBannerImg(0), imagenMovil: null, url: null, orden: 1 },
    { titulo: "", subtitulo: null, badge: null, imagen: makeBannerImg(1), imagenMovil: null, url: null, orden: 2 },
  ];
  await prisma.banner.createMany({ data: banners });
  const imgInfo = bannerFiles.length > 0 ? `(img1: ${makeBannerImg(0)}, img2: ${makeBannerImg(1)})` : "(sin imagen)";
  console.log(`✅ Banners actualizados ${imgInfo}`);

  // Sucursales (solo si no existen)
  const sucursalCount = await prisma.sucursal.count();
  if (sucursalCount === 0) {
    const sucursales = [
      { nombre: "Chillán", zona: "Zona Sur - Ñuble", direccion: "Alcántara 1080, Villa Barcelona, Chillán", region: "Región de Ñuble", esCasaMatriz: true, horarioAtencion: "Lun a Vie: 09:00 - 18:00 | Sáb: 09:00 - 13:30", horarioEntrega: "Lun a Vie: 09:00 - 17:00 | Sáb: 09:00 - 13:00", whatsapp: "56994316620", telefono: "422201234", emailPostventa: "postventa@revestimienteschillan.cl", urlMaps: "https://maps.google.com/?q=Alcantara+1080+Villa+Barcelona+Chillan", activo: true, orden: 1 },
    ];
    await prisma.sucursal.createMany({ data: sucursales });
    console.log("✅ Sucursales creadas por defecto");
  } else {
    console.log("⏭️ Sucursales ya existen, se conservan");
  }

  // Configuracion
  await prisma.configuracion.upsert({
    where: { id: 1 },
    update: {
      nombreEmpresa: "Revestimientos Chillán",
      whatsappGlobal: "56994316620",
      metaTitle: "Revestimientos Chillán - Materiales de Construcción",
      metaDescription: "Venta de revestimientos y pisos de primera calidad.",
    },
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
      metaDescription: "Venta de revestimientos y pisos de primera calidad.",
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
