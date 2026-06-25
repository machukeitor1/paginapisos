export function generarLinkWhatsApp(numero: string, mensaje: string): string {
  const numeroLimpio = numero.replace(/\D/g, "");
  return `https://api.whatsapp.com/send?phone=${numeroLimpio}&text=${encodeURIComponent(mensaje)}`;
}

export function generarMensajeCotizacion(
  items: { nombre: string; cantidad: number; unidad: string; subtotal: number }[],
  total: number,
  nombreCliente?: string,
  telefonoCliente?: string
): string {
  let mensaje = "Hola, me interesa cotizar los siguientes productos:\n\n";

  items.forEach((item) => {
    mensaje += `- ${item.nombre} x ${item.cantidad} ${item.unidad} → $${item.subtotal.toLocaleString("es-CL")}\n`;
  });

  mensaje += `\nTotal estimado: $${total.toLocaleString("es-CL")}`;

  if (nombreCliente) mensaje += `\n\nNombre: ${nombreCliente}`;
  if (telefonoCliente) mensaje += `\nTeléfono: ${telefonoCliente}`;

  mensaje += "\n\n¿Podrían contactarme?";

  return mensaje;
}
