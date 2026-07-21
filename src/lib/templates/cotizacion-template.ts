import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle,
} from 'docx';

interface ConfigData {
  nombreEmpresa: string;
  direccion?: string;
  telefono?: string;
  whatsapp?: string;
  email?: string;
}

const EMPRESA_FIJA: ConfigData = {
  nombreEmpresa: 'REVESTIMIENTOS CHILLÁN',
  direccion: 'Alcántara 1080-A, Villa Barcelona, Chillán',
  telefono: '+56 9 58603702',
};

function fmtPhone(c: ConfigData): string {
  const parts: string[] = [];
  if (c.telefono) parts.push(c.telefono);
  if (c.whatsapp) parts.push(c.whatsapp);
  return parts.join(' | ') || EMPRESA_FIJA.telefono!;
}

function labelValue(label: string, valueLen: number = 50): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: label, font: 'Arial', size: 20, bold: true }),
      new TextRun({ text: '_'.repeat(valueLen), font: 'Arial', size: 20, underline: { type: 'single' } }),
    ],
    spacing: { before: 40, after: 40 },
  });
}

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text, font: 'Arial', size: 16, bold: true, color: 'FFFFFF' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 30, after: 30 },
    })],
    shading: { fill: '2B579A', color: 'auto', type: 'clear' },
  });
}

function emptyCell(): TableCell {
  return new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: '', size: 20 })],
      spacing: { before: 20, after: 20 },
    })],
  });
}

function buildDocument(config: ConfigData): Document {
  const now = new Date();
  const vence = new Date(now);
  vence.setDate(vence.getDate() + 3);

  const dateStr = now.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });
  const venceStr = vence.toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

  const headerChildren: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: config.nombreEmpresa, font: 'Arial', size: 32, bold: true, color: '2B579A' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: config.direccion || EMPRESA_FIJA.direccion!, font: 'Arial', size: 18, color: '555555' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 20 },
    }),
    new Paragraph({
      children: [new TextRun({ text: fmtPhone(config), font: 'Arial', size: 18, color: '555555' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  ];

  const titleRow: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: 'COTIZACIÓN', font: 'Arial', size: 28, bold: true, color: '2B579A' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'N°: ', font: 'Arial', size: 22, bold: true }),
        new TextRun({ text: '_'.repeat(30), font: 'Arial', size: 22, underline: { type: 'single' } }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
  ];

  const clientInfo: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: 'DATOS DEL CLIENTE', font: 'Arial', size: 20, bold: true, color: '2B579A' })],
      spacing: { before: 200, after: 100 },
    }),
    labelValue('Cliente:     ', 50),
    labelValue('RUT:         ', 30),
    labelValue('Dirección:   ', 50),
    labelValue('Comuna:      ', 30),
    labelValue('Teléfono:    ', 30),
    new Paragraph({ spacing: { before: 100, after: 100 } }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Vendedor: ', font: 'Arial', size: 21, bold: true }),
        new TextRun({ text: '_'.repeat(40), font: 'Arial', size: 21, underline: { type: 'single' } }),
      ],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Emisión:   ', font: 'Arial', size: 21, bold: true }),
        new TextRun({ text: `${dateStr}`, font: 'Arial', size: 21 }),
        new TextRun({ text: '        Válida hasta: ', font: 'Arial', size: 21, bold: true }),
        new TextRun({ text: `${venceStr}`, font: 'Arial', size: 21 }),
      ],
      spacing: { after: 300 },
    }),
  ];

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('#'),
      headerCell('Descripción'),
      headerCell('Cant.'),
      headerCell('P. Unitario'),
      headerCell('Desc %'),
      headerCell('Importe'),
    ],
  });

  const emptyRows = Array.from({ length: 12 }, () => new TableRow({
    children: Array.from({ length: 6 }, () => emptyCell()),
  }));

  const productTable = new Table({
    rows: [tableHeaderRow, ...emptyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
    },
  });

  const totals: Paragraph[] = [
    new Paragraph({ spacing: { before: 200, after: 200 } }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Subtotal:    ', font: 'Arial', size: 22 }),
        new TextRun({ text: '_'.repeat(25), font: 'Arial', size: 22, underline: { type: 'single' } }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'IVA 19%:     ', font: 'Arial', size: 22 }),
        new TextRun({ text: '_'.repeat(25), font: 'Arial', size: 22, underline: { type: 'single' } }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'TOTAL:       ', font: 'Arial', size: 24, bold: true }),
        new TextRun({ text: '_'.repeat(25), font: 'Arial', size: 24, bold: true, underline: { type: 'single' } }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'NOTAS:', font: 'Arial', size: 20, bold: true, color: '2B579A' })],
      spacing: { before: 200, after: 100 },
    }),
    ...Array.from({ length: 3 }, () => new Paragraph({
      children: [new TextRun({ text: '_'.repeat(100), font: 'Arial', size: 20, underline: { type: 'single' } })],
      spacing: { after: 60 },
    })),
    new Paragraph({ spacing: { after: 300 } }),
    new Paragraph({
      children: [new TextRun({ text: '* Cotización válida por 3 días desde su emisión', font: 'Arial', size: 18, color: '888888' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Visítanos en www.revestimientoschillan.cl', font: 'Arial', size: 16, color: '888888' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
    }),
  ];

  const allChildren: (Paragraph | Table)[] = [
    ...headerChildren, ...titleRow, ...clientInfo,
    productTable, ...totals,
  ];

  return new Document({
    title: `Plantilla Cotización - ${config.nombreEmpresa}`,
    creator: 'Sistema de Cotizaciones',
    description: `Plantilla de cotización en blanco para ${config.nombreEmpresa}`,
    sections: [{ children: allChildren }],
  });
}

export async function generateTemplateBuffer(tipo: 'fijo' | 'dinamico'): Promise<Buffer> {
  let config: ConfigData;

  if (tipo === 'fijo') {
    config = EMPRESA_FIJA;
  } else {
    const { prisma } = await import('@/lib/prisma');
    const db = await prisma.configuracion.findUnique({ where: { id: 1 } });
    config = {
      nombreEmpresa: db?.nombreEmpresa || EMPRESA_FIJA.nombreEmpresa,
      direccion: db?.nombreEmpresa ? undefined : EMPRESA_FIJA.direccion,
      telefono: db?.whatsappGlobal || undefined,
    };
  }

  return Packer.toBuffer(buildDocument(config));
}
