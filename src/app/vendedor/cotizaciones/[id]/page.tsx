'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatUnidad } from '@/lib/format-unidad';

const TZ_CHILE = 'America/Santiago';

// YYYY-MM-DD en hora de Chile, para el selector de fecha de venta.
const ymdChile = (fecha: string | Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ_CHILE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(fecha));

interface CotizacionData {
  id: number;
  numero: string;
  createdAt: string;
  vencimiento: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: string;
  fechaVenta: string | null;
  notas: string | null;
  cliente: { nombre: string; rut: string | null; direccion: string | null; comuna: string | null; telefono: string | null };
  vendedor: { id: number; nombre: string };
  eventos?: Array<{
    id: number;
    estadoAnterior: string | null;
    estadoNuevo: string;
    motivo: string | null;
    usuarioTipo: string;
    usuarioNombre: string;
    createdAt: string;
  }>;
  items: Array<{
    id: number;
    descripcion: string;
    cantidad: number;
    rendimiento: number;
    unidadVenta: string;
    precioUnitario: number;
    descuentoPorc: number;
    importe: number;
    proyectoM2: number | null;
    modo: string;
  }>;
}

const ESTILOS_ESTADO: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  VENDIDO: 'bg-green-100 text-green-800',
  PERDIDO: 'bg-red-100 text-red-800',
};

