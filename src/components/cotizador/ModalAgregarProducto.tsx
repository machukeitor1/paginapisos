'use client';

import { useState, useEffect } from 'react';
import { getDisplayLabel } from '@/lib/producto-labels';

export interface ProductoSearch {
  id: number;
  nombre: string;
  sku: string;
  precio: number;
  precioUnitario: number;
  descuento: number | null;
  unidad: string;
  slug: string;
  rendimiento: number;
  unidadVenta: string;
  dimensiones: string | null;
  displayLabel: string | null;
  stock: number;
  stockMinimo: number;
  categoria: { nombre: string };
}

export interface CotizacionItem {
  key: number;
  productoId: number | null;
  descripcion: string;
  cantidad: number;
  rendimiento: number;
  unidadVenta: string;
  precioUnitario: number;
  descuentoPorc: number;
  importe: number;
  proyectoM2: number | null;
  precioM2: number;
  modo: string;
  stock?: number;
}

interface Props {
  product: ProductoSearch;
  onAdd: (item: CotizacionItem) => void;
  onClose: () => void;
}

export default function ModalAgregarProducto({ product, onAdd, onClose }: Props) {
  const rend = product.rendimiento || 1;
  const isM2 = product.unidad === 'm2';
  const physicalLabel = getDisplayLabel(product.sku, product.unidad, product.displayLabel, product.unidadVenta);
  const stock = product.stock ?? 0;
  const sinStock = stock <= 0;

  const [modo, setModo] = useState<'unidad' | 'm2'>(isM2 ? 'unidad' : 'unidad');
  const [cantidad, setCantidad] = useState(1);
  const [proyectoM2, setProyectoM2] = useState(isM2 ? Math.ceil(rend) : 0);
  const [precioUnitario, setPrecioUnitario] = useState(product.precioUnitario || 0);
  const [descuento, setDescuento] = useState(product.descuento || 0);
  const [confirmadoStockBajo, setConfirmadoStockBajo] = useState(false);

  useEffect(() => {
    if (modo === 'unidad') {
      setCantidad(1);
    } else {
      setProyectoM2(Math.ceil(rend));
    }
  }, [modo, rend]);

  useEffect(() => {
    setPrecioUnitario(product.precioUnitario || 0);
  }, [modo, product.precioUnitario]);

  const stockDisponibleSegunModo = () => {
    if (modo === 'm2') {
      const cajasMax = stock;
      return Math.floor(cajasMax * rend);
    }
    return stock;
  };

  const calcImporte = () => {
    if (modo === 'm2') {
      const cajas = Math.ceil(proyectoM2 / rend) || 1;
      return Math.ceil(cajas * precioUnitario);
    }
    return Math.ceil(cantidad * precioUnitario);
  };

  const handleM2Change = (val: number) => {
    const m2max = stockDisponibleSegunModo();
    const clamped = Math.min(val, m2max);
    setProyectoM2(clamped);
    setCantidad(Math.ceil(clamped / rend) || 1);
  };

  const handleCantidadChange = (val: number) => {
    setCantidad(Math.min(val, stock));
  };

  const handleAdd = () => {
    const finalCant = modo === 'm2' ? (Math.ceil(proyectoM2 / rend) || 1) : cantidad;
    const finalM2 = modo === 'm2' ? proyectoM2 : (isM2 ? rend : null);
    const importe = Math.ceil(finalCant * precioUnitario * (1 - descuento / 100));

    onAdd({
      key: 0,
      productoId: product.id,
      descripcion: `${product.sku} - ${product.nombre}`,
      cantidad: finalCant,
      rendimiento: rend,
      unidadVenta: product.unidadVenta || 'un',
      precioUnitario,
      descuentoPorc: descuento,
      importe,
      proyectoM2: finalM2,
      precioM2: isM2 ? Math.ceil(precioUnitario / rend) : precioUnitario,
      modo,
      stock,
    });
  };

  const esStockBajo = stock > 0 && stock <= (product.stockMinimo ?? 0);

  if (sinStock || (!confirmadoStockBajo && esStockBajo)) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
          <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 ${sinStock ? 'bg-red-100' : 'bg-orange-100'}`}>
            <svg className={`w-7 h-7 ${sinStock ? 'text-red-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sinStock ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' : 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'} />
            </svg>
          </div>
          <h3 className="font-bold text-lg text-gray-800 mb-1">{sinStock ? 'Sin stock' : 'Stock bajo'}</h3>
          <p className="text-sm text-gray-500 mb-2">
            {sinStock ? `No quedan unidades de ${product.sku}.` : `${product.sku} quedan ${stock} unidades (mínimo ${product.stockMinimo ?? 0}).`}
          </p>
          {!sinStock && (
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmadoStockBajo(true)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Continuar de todos modos
              </button>
              <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-sm">
                Cancelar
              </button>
            </div>
          )}
          {sinStock && (
            <button onClick={onClose} className="px-6 py-2.5 bg-gray-700 text-white rounded-lg transition-colors text-sm">
              Cerrar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{product.sku}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{product.nombre}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${stock <= 0 ? 'bg-red-100 text-red-700' : stock <= (product.stockMinimo ?? 0) ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
              Stock: {stock}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {isM2 && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
            <button
              onClick={() => setModo('unidad')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${modo === 'unidad' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              {physicalLabel}
            </button>
            <button
              onClick={() => setModo('m2')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${modo === 'm2' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              m²
            </button>
          </div>
        )}

        <div className="space-y-3 mb-4">
          {modo === 'unidad' ? (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cantidad ({physicalLabel})</label>
              <input
                type="number"
                min={1}
                max={stock}
                step={1}
                value={cantidad}
                onChange={(e) => handleCantidadChange(parseInt(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              {isM2 && (
                <p className="text-xs text-gray-500 mt-1">
                  Equivale a {(cantidad * rend).toFixed(2)} m² ({rend} m²/{physicalLabel.toLowerCase()})
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Metros cuadrados (m²)</label>
              <input
                type="number"
                min={0}
                max={stockDisponibleSegunModo()}
                step={1}
                value={proyectoM2}
                onChange={(e) => handleM2Change(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Equivale a {cantidad} {physicalLabel.toLowerCase()} ({rend} m²/{physicalLabel.toLowerCase()})
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Precio {physicalLabel}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Descuento %</label>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={descuento}
                onChange={(e) => setDescuento(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 flex justify-between items-center">
          <span className="text-sm text-gray-600">Importe:</span>
          <span className="text-lg font-bold text-gray-800">
            ${calcImporte().toLocaleString('es-CL')}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleAdd}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            Agregar
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
