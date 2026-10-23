'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

interface ProductoOpcion {
  id: number;
  sku: string;
  nombre: string;
  unidadVenta: string;
  stock: number;
  activo: boolean;
}

interface FilaPreview {
  fila: number;
  skuOriginal: string;
  nombreExcel: string | null;
  cantidad: number | null;
  estado: 'ok' | 'ambiguo' | 'no_encontrado' | 'duplicado' | 'invalido';
  productoId: number | null;
  productoSku: string | null;
  productoNombre: string | null;
  stockActual: number | null;
  candidatos: ProductoOpcion[];
}

interface Resumen {
  total: number;
  ok: number;
  ambiguos: number;
  noEncontrados: number;
  duplicados: number;
  invalidos: number;
  conStockNegativo: number;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

const ESTADO_STYLE: Record<string, string> = {
  ok: 'bg-green-100 text-green-700',
  ambiguo: 'bg-orange-100 text-orange-700',
  no_encontrado: 'bg-red-100 text-red-700',
  duplicado: 'bg-red-100 text-red-700',
  invalido: 'bg-gray-200 text-gray-700',
};

const ESTADO_LABEL: Record<string, string> = {
  ok: 'OK',
  ambiguo: 'Revisar',
  no_encontrado: 'No encontrado',
  duplicado: 'Duplicado',
  invalido: 'Cantidad inválida',
};

export default function ModalImportarStock({ onClose, onSaved }: Props) {
  const [archivo, setArchivo] = useState('');
  const [hoja, setHoja] = useState('');
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [filas, setFilas] = useState<FilaPreview[]>([]);
  const [productos, setProductos] = useState<ProductoOpcion[]>([]);
  const [mapeo, setMapeo] = useState<Record<number, number | null>>({});
  const [omitidas, setOmitidas] = useState<Set<number>>(new Set());
  const [yaImportado, setYaImportado] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const leerArchivo = async (file: File) => {
    setError('');
    setProcesando(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const nombreHoja = wb.SheetNames.includes('Octubre')
        ? 'Octubre'
        : wb.SheetNames[wb.SheetNames.length - 1];
      const ws = wb.Sheets[nombreHoja];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

      const normalizar = (v: unknown) =>
        String(v ?? '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toLowerCase();

      const headerIdx = rows.findIndex((r) => r.some((c) => normalizar(c) === 'sku'));
      if (headerIdx < 0) throw new Error('No se encontró la columna SKU en la hoja');
      const header = rows[headerIdx];
      let saldoIdx = header.findIndex((c) => normalizar(c) === 'saldo');
      if (saldoIdx < 0) saldoIdx = header.length - 1;
      const nombreIdx = header.findIndex((c) => normalizar(c).includes('producto'));

      const filasExcel: { fila: number; sku: string; nombre: string; cantidad: number | string }[] = [];
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i] || [];
        const sku = String(row[0] ?? '').trim();
        if (!sku) continue;
        const nombre = nombreIdx >= 0 ? String(row[nombreIdx] ?? '').trim() : '';
        const valor = row[saldoIdx];
        filasExcel.push({
          fila: i + 1,
          sku,
          nombre,
          cantidad: valor === null || valor === '' ? 0 : (typeof valor === 'number' ? valor : String(valor)),
        });
      }

      if (filasExcel.length === 0) throw new Error('La hoja no tiene filas con SKU');

      const res = await fetch('/api/stock/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'preview', filas: filasExcel, archivo: file.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar el archivo');

      const mapa: Record<number, number | null> = {};
      for (const fila of data.filas as FilaPreview[]) {
        mapa[fila.fila] = fila.productoId;
      }

      setArchivo(file.name);
      setHoja(nombreHoja);
      setResumen(data.resumen);
      setFilas(data.filas);
      setProductos(data.productos || []);
      setMapeo(mapa);
      setOmitidas(new Set());
      setYaImportado(Boolean(data.yaImportado));
    } catch (err: any) {
      setError(err?.message || 'No se pudo leer el archivo');
      setFilas([]);
      setResumen(null);
    } finally {
      setProcesando(false);
    }
  };

  const activas = filas.filter((f) => !omitidas.has(f.fila));

  const conteoMapeo = useMemo(() => {
    const cuenta = new Map<number, number>();
    for (const fila of activas) {
      const id = mapeo[fila.fila];
      if (id) cuenta.set(id, (cuenta.get(id) || 0) + 1);
    }
    return cuenta;
  }, [activas, mapeo]);