export default function CotizacionDetailPage() {
  const params = useParams();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [cot, setCot] = useState<CotizacionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [estadoError, setEstadoError] = useState('');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [motivoModal, setMotivoModal] = useState(false);
  const [motivoReapertura, setMotivoReapertura] = useState('');
  const [fechaModal, setFechaModal] = useState<'vender' | 'editar' | null>(null);
  const [fechaVentaInput, setFechaVentaInput] = useState('');

  const cargar = useCallback(() => {
    fetch(`/api/cotizaciones/${params.id}`)
      .then((r) => r.json())
      .then((data) => setCot(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    fetch('/Logo.png')
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onload = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }, []);

  const cambiarEstado = async (
    estado: string,
    opciones?: { motivo?: string; confirmarFaltante?: boolean; fechaVenta?: string }
  ) => {
    setUpdating(true);
    setEstadoError('');
    try {
      const res = await fetch(`/api/cotizaciones/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, ...opciones }),
      });
      const data = await res.json();

      if (res.ok) {
        setMotivoModal(false);
        setMotivoReapertura('');
        setFechaModal(null);
        cargar();
        return;
      }

      if (res.status === 409 && data?.faltantes?.length) {
        const detalle = data.faltantes
          .map(
            (f: any) =>
              `${f.sku}: requiere ${f.requerido}, hay ${f.disponible} (faltan ${f.faltante})`
          )
          .join('\n');
        if (window.confirm(`Stock insuficiente:\n\n${detalle}\n\n¿Registrar la venta con faltante?`)) {
          await cambiarEstado(estado, { ...opciones, confirmarFaltante: true });
          return;
        }
        setEstadoError('Venta cancelada: no hay stock suficiente.');
        return;
      }

      setEstadoError(data.error || 'Error al cambiar el estado');
    } catch {
      setEstadoError('Error de conexión');
    } finally {
      setUpdating(false);
    }
  };

  const ETIQUETA_ESTADO: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    VENDIDO: 'Vendido',
    PERDIDO: 'Perdido',
  };

  const abrirFechaModal = (modo: 'vender' | 'editar') => {
    setEstadoError('');
    setFechaVentaInput(modo === 'editar' && cot?.fechaVenta ? ymdChile(cot.fechaVenta) : ymdChile(new Date()));
    setFechaModal(modo);
  };

  const guardarFechaVenta = async () => {
    if (!fechaVentaInput) {
      setEstadoError('Indica la fecha de venta');
      return;
    }
    if (fechaModal === 'vender') {
      await cambiarEstado('VENDIDO', { fechaVenta: fechaVentaInput });
      return;
    }
    setUpdating(true);
    setEstadoError('');
    try {
      const res = await fetch(`/api/cotizaciones/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fechaVenta: fechaVentaInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setFechaModal(null);
        cargar();
      } else {
        setEstadoError(data.error || 'Error al cambiar la fecha de venta');
      }
    } catch {
      setEstadoError('Error de conexión');
    } finally {
      setUpdating(false);
    }
  };

  const confirmarReapertura = () => {
    if (motivoReapertura.trim().length < 3) {
      setEstadoError('Debes indicar el motivo de la reapertura (mínimo 3 caracteres)');
      return;
    }
    setEstadoError('');
    cambiarEstado('PENDIENTE', { motivo: motivoReapertura.trim() });
  };

  const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

  const generatePDF = async () => {
    if (!cot) return;
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const ML = 20, MR = 20, MT = 20, MB = 15;
      const PW = 210, UW = PW - ML - MR;
      const colW = [70, 20, 26, 14, 28];

      let y = MT + 5;
      const sec = (h: number) => { y += h; return y; };
      const val = (s: string | null) => s || '-';
      const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

      let page = 1, maxPages = 1;
      const chk = (h: number) => {
        if (y + h > 297 - MB - 18) {
          doc.addPage(); page++; y = MT + 5; maxPages = page;
        }
      };

      const drawFooter = () => {
        const fy = 297 - MB - 2;
        doc.setDrawColor(200); doc.setLineWidth(0.3);
        doc.line(ML, fy, PW - MR, fy);
        doc.setFont('Helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(120);
        let ly = fy + 4;
        if (cot.notas) {
          const nl = doc.splitTextToSize(`Notas: ${cot.notas}`, UW);
          nl.forEach((l: string) => { doc.text(l, ML, ly); ly += 3.5; });
          ly += 1;
        }
        doc.text('* Cotización válida por 3 días desde su emisión', ML, ly); ly += 4;
        doc.setFont('Helvetica', 'bold'); doc.setTextColor(80);
        doc.text('Visítanos en www.revestimientoschillan.cl', PW / 2, ly, { align: 'center' });
      };

      const fecha = new Date(cot.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
      const vence = new Date(cot.vencimiento).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

      // ── Header ──
      const logoW = 26;
      const textCX = PW / 2;
      if (logoBase64) {
        try { doc.addImage(logoBase64, 'PNG', ML, MT - 4, logoW, logoW); } catch (e) { console.warn('Logo omitido:', e); }
      }
      doc.setFont('Helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(0);
      doc.text('REVESTIMIENTOS CHILLÁN', textCX, y, { align: 'center' }); y = sec(6);
      doc.setFont('Helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
      doc.text('Alcántara 1080-A, Villa Barcelona, Chillán', textCX, y, { align: 'center' }); y = sec(4);
      doc.text('+56 9 58603702', textCX, y, { align: 'center' }); y = sec(6);
      doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(ML, y, PW - MR, y); y = sec(8);
      doc.setFont('Helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(0);
      doc.text(`COTIZACIÓN ${cot.numero}`, PW / 2, y, { align: 'center' }); y = sec(8);
      doc.setDrawColor(200); doc.setLineWidth(0.3); doc.line(ML, y, PW - MR, y); y = sec(6);

      // ── Client Info (2 cols) ──
      doc.setFont('Helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0);
      const left = [
        ['Cliente:', cot.cliente.nombre], ['RUT:', val(cot.cliente.rut)],
        ['Dirección:', val(cot.cliente.direccion) + (cot.cliente.comuna ? `, ${cot.cliente.comuna}` : '')],
        ['Teléfono:', val(cot.cliente.telefono)],
      ];
      const right = [['Vendedor:', cot.vendedor.nombre], ['Emisión:', fecha], ['Válida hasta:', vence]];

      const maxRows = Math.max(left.length, right.length);
      const half = UW / 2;
      for (let i = 0; i < maxRows; i++) {
        if (i < left.length) {
          const [l, v] = left[i];
          doc.setFont('Helvetica', 'bold'); const lw = doc.getTextWidth(l + ' ');
          doc.text(l, ML, y); doc.setFont('Helvetica', 'normal'); doc.text(v, ML + lw, y);
        }
        if (i < right.length) {
          const [l, v] = right[i];
          doc.setFont('Helvetica', 'bold'); const lw = doc.getTextWidth(l + ' ');
          doc.text(l, ML + half, y); doc.setFont('Helvetica', 'normal'); doc.text(v, ML + half + lw, y);
        }
        y = sec(5);
      }
      y = sec(4);

      // ── Draw footer on page 1 (will be overwritten if more pages) ──
      drawFooter();

      // ── Table Header ──
      chk(16);
      doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(ML, y, PW - MR, y); y = sec(3);
      doc.setFont('Helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0);
      const hdrs = ['Descripción', 'Cant.', 'P. Unitario', 'Desc %', 'Importe'];
      let hx = ML;
      hdrs.forEach((h, i) => {
        const a = i === 0 ? 'left' : i === hdrs.length - 1 ? 'right' : 'center';
        const ox = a === 'right' ? colW[i] : a === 'center' ? colW[i] / 2 : 0;
        doc.text(h, hx + ox, y, { align: a }); hx += colW[i];
      });
      y = sec(5); doc.setLineWidth(0.3); doc.line(ML, y, PW - MR, y); y = sec(3);

      // ── Table Rows ──
      doc.setFont('Helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(0);
      cot.items.forEach((item, idx) => {
        const descLines = doc.splitTextToSize(item.descripcion, colW[0] - 2);
        const rh = Math.max(descLines.length, 1) * 4 + 3;
        chk(rh + 2);

        if (idx % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(ML, y - 2, UW, rh, 'F'); }

        let cx = ML;
        doc.setTextColor(0);
        descLines.forEach((l: string, li: number) => doc.text(l, cx + 1, y + 1 + li * 4)); cx += colW[0];
        doc.setTextColor(0);
        doc.text(formatUnidad(item.cantidad, item.unidadVenta), cx + colW[1] / 2, y + 1, { align: 'center' }); cx += colW[1];
        doc.text(fmt(Math.round(item.precioUnitario)), cx + colW[2] / 2, y + 1, { align: 'center' }); cx += colW[2];
        doc.setTextColor(0);
        doc.text(item.descuentoPorc > 0 ? `${item.descuentoPorc}%` : '-', cx + colW[3] / 2, y + 1, { align: 'center' }); cx += colW[3];
        doc.setTextColor(0); doc.setFont('Helvetica', 'bold');
        doc.text(fmt(item.importe), cx + colW[4] - 1, y + 1, { align: 'right' });
        doc.setFont('Helvetica', 'normal');
        y += rh + 1;
      });

      // ── Table bottom line ──
      y = sec(3); doc.setDrawColor(0); doc.setLineWidth(0.3); doc.line(ML, y, PW - MR, y); y = sec(6);

      // ── Totals ──
      chk(25);
      const tw = 60, tx = PW - MR - tw;
      const ivaVal = cot.subtotal - Math.round(cot.subtotal / 1.19);
      doc.setFont('Helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0);
      doc.text('Subtotal:', tx, y); doc.text(fmt(Math.round(cot.subtotal / 1.19)), tx + tw, y, { align: 'right' }); y = sec(5);
      doc.text('IVA 19%:', tx, y); doc.text(fmt(ivaVal), tx + tw, y, { align: 'right' }); y = sec(5);
      doc.setDrawColor(0); doc.setLineWidth(0.5); doc.line(tx, y, PW - MR, y); y = sec(4);
      doc.setFont('Helvetica', 'bold'); doc.setFontSize(12);
      doc.text('TOTAL:', tx, y); doc.text(fmt(cot.subtotal), tx + tw, y, { align: 'right' });

      // ── Redraw footer on last page (in case content pushed it) ──
      // We already drew it on page 1, need to redraw if multi-page
      if (maxPages > 1) drawFooter();

      doc.save(`Cotizacion_${cot.numero}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" /></div>;
  }

  if (!cot) {
    return <div className="p-6 max-w-5xl mx-auto"><p className="text-gray-500 text-sm">Cotización no encontrada</p><Link href="/vendedor/cotizaciones" className="text-blue-600 text-sm mt-2 inline-block">Volver a mis cotizaciones</Link></div>;
  }

  const fecha = new Date(cot.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  const vence = new Date(cot.vencimiento).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Link href="/vendedor/cotizaciones" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Volver
        </Link>
        <div className="flex items-center gap-2">
          {/* Estado badge + buttons */}
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${ESTILOS_ESTADO[cot.estado] || 'bg-gray-100 text-gray-600'}`}>{cot.estado}</span>
          {cot.estado === 'PENDIENTE' && (
            <>
              <button onClick={() => abrirFechaModal('vender')} disabled={updating} className="text-xs bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1.5 rounded-lg transition-colors">
                Marcar Vendido
              </button>
              <button onClick={() => cambiarEstado('PERDIDO')} disabled={updating} className="text-xs bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-1.5 rounded-lg transition-colors">
                Marcar Perdido
              </button>
              <Link href={`/vendedor/cotizaciones/${cot.id}/editar`} className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                Editar
              </Link>
            </>
          )}
          {cot.estado !== 'PENDIENTE' && (
            <button onClick={() => { setMotivoModal(true); setMotivoReapertura(''); setEstadoError(''); }} disabled={updating} className="text-xs bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded-lg transition-colors">
              Reabrir
            </button>
          )}
          <button onClick={generatePDF} disabled={generating} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {generating ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {estadoError && !fechaModal && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{estadoError}</div>}

      {cot.estado === 'VENDIDO' && cot.fechaVenta && (
        <div className="flex items-center justify-end gap-2 mb-4 text-sm text-gray-600">
          <span>
            Vendida el{' '}
            <span className="font-medium text-gray-800">
              {new Date(cot.fechaVenta).toLocaleDateString('es-CL', { timeZone: TZ_CHILE, year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </span>
          <button onClick={() => abrirFechaModal('editar')} disabled={updating} className="text-xs text-blue-600 hover:text-blue-800 underline">
            Cambiar fecha de venta
          </button>
        </div>
      )}

      {/* Quote document for PDF capture */}
      <div ref={pdfRef} className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-10" style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-xl font-bold text-gray-800 tracking-wide">REVESTIMIENTOS CHILLÁN</h1>
          <p className="text-xs text-gray-500 mt-1">Alcántara 1080-A, Villa Barcelona, Chillán</p>
          <p className="text-xs text-gray-500">+56 9 58603702</p>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-gray-800">COTIZACIÓN {cot.numero}</h2>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-6">
          <div><span className="text-gray-500">Cliente:</span> <span className="font-medium text-gray-800">{cot.cliente.nombre}</span></div>
          <div><span className="text-gray-500">RUT:</span> <span className="text-gray-800">{cot.cliente.rut || '-'}</span></div>
          <div><span className="text-gray-500">Dirección:</span> <span className="text-gray-800">{cot.cliente.direccion || '-'}{cot.cliente.comuna ? `, ${cot.cliente.comuna}` : ''}</span></div>
          <div><span className="text-gray-500">Teléfono:</span> <span className="text-gray-800">{cot.cliente.telefono || '-'}</span></div>
          <div><span className="text-gray-500">Vendedor:</span> <span className="text-gray-800">{cot.vendedor.nombre}</span></div>
          <div><span className="text-gray-500">Válida hasta:</span> <span className="text-gray-800">{vence}</span></div>
          <div><span className="text-gray-500">Emisión:</span> <span className="text-gray-800">{fecha}</span></div>
        </div>

        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="text-left py-2 text-xs text-gray-500 uppercase font-semibold">Descripción</th>
              <th className="text-center py-2 text-xs text-gray-500 uppercase font-semibold w-24">Cant.</th>
              <th className="text-center py-2 text-xs text-gray-500 uppercase font-semibold w-28">P. Unitario</th>
              <th className="text-center py-2 text-xs text-gray-500 uppercase font-semibold w-16">Desc %</th>
              <th className="text-right py-2 text-xs text-gray-500 uppercase font-semibold w-28">Importe</th>
            </tr>
          </thead>
          <tbody>
            {cot.items.map((item) => {
              return (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="py-2.5 text-gray-800">{item.descripcion}</td>
                <td className="py-2.5 text-center text-gray-800">{formatUnidad(item.cantidad, item.unidadVenta)}</td>
                <td className="py-2.5 text-center text-gray-800">{formatCLP(Math.round(item.precioUnitario))}</td>
                <td className="py-2.5 text-center text-gray-800">{item.descuentoPorc > 0 ? `${item.descuentoPorc}%` : '-'}</td>
                <td className="py-2.5 text-right font-medium text-gray-800">{formatCLP(item.importe)}</td>
              </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600 py-1"><span>Subtotal:</span><span>{formatCLP(Math.round(cot.subtotal / 1.19))}</span></div>
            <div className="flex justify-between text-gray-600 py-1"><span>IVA 19%:</span><span>{formatCLP(cot.subtotal - Math.round(cot.subtotal / 1.19))}</span></div>
            <div className="flex justify-between text-base font-bold text-gray-800 border-t-2 border-gray-800 pt-1 mt-1"><span>TOTAL:</span><span>{formatCLP(cot.subtotal)}</span></div>
          </div>
        </div>

        {cot.notas && (
          <div className="text-sm text-gray-600 mb-4">
            <span className="font-medium text-gray-700">Notas:</span>
            <p className="mt-0.5">{cot.notas}</p>
          </div>
        )}

        <div className="border-t border-gray-300 pt-4 text-xs text-gray-500 text-center space-y-0.5">
          <p>* Cotización válida por 3 días desde su emisión</p>
          <p className="mt-2 font-medium text-gray-500">Visítanos en www.revestimientoschillan.cl</p>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Historial de estados</h2>
        {cot.eventos && cot.eventos.length > 0 ? (
          <ol className="relative border-l border-gray-200 ml-2 space-y-4">
            {cot.eventos.map((evento) => (
              <li key={evento.id} className="ml-5">
                <span className="absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-gray-800">
                    {evento.estadoAnterior ? ETIQUETA_ESTADO[evento.estadoAnterior] || evento.estadoAnterior : 'Inicio'}
                    {' → '}
                    {ETIQUETA_ESTADO[evento.estadoNuevo] || evento.estadoNuevo}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(evento.createdAt).toLocaleString('es-CL')}
                  </span>
                  <span className="text-xs text-gray-500">
                    · {evento.usuarioNombre} ({evento.usuarioTipo})
                  </span>
                </div>
                {evento.motivo && (
                  <p className="text-xs text-gray-600 mt-1">Motivo: {evento.motivo}</p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-gray-500">Sin cambios de estado registrados.</p>
        )}
      </div>

      {fechaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-primary mb-1">
              {fechaModal === 'vender' ? 'Marcar como vendida' : 'Cambiar fecha de venta'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              La venta de {cot.numero} se contabilizará en el mes de esta fecha.
            </p>
            {estadoError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{estadoError}</div>
            )}
            <p className="text-xs text-gray-500 mb-1">Fecha de venta</p>
            <input
              type="date"
              value={fechaVentaInput}
              min={ymdChile(cot.createdAt)}
              max={ymdChile(new Date())}
              onChange={(e) => setFechaVentaInput(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
            />
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setFechaModal(null); setEstadoError(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={guardarFechaVenta}
                disabled={updating || !fechaVentaInput}
                className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-lg font-medium"
              >
                {updating ? 'Guardando…' : fechaModal === 'vender' ? 'Marcar vendida' : 'Guardar fecha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {motivoModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-primary mb-1">Reabrir cotización</h2>
            <p className="text-sm text-gray-500 mb-4">
              La cotización {cot.numero} volverá a estado PENDIENTE. Indica el motivo (obligatorio).
            </p>
            <textarea
              value={motivoReapertura}
              onChange={(e) => setMotivoReapertura(e.target.value)}
              rows={3}
              placeholder="Ej: el cliente confirmó la compra / se corrigió el estado por error"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setMotivoModal(false); setMotivoReapertura(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarReapertura}
                disabled={updating || motivoReapertura.trim().length < 3}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium"
              >
                {updating ? 'Reabriendo…' : 'Reabrir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
