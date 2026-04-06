import ExcelJS from 'exceljs'
import PDFDocument from 'pdfkit'

// Colunas para impressão — simples, fundo claro, orientação paisagem
const PRINT_COLS = [
  { key: 'nome',     label: 'Nome da Loja',  width: 36 },
  { key: 'cidade_uf',label: 'Cidade / UF',   width: 22 },
  { key: 'whatsapp', label: 'WhatsApp',      width: 18 },
  { key: 'telefone', label: 'Telefone Fixo', width: 18 },
  { key: 'email',    label: 'E-mail',        width: 30 },
  { key: 'nota',     label: 'Nota',          width: 12 },
]

const NOTA_LABEL = { 1: 'Fraco', 2: 'Médio', 3: 'Excelente' }

export async function toExcel(clients) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'CRM Scooter'

  const ws = wb.addWorksheet('Clientes', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: {
      orientation:    'landscape',
      paperSize:      9,          // A4
      fitToPage:      true,
      fitToWidth:     1,
      fitToHeight:    0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
    headerFooter: {
      oddHeader: '&C&"Arial,Bold"Lista de Clientes — CRM Scooter',
      oddFooter:  '&LGerado em &D &T&RPágina &P de &N',
    },
  })

  // Define largura inicial com base no label; será expandida após popular os dados
  ws.columns = PRINT_COLS.map(({ label, key }) => ({ header: label, key, width: label.length + 2 }))

  // Cabeçalho — cinza escuro discreto, fácil de imprimir
  const headerRow = ws.getRow(1)
  headerRow.eachCell(cell => {
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }
    cell.font      = { bold: true, color: { argb: 'FF1A1A1A' }, size: 11, name: 'Arial' }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border    = {
      top:    { style: 'medium', color: { argb: 'FF888888' } },
      left:   { style: 'medium', color: { argb: 'FF888888' } },
      bottom: { style: 'medium', color: { argb: 'FF888888' } },
      right:  { style: 'medium', color: { argb: 'FF888888' } },
    }
  })
  headerRow.height = 20

  // Linha de dados
  clients.forEach((c, i) => {
    const row = ws.addRow({
      nome:      c.nome      ?? '',
      cidade_uf: [c.cidade, c.uf].filter(Boolean).join(' / '),
      whatsapp:  c.whatsapp  ?? '',
      telefone:  c.telefone  ?? '',
      email:     c.email     ?? '',
      nota:      NOTA_LABEL[c.nota] ?? '',
    })

    // Linhas alternadas: branco / cinza muito claro — econômico para impressão
    const bg = i % 2 === 0 ? 'FFFFFFFF' : 'FFF5F5F5'
    const gridBorder = { style: 'thin', color: { argb: 'FFAAAAAA' } }
    row.eachCell({ includeEmpty: true }, cell => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
      cell.font      = { size: 10, color: { argb: 'FF1A1A1A' }, name: 'Arial' }
      cell.alignment = { vertical: 'middle' }
      cell.border    = { top: gridBorder, left: gridBorder, bottom: gridBorder, right: gridBorder }
    })
    row.height = 16
  })

  // Ajusta largura de cada coluna ao maior conteúdo (label ou dados)
  ws.columns.forEach((col, i) => {
    const key = PRINT_COLS[i].key
    const label = PRINT_COLS[i].label
    const maxDataLen = clients.reduce((max, c) => {
      let val = ''
      if (key === 'cidade_uf') val = [c.cidade, c.uf].filter(Boolean).join(' / ')
      else if (key === 'nota') val = NOTA_LABEL[c.nota] ?? ''
      else val = String(c[key] ?? '')
      return Math.max(max, val.length)
    }, 0)
    col.width = Math.min(Math.max(label.length + 2, maxDataLen + 2), 60)
  })

  ws.autoFilter = { from: 'A1', to: { row: 1, column: PRINT_COLS.length } }

  // Define área de impressão
  ws.printArea = `A1:${String.fromCharCode(64 + PRINT_COLS.length)}${clients.length + 1}`

  return wb.xlsx.writeBuffer()
}

export function toPDF(clients) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    doc.fontSize(16).font('Helvetica-Bold').text('Relatório de Clientes', { align: 'center' })
    doc.fontSize(9).font('Helvetica').text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
    doc.moveDown(0.5)

    const pdfCols = [
      { key: 'nome',        label: 'Nome',      w: 130 },
      { key: 'cidade',      label: 'Cidade',    w: 70  },
      { key: 'uf',          label: 'UF',        w: 25  },
      { key: 'whatsapp',    label: 'WhatsApp',  w: 80  },
      { key: 'email',       label: 'E-mail',    w: 110 },
      { key: 'instagram',   label: 'Instagram', w: 90  },
      { key: 'status_nome', label: 'Status',    w: 80  },
      { key: 'nota',        label: 'Nota',      w: 55  },
      { key: 'seller_nome', label: 'Vendedor',  w: 70  },
    ]

    const startX = 40
    let y = doc.y + 5

    doc.fontSize(7).font('Helvetica-Bold')
    doc.rect(startX, y, pdfCols.reduce((s, c) => s + c.w, 0), 14).fill('#1e3a5f')
    doc.fill('white')
    let x = startX
    pdfCols.forEach(col => {
      doc.text(col.label, x + 3, y + 3, { width: col.w - 6, ellipsis: true })
      x += col.w
    })
    doc.fill('black')
    y += 14

    doc.fontSize(7).font('Helvetica')
    clients.forEach((c, i) => {
      if (y > 520) { doc.addPage(); y = 40 }
      const bg = i % 2 === 0 ? '#1a1a2e' : '#16213e'
      doc.rect(startX, y, pdfCols.reduce((s, col) => s + col.w, 0), 13).fill(bg)
      doc.fill('#e2e8f0')
      x = startX
      pdfCols.forEach(col => {
        let val = c[col.key] ?? ''
        if (col.key === 'nota') val = val ? ['', 'Fraco', 'Médio', 'Excelente'][val] || val : ''
        doc.text(String(val), x + 3, y + 3, { width: col.w - 6, ellipsis: true })
        x += col.w
      })
      doc.fill('black')
      y += 13
    })

    doc.end()
  })
}
