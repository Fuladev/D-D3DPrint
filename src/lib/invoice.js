import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoUrl from '../assets/logo.svg'
import { dateLabel, money } from './format.js'
import { orderTotals } from './stock.js'

const WINE = [99, 0, 0]
const BEIGE = [237, 235, 221]
const BLACK = [27, 23, 23]

// Rasterizes the SVG logo in beige so it can sit on the wine-colored header.
let logoPromise
function beigeLogo() {
  logoPromise ??= new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 660
      canvas.height = 300
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = 'rgb(237, 235, 221)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = logoUrl
  })
  return logoPromise
}

const STATUS = { pendiente: 'Pendiente', entregado: 'Entregado', cancelado: 'Cancelado' }

export async function buildInvoice(order, business, products) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const images = Object.fromEntries(products.map((p) => [p.id, p.image]))
  const logo = await beigeLogo()

  doc.setFillColor(...WINE)
  doc.rect(0, 0, width, 34, 'F')
  let x = 14
  if (logo) {
    doc.addImage(logo, 'PNG', 12, 6, 48, 22)
    x = 66
  }
  doc.setTextColor(...BEIGE)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(business.name || 'D&D', x, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text([business.phone, business.address].filter(Boolean).join('  ·  '), x, 23, { maxWidth: width - x - 70 })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(`FACTURA N.º ${String(order.number).padStart(4, '0')}`, width - 14, 16, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Fecha: ${dateLabel(order.date)}`, width - 14, 23, { align: 'right' })

  doc.setTextColor(...BLACK)
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
    headStyles: { fillColor: WINE, textColor: BEIGE },
    alternateRowStyles: { fillColor: [246, 245, 238] },
    styles: { fontSize: 10, valign: 'middle', minCellHeight: 12, textColor: BLACK },
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
  doc.setDrawColor(...WINE)
  doc.line(width - 100, y - 5, width - 14, y - 5)
  doc.setTextColor(...WINE)
  line('TOTAL', money(t.total), true)
  doc.setTextColor(...BLACK)

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
    doc.setTextColor(...WINE)
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
  const doc = await buildInvoice(order, business, products)
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
