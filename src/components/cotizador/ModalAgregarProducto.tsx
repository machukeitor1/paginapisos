'use client';

import { useState, useEffect } from 'react';

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
}

interface Props {
  product: ProductoSearch;
  onAdd: (item: CotizacionItem) => void;
  onClose: () => void;
}

const UNIDAD_LABELS: Record<string, string> = {
  REM: 'Caja', SPC: 'Caja', PIM: 'Caja', PIP: 'Caja',
  CEW: 'Kit con accesorios',
  PEW: 'Perfil', REP: 'Perfil',
  RIW: 'Tabla', REW: 'Tabla', CVW: 'Tabla',
};

function getPhysicalLabel(product: ProductoSearch): string {
  const prefix = product.sku.substring(0, 3);
  if (product.unidad === 'un') return 'Unidad';
  return UNIDAD_LABELS[prefix] || 'Unidad';
}

export default function ModalAgregarProducto({ product, onAdd, onClose }: Props) {
  const rend = product.rendimiento || 1;
  const isM2 = product.unidad === 'm2';
  const physicalLabel = getPhysicalLabel(product);

  const [modo, setModo] = useState<'unidad' | 'm2'>(isM2 ? 'unidad' : 'unidad');
  const [cantidad, setCantidad] = useState(1);
  const [proyectoM2, setProyectoM2] = useState(isM2 ? Math.ceil(rend) : 0);
  const [precioUnitario, setPrecioUnitario] = useState(product.precioUnitario || 0);
  const [descuento, setDescuento] = useState(product.descuento || 0);

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

  const calcImporte = () => {
    if (modo === 'm2') {
      const cajas = Math.round(proyectoM2 / rend) || 1;
      return Math.ceil(cajas * precioUnitario);
    }
    return Math.ceil(cantidad * precioUnitario);
  };

  const handleM2Change = (val: number) => {
    setProyectoM2(val);
    setCantidad(Math.round(val / rend) || 1);
  };

  const handleAdd = () => {
    const finalCant = modo === 'm2' ? (Math.round(proyectoM2 / rend) || 1) : cantidad;
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
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">{product.sku}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{product.nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
                step={1}
                value={cantidad}
                onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              {isM2 && (
                <p className="text-xs text-gray-400 mt-1">
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
                step={1}
                value={proyectoM2}
                onChange={(e) => handleM2Change(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <p className="text-xs text-gray-400 mt-1">
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
