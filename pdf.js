/* Modelos de lançamento UAU · geração do PDF no timbrado */
(function () {
  const { PDFDocument, StandardFonts, rgb, PDFName, PDFHexString } = PDFLib;
  const MM = 72 / 25.4;
  const A4 = [595.28, 841.89];
  const AREA = { x: 20 * MM, topo: A4[1] - 40 * MM, base: 34 * MM, largura: A4[0] - 40 * MM };
  const PRETO = rgb(0.067, 0.067, 0.067), CINZA = rgb(0.392, 0.392, 0.392), CLARO = rgb(0.784, 0.784, 0.784);
  const BLOCO = rgb(0.945, 0.945, 0.945), BRANCO = rgb(1, 1, 1);
  const CHAVE = "DBVOModeloLancamento";
  const PAD = 10, GAP = 8;

  window.lerDadosPDF = function (doc) {
    try {
      const v = doc.getInfoDict().lookup(PDFName.of(CHAVE));
      if (!v) return null;
      return JSON.parse(v.decodeText());
    } catch (e) { return null; }
  };

  window.gerarPDF = async function (dados, anexos, importado) {
    const doc = await PDFDocument.create();
    let f, fb, conjunto = null;
    try {
      doc.registerFontkit(window.fontkit);
      const [r, b] = await Promise.all(["fontes/N27-Regular.ttf", "fontes/N27-Bold.ttf"].map((u) => fetch(u).then((x) => { if (!x.ok) throw new Error(u); return x.arrayBuffer(); })));
      f = await doc.embedFont(r, { subset: true }); fb = await doc.embedFont(b, { subset: true });
      conjunto = new Set(f.getCharacterSet());
    } catch (e) {
      console.warn("N27 indisponível, usando Helvetica", e);
      f = await doc.embedFont(StandardFonts.Helvetica); fb = await doc.embedFont(StandardFonts.HelveticaBold);
    }
    const timbrado = await doc.embedJpg(await (await fetch("timbrado.jpg")).arrayBuffer());

    /* texto seguro para a fonte padrão */
    const cache = {};
    const limpar = (s) => String(s ?? "").replace(/\r/g, "").split("").map((ch) => {
      if (ch === "\n") return ch;
      if (cache[ch] === undefined) {
        let ok;
        if (conjunto) ok = conjunto.has(ch.codePointAt(0));
        else { try { f.encodeText(ch); fb.encodeText(ch); ok = true; } catch (e) { ok = false; } }
        cache[ch] = ok ? ch : ({ "−": "-", "“": "\"", "”": "\"", "‘": "'", "’": "'", "–": "-", "—": "-", "…": "...", "•": "·" }[ch] || "?");
      }
      return cache[ch];
    }).join("");
    const larg = (s, fonte, t) => fonte.widthOfTextAtSize(s, t);
    function quebrar(texto, fonte, t, w) {
      const out = [];
      for (const par of limpar(texto).split("\n")) {
        let linha = "";
        for (const pal of par.split(/ +/)) {
          const tent = linha ? linha + " " + pal : pal;
          if (larg(tent, fonte, t) <= w) { linha = tent; continue; }
          if (linha) out.push(linha);
          if (larg(pal, fonte, t) <= w) { linha = pal; continue; }
          let pedaco = "";
          for (const ch of pal) { if (larg(pedaco + ch, fonte, t) > w) { out.push(pedaco); pedaco = ch; } else pedaco += ch; }
          linha = pedaco;
        }
        out.push(linha);
      }
      return out;
    }
    const espacado = (s) => limpar(s).toUpperCase();
    function texto(p, s, x, y, t, fonte, cor, esp) {
      p.drawText(s, { x, y, size: t, font: fonte, color: cor || PRETO, characterSpacing: esp || 0 });
    }
    function caixa(p, x, yTopo, w, h, cor) {
      const r = 8; const y = yTopo - h;
      const path = `M ${x + r} ${0} L ${x + w - r} 0 Q ${x + w} 0 ${x + w} ${r} L ${x + w} ${h - r} Q ${x + w} ${h} ${x + w - r} ${h} L ${x + r} ${h} Q ${x} ${h} ${x} ${h - r} L ${x} ${r} Q ${x} 0 ${x + r} 0 Z`;
      p.drawSvgPath(path.replace(/(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g, (m, a, _, b) => (+a - x + x) + " " + (h - +b)), { x: 0, y: 0, color: cor });
      void y;
    }
    // caixa arredondada (desenho com coordenadas do PDF)
    function caixaR(p, x, yTopo, w, h, cor) {
      const r = Math.min(8, h / 2);
      const y = yTopo - h;
      p.drawRectangle({ x: x + r, y, width: w - 2 * r, height: h, color: cor });
      p.drawRectangle({ x, y: y + r, width: w, height: h - 2 * r, color: cor });
      for (const [cx, cy] of [[x + r, y + r], [x + w - r, y + r], [x + r, y + h - r], [x + w - r, y + h - r]]) p.drawCircle({ x: cx, y: cy, size: r, color: cor });
    }
    void caixa;

    /* páginas */
    const paginas = [];
    function novaPagina() {
      const p = doc.addPage(A4);
      p.drawImage(timbrado, { x: 0, y: 0, width: A4[0], height: A4[1] });
      paginas.push(p);
      return p;
    }

    /* ---------- itens (cada um tem altura e desenho) ---------- */
    const T = { rot: 6.4, val: 8.6, tit: 7.4 };
    function itemTitulo(s, cont) {
      return { h: 16, draw(p, x, y) { texto(p, espassar(s + (cont ? " (continuação)" : "")), x, y - 9, T.tit, fb, PRETO, 1.1); } };
    }
    const espassar = espacado;
    function celulaCampo(c, w) {
      const vazioC = !c.valor;
      const fonte = vazioC ? f : (c.longo ? f : fb);
      const linhas = quebrar(vazioC ? "Não informado (ver justificativa)" : c.valor, fonte, T.val, w);
      return { linhas, fonte, cor: vazioC ? CINZA : PRETO, h: 9 + linhas.length * 11 };
    }
    function itensGrade(campos, w) {
      const out = [];
      let i = 0;
      while (i < campos.length) {
        const c = campos[i];
        if (c.tabela) { out.push(...itensTabela(c, w)); i++; continue; }
        if (c.meia && campos[i + 1] && campos[i + 1].meia && !campos[i + 1].tabela) {
          const a = c, b = campos[i + 1], wc = (w - 12) / 2;
          const ca = celulaCampo(a, wc), cb = celulaCampo(b, wc);
          out.push({ h: Math.max(ca.h, cb.h) + 5, draw(p, x, y) { desenhaCampo(p, a, ca, x, y); desenhaCampo(p, b, cb, x + wc + 12, y); } });
          i += 2; continue;
        }
        const cc = celulaCampo(c, w);
        // campos longos podem quebrar entre páginas
        if (cc.linhas.length > 6) {
          out.push({ h: 9 + 11 * 3 + 2, draw(p, x, y) { desenhaCampo(p, c, { ...cc, linhas: cc.linhas.slice(0, 3) }, x, y); } });
          for (let k = 3; k < cc.linhas.length; k++) { const ln = cc.linhas[k]; out.push({ h: 11, draw(p, x, y) { texto(p, ln, x, y - 8.5, T.val, cc.fonte, cc.cor); } }); }
          out.push({ h: 5, draw() {} });
        } else out.push({ h: cc.h + 5, draw(p, x, y) { desenhaCampo(p, c, cc, x, y); } });
        i++;
      }
      return out;
    }
    function desenhaCampo(p, c, cc, x, y) {
      texto(p, espassar(c.rotulo), x, y - 6, T.rot, f, CINZA, 0.6);
      cc.linhas.forEach((ln, k) => texto(p, ln, x, y - 16 - k * 11, T.val, cc.fonte, cc.cor));
    }
    function itensKV(campos, w) {
      return campos.map((c) => {
        const v = limpar(c.valor || "Não informado");
        const fonte = c.destaque ? fb : f, t = c.destaque ? 9.6 : 8.2;
        const rot = quebrar(c.rotulo, fonte, t, w - larg(v, fonte, t) - 10);
        const h = Math.max(1, rot.length) * 11 + 6;
        return { h, draw(p, x, y) {
          if (c.destaque) p.drawLine({ start: { x, y: y + 1 }, end: { x: x + w, y: y + 1 }, thickness: 1.2, color: PRETO });
          else p.drawLine({ start: { x, y: y - h + 1 }, end: { x: x + w, y: y - h + 1 }, thickness: 0.5, color: CLARO });
          rot.forEach((ln, k) => texto(p, ln, x, y - 10 - k * 11, t, fonte, PRETO));
          texto(p, v, x + w - larg(v, fonte, t), y - 10, t, fonte, c.valor ? PRETO : CINZA);
        } };
      });
    }
    function itensTabela(c, w) {
      const soma = c.colunas.reduce((t, k) => t + k.largura, 0);
      const ws = c.colunas.map((k) => (k.largura / soma) * w);
      const linhaItem = (cels, fonte, t, cor, cab) => {
        const ql = cels.map((s, i) => quebrar(cab ? espassar(s) : s, fonte, t, ws[i] - 6));
        const h = Math.max(...ql.map((q) => q.length)) * (t + 2.6) + 6;
        return { h, draw(p, x, y) {
          let cx = x;
          ql.forEach((q, i) => {
            q.forEach((ln, k) => {
              const tx = c.colunas[i].direita ? cx + ws[i] - 3 - larg(ln, fonte, t) : cx + 3;
              texto(p, ln, tx, y - t - 2 - k * (t + 2.6), t, fonte, cor, cab ? 0.4 : 0);
            });
            cx += ws[i];
          });
          p.drawLine({ start: { x, y: y - h + 1 }, end: { x: x + w, y: y - h + 1 }, thickness: cab ? 0.8 : 0.4, color: CLARO });
        } };
      };
      const out = [];
      const cab0 = linhaItem(c.colunas.map((k) => k.rotulo), f, 6.2, CINZA, true);
      const cab = { h: cab0.h + 13, draw(p, x, y) { texto(p, espassar(c.rotulo), x, y - 7, T.rot, f, CINZA, 0.6); cab0.draw(p, x, y - 13); } };
      if (!c.linhas.length) {
        out.push(cab);
        out.push({ h: 16, draw(p, x, y) { texto(p, "Nenhuma linha preenchida (ver justificativa)", x + 3, y - 11, T.val, f, CINZA); } });
        return out;
      }
      c.linhas.forEach((l, i) => { const li = linhaItem(l, f, 8, PRETO); out.push(i === 0 ? { h: cab.h + li.h, draw(p, x, y) { cab.draw(p, x, y); li.draw(p, x, y - cab.h); } } : li); });
      if (c.total) out.push({ h: 16, draw(p, x, y) { const s = "Total " + c.total; texto(p, s, x + w - 3 - larg(s, fb, 8.6), y - 11, 8.6, fb, PRETO); } });
      out.push({ h: 4, draw() {} });
      return out;
    }

    /* ---------- montagem das páginas do formulário ---------- */
    let pag = novaPagina();
    let y = AREA.topo;
    const W = AREA.largura;

    // título
    function cabecalhoDoc(p) {
      p.drawLine({ start: { x: AREA.x, y: y - 4 }, end: { x: AREA.x + 14, y: y - 4 }, thickness: 1.2, color: PRETO });
      texto(p, "MODELO DE LANÇAMENTO UAU", AREA.x + 19, y - 6.5, 6.6, f, CINZA, 1.4);
      texto(p, espassar(dados.modelo.titulo), AREA.x, y - 25, 15, fb, PRETO, 1.1);
      y -= 36;
    }
    cabecalhoDoc(pag);

    function blocoSecao(titulo, itens, opts = {}) {
      const w = opts.w || W, x0 = opts.x || AREA.x;
      let restantes = itens.slice();
      let cont = false;
      while (restantes.length) {
        const tit = itemTitulo(titulo, cont);
        let disponivel = y - AREA.base - 2 * PAD - tit.h;
        const cabem = [];
        let soma = 0;
        for (const it of restantes) { if (soma + it.h > disponivel && cabem.length) break; if (soma + it.h > disponivel && y < AREA.topo - 1) break; cabem.push(it); soma += it.h; }
        if (!cabem.length) { pag = novaPagina(); y = AREA.topo; continue; }
        const h = soma + tit.h + 2 * PAD - 2;
        caixaR(pag, x0, y, w, h, opts.cor || BLOCO);
        tit.draw(pag, x0 + PAD + 2, y - PAD + 2);
        let yy = y - PAD - tit.h + 2;
        for (const it of cabem) { it.draw(pag, x0 + PAD + 2, yy); yy -= it.h; }
        y -= h + GAP;
        restantes = restantes.slice(cabem.length);
        cont = true;
        if (restantes.length) { pag = novaPagina(); y = AREA.topo; }
      }
    }
    const larguraInterna = (w) => w - 2 * PAD - 4;

    // quadro de campos não preenchidos
    if (dados.pendencias.length) {
      const wi = larguraInterna(W);
      const itens = dados.pendencias.map((p) => {
        const s = p.rotulo + (p.anexo ? " (comprovante não anexado)" : "") + ". ";
        const linhas = quebrar(s + "Justificativa: " + (p.justificativa || ""), f, 8.2, wi);
        return { h: linhas.length * 10.5 + 3, draw(pg, x, yy) {
          linhas.forEach((ln, k) => {
            if (k === 0 && ln.startsWith(limpar(s.trim()))) {
              const b = limpar(s);
              const corte = ln.length >= b.length ? b : ln;
              texto(pg, corte, x, yy - 8.5, 8.2, fb, BRANCO);
              texto(pg, ln.slice(corte.length), x + larg(corte, fb, 8.2), yy - 8.5, 8.2, f, CLARO);
            } else texto(pg, ln, x, yy - 8.5 - k * 10.5, 8.2, f, CLARO);
          });
        } };
      });
      const tituloOrig = itemTitulo;
      const titulo = "Campos não preenchidos (" + dados.pendencias.length + ")";
      // título branco
      const itemTituloBranco = (s, cont) => ({ h: 16, draw(p, x, yy) { texto(p, espassar(s + (cont ? " (continuação)" : "")), x, yy - 9, T.tit, fb, BRANCO, 1.1); } });
      itemTitulo = itemTituloBranco;
      blocoSecao(titulo, itens, { cor: PRETO });
      itemTitulo = tituloOrig;
    }

    // seções
    for (let i = 0; i < dados.secoes.length; i++) {
      const s = dados.secoes[i], prox = dados.secoes[i + 1];
      if (s.meia && prox && prox.meia) {
        const w2 = (W - GAP) / 2;
        const a = itensKV(s.campos, larguraInterna(w2)), b = itensKV(prox.campos, larguraInterna(w2));
        const ha = a.reduce((t, it) => t + it.h, 0), hb = b.reduce((t, it) => t + it.h, 0);
        const h = Math.max(ha, hb) + 16 + 2 * PAD - 2;
        if (y - h < AREA.base) { pag = novaPagina(); y = AREA.topo; }
        const y0 = y;
        blocoSecaoFixa(s.titulo, a, AREA.x, y0, w2, h);
        blocoSecaoFixa(prox.titulo, b, AREA.x + w2 + GAP, y0, w2, h);
        y = y0 - h - GAP;
        i++;
        continue;
      }
      blocoSecao(s.titulo, s.meia ? itensKV(s.campos, larguraInterna(W)) : itensGrade(s.campos, larguraInterna(W)));
    }
    function blocoSecaoFixa(titulo, itens, x, yTopo, w, h) {
      caixaR(pag, x, yTopo, w, h, BLOCO);
      itemTitulo(titulo).draw(pag, x + PAD + 2, yTopo - PAD + 2);
      let yy = yTopo - PAD - 16 + 2;
      for (const it of itens) { it.draw(pag, x + PAD + 2, yy); yy -= it.h; }
    }

    /* ---------- lista de comprovantes ---------- */
    const listaAnexos = [];
    for (const slot of dados.anexosCfg) for (const a of anexos[slot.id] || []) listaAnexos.push({ slot, a });
    const paginasForm = () => paginas.length;
    // calcula páginas de cada comprovante (cada página de PDF = 1 página)
    let proxima = 0; // definido depois que o formulário terminar
    const itensLista = [];
    const adiados = [];
    const wi = larguraInterna(W);
    listaAnexos.forEach((x, i) => {
      x.indice = i + 1;
      const s = x.indice + ". " + x.slot.rotulo + " · " + x.a.nome;
      const linhas = quebrar(s, f, 8.2, wi - 90);
      x.item = { h: linhas.length * 10.5 + 4, draw(p, xx, yy) {
        linhas.forEach((ln, k) => texto(p, ln, xx, yy - 8.5 - k * 10.5, 8.2, f, PRETO));
        adiados.push(() => { const pg = x.paginaInicial === x.paginaFinal ? "página " + x.paginaInicial : "páginas " + x.paginaInicial + " a " + x.paginaFinal; texto(p, pg, xx + wi - larg(pg, f, 8.2), yy - 8.5, 8.2, f, CINZA); });
      } };
      itensLista.push(x.item);
    });
    const naoAnexados = dados.pendencias.filter((p) => p.anexo);
    naoAnexados.forEach((p) => {
      const linhas = quebrar(p.rotulo + ": não anexado. Justificativa: " + (p.justificativa || ""), f, 8.2, wi);
      itensLista.push({ h: linhas.length * 10.5 + 4, draw(pg, xx, yy) { linhas.forEach((ln, k) => texto(pg, ln, xx, yy - 8.5 - k * 10.5, 8.2, k === 0 ? f : f, CINZA)); } });
    });
    (dados.anexosSem || []).forEach((s) => {
      const linhas = quebrar(s.rotulo + ": " + (s.motivo || "não tem") + ".", f, 8.2, wi);
      itensLista.push({ h: linhas.length * 10.5 + 4, draw(pg, xx, yy) { linhas.forEach((ln, k) => texto(pg, ln, xx, yy - 8.5 - k * 10.5, 8.2, f, CINZA)); } });
    });
    if (!itensLista.length) itensLista.push({ h: 14, draw(p, xx, yy) { texto(p, "Nenhum comprovante anexado.", xx, yy - 8.5, 8.2, f, CINZA); } });
    blocoSecao("Comprovantes", itensLista);
    void paginasForm; void proxima;

    /* ---------- páginas de comprovante ---------- */
    const CAIXA = { x: AREA.x, y: AREA.base + 4, w: W, h: AREA.topo - 46 - AREA.base - 4 };
    const anexosPDF = [];
    for (const x of listaAnexos) {
      const { a, slot } = x;
      const fontes = [];
      if (a.tipo === "img") {
        const img = await doc.embedJpg(a.bytes);
        fontes.push({ desenhar: (p) => encaixar(p, img, img.width, img.height, (o) => p.drawImage(img, o)) });
      } else if (a.tipo === "pdf") {
        const emb = await doc.embedPdf(a.bytes, [...Array(a.doc.getPageCount()).keys()]);
        emb.forEach((e) => fontes.push({ desenhar: (p) => encaixar(p, e, e.width, e.height, (o) => p.drawPage(e, o)) }));
      } else if (a.tipo === "importado" && importado) {
        for (const idx of a.paginasOrigem) {
          const src = importado.doc.getPage(idx);
          const e = await doc.embedPage(src, { left: a.caixa.x, bottom: a.caixa.y, right: a.caixa.x + a.caixa.w, top: a.caixa.y + a.caixa.h });
          fontes.push({ desenhar: (p) => p.drawPage(e, { x: a.caixa.x, y: a.caixa.y, width: a.caixa.w, height: a.caixa.h }) });
        }
      }
      const indices = [];
      fontes.forEach((fo, k) => {
        const p = novaPagina();
        indices.push(paginas.length - 1);
        let yy = AREA.topo;
        p.drawLine({ start: { x: AREA.x, y: yy - 4 }, end: { x: AREA.x + 14, y: yy - 4 }, thickness: 1.2, color: PRETO });
        texto(p, espassar("Comprovante " + x.indice + " de " + listaAnexos.length + (fontes.length > 1 ? " · página " + (k + 1) + " de " + fontes.length : "")), AREA.x + 19, yy - 6.5, 6.6, f, CINZA, 1.2);
        texto(p, espassar(quebrar(slot.rotulo, fb, 12, W)[0]), AREA.x, yy - 23, 12, fb, PRETO, 0.8);
        texto(p, quebrar("Arquivo enviado: " + a.nome, f, 7.6, W)[0], AREA.x, yy - 36, 7.6, f, CINZA);
        caixaR(p, CAIXA.x, CAIXA.y + CAIXA.h, CAIXA.w, CAIXA.h, rgb(0.975, 0.975, 0.975));
        fo.desenhar(p);
      });
      x.paginaInicial = indices[0] + 1; x.paginaFinal = indices[indices.length - 1] + 1;
      anexosPDF.push({ slot: slot.id, nome: a.nome, paginasPDF: indices, caixa: CAIXA });
    }
    function encaixar(p, obj, w0, h0, desenhar) {
      const m = 6;
      const k = Math.min((CAIXA.w - 2 * m) / w0, (CAIXA.h - 2 * m) / h0, 1.6);
      const w = w0 * k, h = h0 * k;
      desenhar({ x: CAIXA.x + (CAIXA.w - w) / 2, y: CAIXA.y + (CAIXA.h - h) / 2, width: w, height: h });
    }

    adiados.forEach((fn) => fn());

    /* ---------- cabeçalho de todas as páginas (código e paginação) ---------- */
    const gerado = new Date(dados.geradoEm);
    const quando = gerado.toLocaleDateString("pt-BR") + " " + gerado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const cod = dados.codigo + (dados.versao > 1 ? " v" + dados.versao : "");
    paginas.forEach((p, i) => {
      const xr = A4[0] - 20 * MM, yt = A4[1] - 15 * MM;
      const l1 = limpar(cod), l2 = "GERADO EM " + quando, l3 = "PÁGINA " + (i + 1) + " DE " + paginas.length;
      texto(p, l1, xr - larg(l1, fb, 7.6), yt, 7.6, fb, PRETO);
      texto(p, l2, xr - larg(l2, f, 6.4) - 0.4 * l2.length, yt - 10, 6.4, f, CINZA, 0.4);
      texto(p, l3, xr - larg(l3, f, 6.4) - 0.4 * l3.length, yt - 19, 6.4, f, CINZA, 0.4);
    });

    /* ---------- dados embutidos para reimportar ---------- */
    const embutido = { ...dados, anexosPDF };
    doc.setTitle(dados.modelo.titulo + " · " + cod);
    doc.setSubject("Modelo de lançamento UAU");
    doc.setCreator("Modelos de lançamento DBVO");
    doc.setProducer("Modelos de lançamento DBVO");
    doc.getInfoDict().set(PDFName.of(CHAVE), PDFHexString.fromText(JSON.stringify(embutido)));
    return await doc.save();
  };
})();
