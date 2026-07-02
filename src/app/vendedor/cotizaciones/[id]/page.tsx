'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CotizacionData {
  id: number;
  numero: string;
  createdAt: string;
  vencimiento: string;
  subtotal: number;
  iva: number;
  total: number;
  notas: string | null;
  estado: string;
  cliente: { nombre: string; rut: string; direccion: string | null; comuna: string | null; telefono: string | null };
  vendedor: { id: number; nombre: string };
  items: Array<{
    id: number;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuentoPorc: number;
    importe: number;
    proyectoM2: number | null;
  }>;
}

export default function CotizacionDetailPage() {
  const params = useParams();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [cot, setCot] = useState<CotizacionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updatingEstado, setUpdatingEstado] = useState(false);

  useEffect(() => {
    fetch(`/api/cotizaciones/${params.id}`)
      .then((r) => r.json())
      .then((data) => setCot(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

  const marcarVendida = async () => {
    setUpdatingEstado(true);
    try {
      const res = await fetch(`/api/cotizaciones/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Vendida' }),
      });
      if (res.ok) {
        setCot((prev) => prev ? { ...prev, estado: 'Vendida' } : null);
      }
    } catch {}
    setUpdatingEstado(false);
  };

  const generatePDF = async () => {
    if (!pdfRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      let heightLeft = pdfH;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfW, pdfH);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - pdfH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfW, pdfH);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save(`Cotizacion_${cot?.numero || params.id}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!cot) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-gray-500 text-sm">Cotización no encontrada</p>
        <Link href="/vendedor/cotizaciones" className="text-blue-600 text-sm mt-2 inline-block">Volver a mis cotizaciones</Link>
      </div>
    );
  }

  const fecha = new Date(cot.createdAt).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  const vence = new Date(cot.vencimiento).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  const badgeClass = cot.estado === 'Vendida'
    ? 'bg-green-100 text-green-700 border-green-200'
    : 'bg-yellow-100 text-yellow-700 border-yellow-200';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link href="/vendedor/cotizaciones" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Volver
        </Link>
        <div className="flex items-center gap-2">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
            {cot.estado || 'Pendiente'}
          </span>
          {cot.estado !== 'Vendida' && (
            <button
              onClick={marcarVendida}
              disabled={updatingEstado}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {updatingEstado ? '...' : 'Marcar como Vendida'}
            </button>
          )}
          <button
            onClick={generatePDF}
            disabled={generating}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {generating ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>

      {/* Quote document for PDF capture — Letter sized, flexbox pushes footer to bottom */}
      <div
        ref={pdfRef}
        className="bg-white rounded-xl shadow-sm border border-gray-200 mx-auto flex flex-col"
        style={{ width: '800px', minHeight: '1035px', fontFamily: 'Inter, Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6 px-10 pt-10">
          <h1 className="text-xl font-bold text-gray-800 tracking-wide">REVESTIMIENTOS CHILLÁN</h1>
          <p className="text-xs text-gray-500 mt-1">Alcántara 1080, Villa Barcelona, Chillán</p>
          <p className="text-xs text-gray-500">+56 9 9431 6620 | +56 9 8128 9079</p>
        </div>

        {/* Content area — grows to push footer down */}
        <div className="flex-grow px-10">
          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">COTIZACIÓN {cot.numero}</h2>
          </div>

          {/* Info rows */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-6">
            <div><span className="text-gray-500">Cliente:</span> <span className="font-medium text-gray-800">{cot.cliente.nombre}</span></div>
            <div><span className="text-gray-500">RUT:</span> <span className="text-gray-800">{cot.cliente.rut}</span></div>
            <div><span className="text-gray-500">Dirección:</span> <span className="text-gray-800">{cot.cliente.direccion || '-'}{cot.cliente.comuna ? `, ${cot.cliente.comuna}` : ''}</span></div>
            <div><span className="text-gray-500">Teléfono:</span> <span className="text-gray-800">{cot.cliente.telefono || '-'}</span></div>
            <div><span className="text-gray-500">Vendedor:</span> <span className="text-gray-800">{cot.vendedor.nombre}</span></div>
            <div><span className="text-gray-500">Válida hasta:</span> <span className="text-gray-800">{vence}</span></div>
            <div><span className="text-gray-500">Emisión:</span> <span className="text-gray-800">{fecha}</span></div>
          </div>

          {/* Products table */}
          <table className="w-full text-sm border-collapse mb-4">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left py-2 text-xs text-gray-500 uppercase font-semibold w-10">#</th>
                <th className="text-left py-2 text-xs text-gray-500 uppercase font-semibold">Descripción</th>
                <th className="text-center py-2 text-xs text-gray-500 uppercase font-semibold w-24">Cant</th>
                <th className="text-right py-2 text-xs text-gray-500 uppercase font-semibold w-28">P. Unitario</th>
                <th className="text-center py-2 text-xs text-gray-500 uppercase font-semibold w-16">Desc %</th>
                <th className="text-right py-2 text-xs text-gray-500 uppercase font-semibold w-28">Importe</th>
              </tr>
            </thead>
            <tbody>
              {cot.items.map((item, idx) => {
                return (
                  <tr key={item.id} className="border-b border-gray-200">
                    <td className="py-2.5 text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 text-gray-800">
                      <div>{item.descripcion}</div>
                      {item.proyectoM2 && (
                        <div className="text-xs text-gray-400 mt-0.5">Proyecto: {Math.round(item.proyectoM2)} m²</div>
                      )}
                    </td>
                    <td className="py-2.5 text-center text-gray-800">{item.cantidad}</td>
                    <td className="py-2.5 text-right text-gray-800">{formatCLP(item.precioUnitario)}</td>
                    <td className="py-2.5 text-center text-gray-800">{item.descuentoPorc > 0 ? `${item.descuentoPorc}%` : '-'}</td>
                    <td className="py-2.5 text-right font-medium text-gray-800">{formatCLP(item.importe)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600 py-1">
                <span>Subtotal:</span>
                <span>{formatCLP(cot.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 py-1">
                <span>IVA 19%:</span>
                <span>{formatCLP(cot.iva)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-800 border-t-2 border-gray-800 pt-1 mt-1">
                <span>TOTAL:</span>
                <span>{formatCLP(cot.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {cot.notas && (
            <div className="text-sm text-gray-600 mb-4">
              <span className="font-medium text-gray-700">Notas:</span>
              <p className="mt-0.5">{cot.notas}</p>
            </div>
          )}
        </div>

        {/* Footer — always at bottom */}
        <div className="border-t border-gray-300 pt-4 pb-10 px-10 text-xs text-gray-400 text-center space-y-0.5">
          <p>* Cotización válida por 3 días desde su emisión</p>
          <p className="mt-2 font-medium text-gray-500">Alcántara 1080, Villa Barcelona, Chillán | +56 9 9431 6620 | +56 9 8128 9079</p>
        </div>
      </div>
    </div>
  );
}
