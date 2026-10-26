import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { dateLabel, money } from './format.js'
import { orderTotals } from './stock.js'

const STATUS = { pendiente: 'Pendiente', entregado: 'Entregado', cancelado: 'Cancelado' }

export function buildInvoice(order, business, products) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const images = Object.fromEntries(products.map((p) => [p.id, p.image]))

  doc.setFillColor(79, 70, 229)
  doc.rect(0, 0, width, 32, 'F')
  doc.setTextColor(255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(business.name || 'Factura', 14, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text([business.phone, business.address].filter(Boolean).join('  ·  '), 14, 23)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(`FACTURA N.º ${String(order.number).padStart(4, '0')}`, width - 14, 15, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Fecha: ${dateLabel(order.date)}`, width - 14, 23, { align: 'right' })

  doc.setTextColor(30)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Cliente', 14, 44)
  doc.setFont('helvetica', 'normal')
  doc.text([order.client, order.phone].filter(Boolean), 14, 50)
  doc.text(`Estado: ${STATUS[order.status] || order.status}`, width - 14, 44, { align: 'right' })

  const rows = order.items.map((i) => ['', i.name, String(i.qty), money(i.price), money(i.qty * i.price)])
  autoTable(doc, {
    startY: 62,
    head: [['', 'Producto', 'Cant.', 'Precio unit.', 'Subtotal']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 10, valign: 'middle', minCellHeight: 12 },
    columnStyles: {
      0: { cellWidth: 14 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 34 },
    },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index !== 0) return
      const img = images[order.items[data.row.index]?.productId]
      if (!img) return
      try {
        doc.addImage(img, 'JPEG', data.cell.x + 2, data.cell.y + 1.5, 9, 9)
      } catch {
        // ignore images jsPDF cannot decode
      }
    },
  })

  const t = orderTotals(order)
  let y = doc.lastAutoTable.finalY + 8
  const line = (label, value, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 13 : 11)
    doc.text(label, width - 60, y, { align: 'right' })
    doc.text(value, width - 14, y, { align: 'right' })
    y += bold ? 8 : 6
  }
  line('Subtotal', money(t.subtotal))
  if (t.discount) line('Descuento', `- ${money(t.discount)}`)
  if (t.shipping) line('Envío', money(t.shipping))
  y += 1
  doc.setDrawColor(200)
  doc.line(width - 100, y - 5, width - 14, y - 5)
  line('TOTAL', money(t.total), true)

  if (order.note) {
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Notas', 14, y)
    doc.setFont('helvetica', 'normal')
    doc.text(doc.splitTextToSize(order.note, width - 28), 14, y + 5)
  }

  if (business.footer) {
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(business.footer, width / 2, doc.internal.pageSize.getHeight() - 12, { align: 'center' })
  }
  return doc
}

export function invoiceFileName(order) {
  const client = (order.client || 'cliente').normalize('NFD').replace(/[^\w]+/g, '_')
  return `Factura_${String(order.number).padStart(4, '0')}_${client}.pdf`
}

export function whatsappNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  // Colombian mobile numbers are 10 digits starting with 3; add the country code.
  if (digits.length === 10 && digits.startsWith('3')) return `57${digits}`
  return digits
}

export function invoiceMessage(order, business) {
  const t = orderTotals(order)
  const lines = order.items.map((i) => `• ${i.qty} × ${i.name} = ${money(i.qty * i.price)}`)
  return [
    `Hola ${order.client} 👋`,
    `Te comparto la factura N.º ${String(order.number).padStart(4, '0')} de ${business.name}:`,
    '',
    ...lines,
    '',
    `*Total: ${money(t.total)}*`,
  ].join('\n')
}

// Shares the PDF through the native share sheet (WhatsApp on phones) when available;
// otherwise downloads it and opens a WhatsApp chat so the file can be attached.
export async function sendInvoice(order, business, products) {
  const doc = buildInvoice(order, business, products)
  const name = invoiceFileName(order)
  const text = invoiceMessage(order, business)
  const file = new File([doc.output('blob')], name, { type: 'application/pdf' })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name, text })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled'
    }
  }
  doc.save(name)
  const phone = whatsappNumber(order.phone)
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(text + '\n\n(Adjunto la factura en PDF)')}`
  window.open(url, '_blank', 'noopener')
  return 'downloaded'
}