  const sinMapear = activas.filter((f) => !mapeo[f.fila]).length;
  const duplicadosMapeo = activas.filter((f) => {
    const id = mapeo[f.fila];
    return id ? (conteoMapeo.get(id) || 0) > 1 : false;
  }).length;
  const cantidadesInvalidas = activas.filter((f) => f.cantidad === null).length;
  const bloqueado =
    activas.length === 0 || yaImportado || sinMapear > 0 || duplicadosMapeo > 0 || cantidadesInvalidas > 0;

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(
      (p) => p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  const confirmar = async () => {
    if (bloqueado) return;
    setError('');
    setGuardando(true);
    try {
      const res = await fetch('/api/stock/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'confirmar',
          archivo,
          filas: activas.map((f) => ({
            fila: f.fila,
            sku: f.skuOriginal,
            nombre: f.nombreExcel,
            cantidad: f.cantidad,
            productoId: mapeo[f.fila],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al importar');
        return;
      }
      onSaved();
    } catch {
      setError('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">Carga inicial de stock</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Sube el Excel de inventario. Se usa la hoja Octubre y la columna saldo (o la última columna).
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 overflow-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 mb-4">{error}</div>
          )}

          {filas.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center">
              <p className="text-sm text-gray-600 mb-3">Selecciona el archivo de inventario (.xlsx)</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) leerArchivo(file);
                }}
                className="text-sm"
              />
              {procesando && <p className="text-sm text-gray-500 mt-3">Procesando…</p>}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-3 text-sm text-gray-600">
                <span className="font-medium">{archivo}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">Hoja: {hoja}</span>
                <span>{filas.length} filas</span>
              </div>

              {yaImportado && (
                <div className="bg-orange-50 border border-orange-200 text-orange-800 text-sm rounded-lg px-4 py-2 mb-4">
                  La carga inicial ya fue registrada anteriormente. No es posible repetirla.
                </div>
              )}

              {resumen && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4 text-center text-xs">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-lg font-bold text-green-700">{resumen.ok}</p>
                    <p className="text-green-700">Coinciden</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                    <p className="text-lg font-bold text-orange-700">{resumen.ambiguos}</p>
                    <p className="text-orange-700">Por revisar</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-lg font-bold text-red-700">{resumen.noEncontrados}</p>
                    <p className="text-red-700">No encontrados</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-lg font-bold text-red-700">{resumen.duplicados}</p>
                    <p className="text-red-700">Duplicados</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <p className="text-lg font-bold text-gray-700">{resumen.invalidos}</p>
                    <p className="text-gray-700">Inválidos</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <p className="text-lg font-bold text-blue-700">{resumen.conStockNegativo}</p>
                    <p className="text-blue-700">Negativos</p>
                  </div>
                </div>
              )}

              <div className="mb-3">
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Filtrar productos para asignar…"
                  className="w-full md:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="border border-gray-200 rounded-lg overflow-auto max-h-[45vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-2 text-center">Omitir</th>
                      <th className="px-2 py-2">Fila</th>
                      <th className="px-2 py-2">SKU Excel</th>
                      <th className="px-2 py-2">Producto Excel</th>
                      <th className="px-2 py-2 text-right">Saldo</th>
                      <th className="px-2 py-2">Estado</th>
                      <th className="px-2 py-2 min-w-[280px]">Asignar a producto</th>
                      <th className="px-2 py-2 text-center">Stock actual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila) => {
                      const id = mapeo[fila.fila];
                      const omitida = omitidas.has(fila.fila);
                      const dup = !omitida && id ? (conteoMapeo.get(id) || 0) > 1 : false;
                      return (
                        <tr key={fila.fila} className={`border-t border-gray-100 ${omitida ? 'opacity-40' : ''}`}>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              type="checkbox"
                              checked={omitida}
                              onChange={() =>
                                setOmitidas((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(fila.fila)) next.delete(fila.fila);
                                  else next.add(fila.fila);
                                  return next;
                                })
                              }
                              title="Omitir esta fila del traspaso"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-xs text-gray-400">{fila.fila}</td>
                          <td className="px-2 py-1.5 font-mono text-xs">{fila.skuOriginal}</td>
                          <td className="px-2 py-1.5 text-xs text-gray-600 max-w-[260px] truncate" title={fila.nombreExcel || ''}>
                            {fila.nombreExcel || '—'}
                          </td>
                          <td className={`px-2 py-1.5 text-right font-medium ${(fila.cantidad ?? 0) < 0 ? 'text-red-600' : ''}`}>
                            {fila.cantidad ?? '—'}
                          </td>
                          <td className="px-2 py-1.5">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${dup ? 'bg-red-100 text-red-700' : ESTADO_STYLE[fila.estado]}`}>
                              {dup ? 'Duplicado' : ESTADO_LABEL[fila.estado]}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={id ?? ''}
                              disabled={omitida}
                              onChange={(e) =>
                                setMapeo((prev) => ({
                                  ...prev,
                                  [fila.fila]: e.target.value ? parseInt(e.target.value) : null,
                                }))
                              }
                              className={`w-full border rounded px-2 py-1 text-xs ${dup ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                            >
                              <option value="">— Seleccionar producto —</option>
                              {productosFiltrados.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.sku} · {p.nombre}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-center text-xs text-gray-500">
                            {(() => {
                              const prod = productos.find((p) => p.id === id);
                              return prod ? prod.stock : '—';
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-xs text-gray-600 space-y-0.5">
                {sinMapear > 0 && <p className="text-red-600">{sinMapear} fila(s) sin producto asignado.</p>}
                {duplicadosMapeo > 0 && <p className="text-red-600">{duplicadosMapeo} fila(s) asignadas al mismo producto. Corrige los duplicados u omite una fila.</p>}
                {cantidadesInvalidas > 0 && <p className="text-red-600">{cantidadesInvalidas} fila(s) con cantidad inválida.</p>}
                {omitidas.size > 0 && <p className="text-gray-500">{omitidas.size} fila(s) omitida(s); se importarán {activas.length} de {filas.length}.</p>}
                <p>Los productos que no estén en el archivo quedarán con stock 0 (si aún no tienen movimientos). Los saldos negativos se importan tal cual.</p>
                <p>Esta carga inicial solo puede realizarse una vez.</p>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={bloqueado || guardando}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium"
          >
            {guardando ? 'Importando…' : 'Confirmar carga inicial'}
          </button>
        </div>
      </div>
    </div>
  );
}
