// Work Agent parser hotfix 2026-08-12
// Evita interpretar el artículo "una" como edad 1.

waNormalizeNatural=function(raw){
  let q=normalizeCommand(raw);

  // Primero eliminar artículos. Recién después convertir números hablados.
  q=q
    .replace(/\b(una|un|el|la|los|las)\b/g,' ')
    .replace(/\b(de|para|necesito|decime|dame|quiero|ver|consultar|consulta|buscame|buscar|mostrame|mostrar|cuanto|cuánto|mide|pesa|altura|peso|seria|sería|aproximadamente|referencia|datos?)\b/g,' ')
    .replace(/\b(nena|niña|chica|femenino|femenina)\b/g,'mujer')
    .replace(/\b(nene|niño|chico|masculino|masculina|hombre)\b/g,'varon')
    .replace(/\b(anio|anios)\b/g,'años')
    .replace(/\b(mes)\b/g,'meses')
    .replace(/\b(y|ahora|entonces|tambien|también)\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();

  q=spokenNumbersToDigits(q)
    .replace(/\s+/g,' ')
    .trim();

  return q;
};
