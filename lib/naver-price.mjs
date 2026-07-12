const currentQuote = /<p class="no_today">[\s\S]*?<span class="blind">([\d,]+)<\/span>/;

export function parseNaverPrice(html) {
  const match = html.match(currentQuote);
  const value = match === null ? Number.NaN : Number(match[1].replaceAll(",", ""));

  return Number.isFinite(value) ? value : null;
}
