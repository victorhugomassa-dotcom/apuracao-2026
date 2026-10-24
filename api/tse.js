// Busca o arquivo oficial de resultado (-u.json) do TSE para Presidente (2º turno,
// eleição 6258) e devolve um resumo simples para a página.
// A variável TSE_URL, se existir na Vercel, substitui o endereço abaixo.
const TSE = "https://resultados.tse.jus.br/oficial/ele2026/6258/dados/br/br-c0001-e006258-u.json";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=20");
  try {
    const r = await fetch(process.env.TSE_URL || TSE, { headers: { "User-Agent": "Mozilla/5.0" } });
    // 404 = arquivo ainda não publicado. Respondemos 200 (com cache) para não
    // gerar uma enxurrada de pedidos ao TSE, que bloqueia IPs com muitos 404.
    if (r.status === 404) return res.status(200).json({ aguardando: true });
    if (!r.ok) throw new Error("TSE respondeu " + r.status);
    const d = await r.json();
    const dec = s => Number(String(s).replace(",", "."));   // "47,03" -> 47.03
    const int = s => Number(String(s).replace(/\D/g, ""));  // "53879538" -> 53879538
    const cands = [];
    for (const cg of d.carg || [])
      for (const a of cg.agr || [])
        for (const p of a.par || [])
          for (const c of p.cand || []) cands.push(c);
    cands.sort((a, b) => int(a.seq) - int(b.seq));
    res.status(200).json({
      apurado: dec(d.s && d.s.pst) || 0,          // % de seções totalizadas
      finalizado: d.and === "f",                  // totalização final
      atualizado: [d.dg, d.hg].filter(Boolean).join(" "),
      candidatos: cands.map(c => ({
        nome: c.nmu || c.nm,
        votos: int(c.vap),
        pct: dec(c.pvap) || 0,
        eleito: c.e === "s" || /^eleito/i.test(c.st || ""),
      })),
    });
  } catch (e) {
    res.status(502).json({ erro: e.message });
  }
}
