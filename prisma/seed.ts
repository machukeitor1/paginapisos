import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "fs";
import path from "path";

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

  // Productos desde scraped_data.json (siempre corre, salta los que ya existen)
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

  // Sobrescribir rendimiento/precioUnitario/unidadVenta con valores exactos desde productos_overrides.json
  const overridesPath = path.join(process.cwd(), "productos_overrides.json");
  if (existsSync(overridesPath)) {
    const raw = readFileSync(overridesPath, "utf-8");
    const overrides = JSON.parse(raw) as Record<string, { rendimiento: number; precioUnitario: number; unidadVenta: string }>;
    let actualizados = 0;
    for (const [sku, ov] of Object.entries(overrides)) {
      const res = await prisma.producto.updateMany({
        where: { sku },
        data: { rendimiento: ov.rendimiento, precioUnitario: ov.precioUnitario, unidadVenta: ov.unidadVenta },
      });
      if (res.count > 0) actualizados++;
    }
    console.log(`✅ ${actualizados} productos actualizados con rendimiento/precioUnitario/unidadVenta desde productos_overrides.json`);
  }

  // Corregir categoria de productos mal ubicados (ej: REG001 creados bajo Metal Siding por duplicados historicos)
  if (existsSync(jsonPath)) {
    const raw = readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(raw);
    let corregidos = 0;
    for (const [slugCat, info] of Object.entries(data) as any[]) {
      const cat = await prisma.categoria.findUnique({ where: { slug: slugCat } });
      if (!cat) continue;
      for (const prod of info.productos) {
        if (!prod.sku) continue;
        const res = await prisma.producto.updateMany({
          where: { sku: prod.sku, NOT: { categoriaId: cat.id } },
          data: { categoriaId: cat.id },
        });
        if (res.count > 0) corregidos++;
      }
    }
    if (corregidos > 0) console.log(`✅ ${corregidos} productos movidos a su categoria correcta`);
  }

  // Escanear imagenes de todos los productos (solo si hay locales, skip si ya estan en cloudinary)
  const todosProductos = await prisma.producto.findMany({ select: { id: true, slug: true, imagenes: true } });
  let actualizados = 0;
  for (const prod of todosProductos) {
    const imgs = JSON.parse(prod.imagenes || "[]");
    if (imgs.length > 0 && imgs[0].startsWith("/uploads/")) {
      console.log(`  Producto ${prod.slug} tiene imagenes locales pendientes de migrar. Ejecuta scripts/migrate-cloudinary.ts`);
    }
  }

  // Asignar imagen a categorias desde el primer producto (usa Cloudinary si existe)
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
  if (catsActualizadas > 0) console.log(`✅ ${catsActualizadas} categorias actualizadas con imagen desde productos`);

  // Banners (conservar existentes, solo crear si no hay)
  const bannerCount = await prisma.banner.count();
  if (bannerCount === 0) {
    const banners = [
      { titulo: "", subtitulo: null, badge: null, imagen: "", imagenMovil: null, url: null, orden: 1 },
      { titulo: "", subtitulo: null, badge: null, imagen: "", imagenMovil: null, url: null, orden: 2 },
    ];
    await prisma.banner.createMany({ data: banners });
    console.log("Banners creados vacíos (sube imágenes desde el admin)");
  } else {
    console.log("Banners ya existen, se conservan");
  }

  // Sucursales (solo si no existen)
  const sucursalCount = await prisma.sucursal.count();
  if (sucursalCount === 0) {
    const sucursales = [
      { nombre: "Chillán", zona: "Zona Sur - Ñuble", direccion: "Alcántara 1080-A, Villa Barcelona, Chillán", region: "Región de Ñuble", esCasaMatriz: true, horarioAtencion: "Lun a Vie: 09:00 - 18:00 | Sáb: 09:00 - 13:30", horarioEntrega: "Lun a Vie: 09:00 - 17:00 | Sáb: 09:00 - 13:00", whatsapp: "56994316620", telefono: "422201234", emailPostventa: "postventa@revestimienteschillan.cl", urlMaps: "https://maps.google.com/?q=Alcantara+1080+Villa+Barcelona+Chillan", activo: true, orden: 1 },
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
      whatsappGlobal: "56958603702",
      metaTitle: "Revestimientos Chillán - Materiales de Construcción",
      metaDescription: "Venta de revestimientos y pisos de primera calidad.",
    },
    create: {
      id: 1,
      nombreEmpresa: "Revestimientos Chillán",
      logo: null,
      whatsappGlobal: "56958603702",
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
