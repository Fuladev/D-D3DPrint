// Products from the "PRECIO PRODUCTOS" sheet: [name, beds, quantity, value per bed].
// Print time and grams were not in the sheet, so they start at 0.
const ROWS = [
  ['BTS', 1, 1, 25000],
  ['Árboles maqueta 4cm', 5, 75, 4300],
  ['Árboles maqueta 6cm', 5, 45, 6300],
  ['Árboles maqueta 7.5cm', 5, 30, 5000],
  ['Personas 1:200', 1, 100, 3000],
  ['Luminarias 1:200', 1, 50, 7000],
  ['Paradas de bus', 1, 3, 1500],
  ['Bus', 1, 3, 4500],
  ['Gatos articulados', 1, 1, 10000],
  ['Llavero portaplanos', 1, 1, 7000],
  ['Cama de portaplanos', 1, 10, 47000],
  ['Fichas casino', 1, 5, 55800],
  ['Soporte llavero abre latas mediano', 1, 1, 10400],
  ['Soporte llavero pequeño', 1, 1, 7000],
  ['Abrelatas Hello Kitty', 1, 5, 41100],
  ['Llavero Spider-Man', 1, 5, 14900],
  ['Llavero araña Spider-Man', 1, 5, 16500],
  ['Llaveros Pokémon Halloween', 1, 12, 49900],
  ['Divisor de páginas dragones', 1, 3, 12300],
  ['Divisor de páginas gato', 1, 4, 8400],
]

export function seedProducts(uid) {
  return ROWS.map(([name, beds, qty, bedValue]) => {
    const piecesPerBed = Math.max(1, Math.round(qty / beds))
    return {
      id: uid(),
      name,
      image: '',
      hours: 0,
      minutes: 0,
      grams: 0,
      piecesPerBed,
      costPerBed: 0,
      bedPrice: bedValue,
      price: Math.round((bedValue * beds) / qty),
      notes: '',
      createdAt: new Date().toISOString(),
    }
  })
}
