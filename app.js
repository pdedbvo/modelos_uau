/* Modelos de lançamento UAU · formulário */
(function () {
  const C = window.CONFIG;
  const app = document.getElementById("app");

  const estado = novoEstado();
  function novoEstado() {
    return {
      modeloId: null, empresa: "", cc: "",
      valores: {}, just: {},          // just[chave] = texto
      anexos: {},                      // anexos[slotId] = [arquivo]
      codigo: null, versao: 1, tentou: false,
      importado: null                  // { doc: PDFDocument } do PDF importado
    };
  }

  /* ---------------- utilidades ---------------- */
  const el = (tag, attrs = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k === "html") e.innerHTML = v;
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const f of filhos.flat()) if (f !== null && f !== undefined && f !== false) e.append(f.nodeType ? f : document.createTextNode(f));
    return e;
  };
  const moeda = (n) => (n === null || n === undefined || isNaN(n)) ? "" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtNum = (n) => n.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
  const fmtMoedaInput = (s) => { if (String(s).trim() === "") return ""; const n = num(s); return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  const modelo = () => C.modelos.find((m) => m.id === estado.modeloId);
  const vazio = (v) => v === undefined || v === null || String(v).trim() === "";
  const tamanho = (b) => b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";

  let avisoTimer;
  function aviso(msg, erro) {
    const a = document.getElementById("aviso");
    a.textContent = msg; a.className = "aviso" + (erro ? " erro" : ""); a.hidden = false;
    clearTimeout(avisoTimer); avisoTimer = setTimeout(() => (a.hidden = true), erro ? 7000 : 4500);
  }

  /* ---------------- campos visíveis e pendências ---------------- */
  function camposDoModelo(m) {
    const lista = C.cabecalho.map((c) => ({ ...c, secao: "Identificação" }));
    for (const s of m.secoes) for (const c of s.campos) lista.push({ ...c, secao: s.titulo, semSecao: s.semValor ? "sec:" + s.titulo : null, semSecaoRotulo: s.semValor });
    return lista;
  }
  /* "Não tem / sem observação": marcado, o campo não pede justificativa */
  const marcado = (chave) => !!estado.valores["__sem:" + chave];
  function dispensado(c) { return marcado(c.id) || (c.semSecao ? marcado(c.semSecao) : false); }
  function anexoDispensado(m, a) {
    if (marcado("anexo:" + a.id)) return true;
    return m.secoes.some((s) => s.semValor && (s.semAnexos || []).includes(a.id) && marcado("sec:" + s.titulo));
  }
  function caixaSem(chave, rotulo) {
    return el("label", { class: "sem" + (marcado(chave) ? " on" : "") },
      el("input", { type: "checkbox", checked: marcado(chave) ? true : null,
        onchange: (e) => { if (e.target.checked) estado.valores["__sem:" + chave] = true; else delete estado.valores["__sem:" + chave]; renderDepois(); } }),
      el("span", {}, rotulo));
  }
  function visivel(c) {
    if (!c.soSe) return true;
    return estado.valores[c.soSe.campo] === c.soSe.valor;
  }
  function linhasPreenchidas(id) {
    const m = modelo();
    const t = m && camposDoModelo(m).find((c) => c.id === id && c.tipo === "tabela");
    const cols = t ? t.colunas.filter((k) => k.tipo !== "calculado").map((k) => k.id) : null;
    return (estado.valores[id] || []).filter((l) => (cols || Object.keys(l)).some((k) => !vazio(l[k])));
  }
  /* Tudo o que está vazio e precisa de justificativa: [{chave, rotulo, secao}] */
  function pendencias() {
    const m = modelo(); if (!m) return [];
    const out = [];
    if (vazio(estado.empresa)) out.push({ chave: "empresa", rotulo: "Empresa", secao: "Identificação" });
    if (vazio(estado.cc)) out.push({ chave: "cc", rotulo: "Centro de custo", secao: "Identificação" });
    for (const c of camposDoModelo(m)) {
      if (!visivel(c)) continue;
      if (dispensado(c)) continue;
      if (c.tipo === "calculado") {
        if (c.justificarSe) { const r = calcular(c); if (r !== null && c.justificarSe(r)) out.push({ chave: c.id, rotulo: c.pergunta || c.rotulo, secao: c.secao, pergunta: c.pergunta }); }
        continue;
      }
      if (c.tipo === "tabela") {
        const n = linhasPreenchidas(c.id).length;
        if (n === 0) out.push({ chave: c.id, rotulo: c.rotulo, secao: c.secao });
        else if (c.minimoLinhas && n < c.minimoLinhas) out.push({ chave: c.id + "__minimo", rotulo: c.perguntaMinimo || ("Menos de " + c.minimoLinhas + " linhas em " + c.rotulo), secao: c.secao, pergunta: c.perguntaMinimo });
      } else if (vazio(estado.valores[c.id])) out.push({ chave: c.id, rotulo: c.rotulo, secao: c.secao });
    }
    for (const a of m.anexos) {
      if (!(estado.anexos[a.id] || []).length && !anexoDispensado(m, a)) out.push({ chave: "anexo:" + a.id, rotulo: a.rotulo, secao: "Comprovantes", anexo: true });
    }
    return out;
  }
  function faltando() { return pendencias().filter((p) => vazio(estado.just[p.chave])); }

  /* ---------------- render ---------------- */
  let renderAgendado = null;
  let renderizando = false;
  function renderDepois() { if (renderizando) return; clearTimeout(renderAgendado); renderAgendado = setTimeout(render, 0); }
  function render() {
    clearTimeout(renderAgendado);
    const rolagem = window.scrollY;
    const ativo = document.activeElement;
    const foco = ativo && ativo.dataset && ativo.dataset.k ? { k: ativo.dataset.k, a: ativo.selectionStart, b: ativo.selectionEnd } : null;
    renderizando = true;
    app.innerHTML = "";
    app.append(passoModelo());
    const m = modelo();
    if (m) {
      app.append(passoIdentificacao(m));
      app.append(passoFormulario(m));
      app.append(passoComprovantes(m));
      app.append(barra());
      app.append(listasSugestao());
    }
    window.scrollTo(0, rolagem);
    renderizando = false;
    if (foco) {
      const novo = app.querySelector('[data-k="' + CSS.escape(foco.k) + '"]');
      if (novo) { novo.focus({ preventScroll: true }); try { if (foco.a !== null && foco.a !== undefined) novo.setSelectionRange(foco.a, foco.b); } catch (e) {} }
    }
  }

  /* ---------------- sugestões do cadastro ---------------- */
  const CAD = window.Cadastro;
  function listasSugestao() {
    const mk = (id, vals) => el("datalist", { id: "dl-" + id }, vals.map((v) => el("option", { value: v })));
    return el("div", { hidden: true },
      mk("fornecedor", CAD.fornecedores()), mk("item", CAD.itens()), mk("planejamento", CAD.planejamentos()),
      mk("contrato", CAD.contratos(estado.empresa)));
  }
  const listaDe = (id) => C.sugestoes[id] ? "dl-" + C.sugestoes[id] : null;
  function vaziaTabela(id) { return linhasPreenchidas(id).length === 0; }
  function preencherPorContrato() {
    const m = modelo(), v = estado.valores;
    if (!m || !v.numContrato) return;
    const ct = CAD.contrato(estado.empresa, v.numContrato);
    if (!ct) return;
    const usados = [];
    const por = (k, val) => { if (vazio(v[k]) && !vazio(val)) { v[k] = typeof val === "number" ? fmtMoedaInput(String(val).replace(".", ",")) : val; usados.push(k); } };
    por("fornecedor", ct.fornecedor); por("cnpj", ct.cnpj); por("objeto", ct.objeto);
    if (m.id === "medicao") {
      por("valorContrato", ct.valorContrato);
      const meds = ct.medicoes || {};
      const atual = String(v.numMedicao || "").trim();
      const anterior = Object.entries(meds).filter(([n]) => n !== atual && (!atual || isNaN(+n) || isNaN(+atual) || +n < +atual)).reduce((t, [, val]) => t + num(val), 0);
      if (anterior) por("medidoAnterior", fmtMoedaInput(String(anterior.toFixed(2)).replace(".", ",")));
      if (vaziaTabela("itens") && (ct.itens || []).length) { v.itens = ct.itens.map((l) => ({ item: l.item, unid: l.unid, preco: l.preco })); usados.push("itens"); }
    }
    if (m.id === "aditivo") por("valorAntesContrato", ct.valorContrato);
    if (usados.length) aviso("Preenchi com os dados do contrato " + ct.numContrato + " que já estavam no cadastro. Confira antes de gerar.");
  }
  function preencherPorFornecedor() {
    const f = CAD.fornecedor(estado.valores.fornecedor);
    if (f && f.cnpj && vazio(estado.valores.cnpj)) estado.valores.cnpj = f.cnpj;
  }
  function preencherLinha(l, colId) {
    const it = CAD.item(l[colId]);
    if (!it) return;
    if (vazio(l.unid) && it.unid) l.unid = it.unid;
    if (vazio(l.insumo) && it.insumo) l.insumo = it.insumo;
    if ("preco" in l || true) { if (vazio(l.preco) && it.preco && modelo().id !== "aditivo") l.preco = it.preco; }
  }

  function passoModelo() {
    return el("section", { class: "passo", id: "comecar" },
      el("div", { class: "eyebrow" }, "Passo 1"),
      el("h2", {}, "Qual é o lançamento?"),
      el("div", { class: "cards" }, C.modelos.map((m) =>
        el("button", { class: "card" + (estado.modeloId === m.id ? " ativo" : ""), type: "button",
          onclick: () => trocarModelo(m.id) },
          el("div", { class: "card-ic" }, m.sigla),
          el("div", { class: "card-t" }, m.nome),
          el("div", { class: "card-d" }, m.descricao))))
    );
  }

  function trocarModelo(id) {
    if (estado.modeloId === id) return;
    const temDados = Object.keys(estado.valores).length || Object.keys(estado.anexos).some((k) => estado.anexos[k].length);
    if (temDados && estado.modeloId && !confirmarTroca()) return;
    const emp = estado.empresa, cc = estado.cc, cab = {};
    for (const c of C.cabecalho) if (estado.valores[c.id] !== undefined) cab[c.id] = estado.valores[c.id];
    Object.assign(estado, novoEstado(), { modeloId: id, empresa: emp, cc: cc, valores: cab });
    render();
  }
  let trocaPendente = false;
  function confirmarTroca() {
    if (trocaPendente) { trocaPendente = false; return true; }
    trocaPendente = true; setTimeout(() => (trocaPendente = false), 5000);
    aviso("Trocar de modelo apaga o que foi preenchido (menos a identificação). Clique de novo para confirmar.");
    return false;
  }

  function empresaAtual() { return C.empresas.find((e) => e.sufixo === estado.empresa); }
  function rotuloEmpresa(e) { return (e.codigo ? e.codigo + " · " : "") + e.nome; }
  function centrosDa(empresa) {
    if (!empresa) return [];
    const base = C.centrosDeCusto.filter((c) => !(empresa.sem || []).includes(c.prefixo)).map((c) => ({ ...c, cod: c.prefixo + empresa.sufixo }));
    return base.concat((empresa.extras || []).map((x) => ({ ...x, cod: x.codigo })));
  }
  function abrirOutras() {
    const fechar = () => fundo.remove();
    const lista = el("div", { class: "lista-outras" });
    const busca = el("input", { type: "text", placeholder: "Buscar empresa ou final…", oninput: () => desenhar() });
    function desenhar() {
      const q = busca.value.trim().toLowerCase();
      lista.innerHTML = "";
      C.empresas.filter((e) => !e.principal && (!q || rotuloEmpresa(e).toLowerCase().includes(q))).forEach((e) =>
        lista.append(el("button", { type: "button", class: "item-outra", onclick: () => { estado.empresa = e.sufixo; estado.cc = ""; fechar(); render(); } }, rotuloEmpresa(e))));
      if (!lista.children.length) lista.append(el("p", { class: "dica" }, "Nenhuma empresa encontrada."));
    }
    const fundo = el("div", { class: "modal-fundo", onclick: (e) => { if (e.target === fundo) fechar(); } },
      el("div", { class: "modal", role: "dialog", "aria-label": "Outras empresas" },
        el("div", { class: "modal-topo" }, el("h2", {}, "Outras empresas"), el("button", { class: "x", type: "button", "aria-label": "Fechar", onclick: fechar }, "×")),
        el("p", { class: "dica" }, "Empresas que ainda não usamos no dia a dia."), busca, lista));
    document.body.append(fundo); desenhar(); busca.focus();
  }

  function passoIdentificacao(m) {
    const empresa = empresaAtual();
    const ccs = centrosDa(empresa);
    const ccSel = ccs.find((c) => c.cod === estado.cc);
    const sug = ccSel && ccSel.sugerir && ccSel.sugerir !== m.id ? C.modelos.find((x) => x.id === ccSel.sugerir) : null;

    const grade = el("div", { class: "grade" },
      campoBox({ id: "empresa", rotulo: "Empresa", meia: true }, el("select", { onchange: (e) => {
          if (e.target.value === "__outras") { e.target.value = estado.empresa; abrirOutras(); return; }
          estado.empresa = e.target.value; estado.cc = ""; render(); } },
        el("option", { value: "" }, "Escolha…"),
        C.empresas.filter((e) => e.principal || e.sufixo === estado.empresa).map((e) => el("option", { value: e.sufixo, selected: e.sufixo === estado.empresa }, rotuloEmpresa(e))),
        el("option", { value: "__outras" }, "Outras empresas…")), "empresa"),
      campoBox({ id: "cc", rotulo: "Centro de custo", uau: "Obra", meia: true }, el("select", { disabled: !empresa, onchange: (e) => { estado.cc = e.target.value; render(); } },
        el("option", { value: "" }, empresa ? "Escolha…" : "Escolha a empresa primeiro"),
        ccs.map((c) => el("option", { value: c.cod, selected: c.cod === estado.cc }, c.cod + " · " + c.nome))), "cc"),
      C.cabecalho.filter(visivel).map((c) => campo(c))
    );
    return el("section", { class: "passo" },
      el("div", { class: "eyebrow" }, "Passo 2"),
      el("h2", {}, "Identificação", estado.versao > 1 ? el("span", { class: "versao" }, "editando v" + estado.versao) : null),
      el("p", { class: "dica-anexar" }, m.anexarEm),
      el("div", { class: "bloco" }, grade,
        sug ? el("div", { class: "sugestao" }, el("span", {}, "Pagamentos de " + ccSel.nome.toLowerCase() + " costumam usar o modelo \"" + sug.nome + "\"."),
          el("button", { class: "btn btn-claro btn-pequeno", type: "button", onclick: () => trocarModelo(sug.id) }, "Usar " + sug.nome)) : null)
    );
  }

  function passoFormulario(m) {
    const sec = el("section", { class: "passo" }, el("div", { class: "eyebrow" }, "Passo 3"), el("h2", {}, m.titulo));
    let i = 0;
    while (i < m.secoes.length) {
      const s = m.secoes[i], prox = m.secoes[i + 1];
      if (s.meia && prox && prox.meia) { sec.append(el("div", { class: "duas" }, blocoSecao(s), blocoSecao(prox))); i += 2; }
      else { sec.append(blocoSecao(s)); i++; }
    }
    return sec;
  }
  function blocoSecao(s) {
    const secOff = s.semValor && marcado("sec:" + s.titulo);
    return el("div", { class: "bloco" },
      el("div", { class: "bloco-topo" }, el("h2", {}, s.titulo), s.semValor ? caixaSem("sec:" + s.titulo, s.semValor) : null),
      el("div", { class: "grade" + (secOff ? " dispensada" : "") }, s.campos.filter(visivel).map((c) => {
        const box = campo(c, s.meia);
        if (c.semValor && box && box.append) {
          if (marcado(c.id)) box.classList.add("dispensada");
          box.append(caixaSem(c.id, c.semValor));
        }
        return box;
      })));
  }

  function campoBox(c, controle, chaveJust) {
    return el("div", { class: "campo" + (c.meia ? " meia" : "") },
      el("label", { class: "rotulo" }, c.rotulo, c.uau && c.uau !== c.rotulo ? el("span", { class: "uau" }, " · UAU: " + c.uau) : null),
      controle,
      c.dica ? el("span", { class: "dica" }, c.dica) : null,
      chaveJust ? justificativa(chaveJust) : null);
  }

  function justificativa(chave, pergunta) {
    const p = pendencias().find((x) => x.chave === chave);
    if (!p) return null;
    const falta = vazio(estado.just[chave]);
    if (!estado.tentou && falta && !pergunta && !p.pergunta) return null;
    return el("div", { class: "just" + (estado.tentou && falta ? " falta" : "") },
      el("label", { class: "rotulo" }, p.pergunta || pergunta || "Por que ficou em branco?"),
      el("textarea", { rows: 2, "data-k": "j:" + chave, oninput: (e) => { estado.just[chave] = e.target.value; atualizarBarra(e.target.closest(".just")); } }, estado.just[chave] || ""));
  }

  /* ---------------- data: digitar dd/mm/aaaa ou abrir o calendário ---------------- */
  function isoParaBr(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v.split("-").reverse().join("/") : ""; }
  function brParaIso(t) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t || "");
    if (!m) return "";
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? m[3] + "-" + m[2] + "-" + m[1] : "";
  }
  function mascaraData(t) {
    const d = t.replace(/\D/g, "").slice(0, 8);
    return d.length > 4 ? d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4) : d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  }
  function campoData(valor, set, extra) {
    const cal = el("input", { type: "date", class: "data-cal", tabindex: "-1", "aria-hidden": "true", value: valor || "",
      onchange: (e) => { set(e.target.value); renderDepois(); } });
    const txt = el("input", Object.assign({ type: "text", inputmode: "numeric", placeholder: "dd/mm/aaaa", maxlength: 10, autocomplete: "off", value: isoParaBr(valor),
      oninput: (e) => { const t = mascaraData(e.target.value); e.target.value = t; set(brParaIso(t)); },
      onblur: (e) => { if (e.target.value && !brParaIso(e.target.value)) { aviso("Data incompleta ou inválida. Use dd/mm/aaaa, ex.: 05/11/2026."); } renderDepois(); } }, extra || {}));
    const bt = el("button", { type: "button", class: "data-bt", "aria-label": "Abrir calendário",
      onclick: () => { try { cal.showPicker(); } catch (e) { cal.focus(); cal.click(); } } }, "📅");
    return el("div", { class: "data" }, txt, bt, cal);
  }

  function campo(c, kv) {
    const v = estado.valores[c.id];
    const set = (val) => { estado.valores[c.id] = val; };
    let ctl;
    switch (c.tipo) {
      case "textoLongo":
        ctl = el("textarea", { rows: 3, oninput: (e) => { set(e.target.value); recalcular(); }, onblur: () => { if (estado.tentou) renderDepois(); } }, v || ""); break;
      case "data":
        ctl = campoData(v, set, { "data-k": c.id }); break;
      case "moeda":
        ctl = el("input", { type: "text", inputmode: "decimal", placeholder: "0,00", value: v || "",
          oninput: (e) => { set(e.target.value); recalcular(); },
          onblur: (e) => { const f = fmtMoedaInput(e.target.value); e.target.value = f; set(f); recalcular(); renderDepois(); } }); break;
      case "numero":
        ctl = el("input", { type: "text", inputmode: "decimal", value: v || "", oninput: (e) => { set(e.target.value); recalcular(); }, onblur: () => renderDepois() }); break;
      case "opcao":
        ctl = el("select", { onchange: (e) => { set(e.target.value); render(); } }, el("option", { value: "" }, "Escolha…"),
          c.opcoes.map((o) => el("option", { value: o, selected: o === v }, o))); break;
      case "calculado":
        ctl = el("div", { class: "calc" + (c.destaque ? " destaque" : ""), "data-calc": c.id }, formatarCalc(c, calcular(c))); break;
      case "tabela":
        return campoTabela(c);
      default:
        ctl = el("input", { type: "text", value: v || "", list: listaDe(c.id), autocomplete: listaDe(c.id) ? "off" : null,
          oninput: (e) => { set(e.target.value); },
          onblur: () => { if (c.id === "numContrato" || c.id === "numMedicao") preencherPorContrato(); if (c.id === "fornecedor") preencherPorFornecedor(); renderDepois(); } });
    }
    if (ctl.setAttribute && !ctl.classList.contains("data")) ctl.setAttribute("data-k", c.id);
    return campoBox(c, ctl, c.tipo === "calculado" && !c.justificarSe ? null : c.id);
  }

  function materializar() {
    const m = modelo(); if (!m) return;
    for (const c of camposDoModelo(m)) if (c.tipo === "tabela")
      for (const l of estado.valores[c.id] || []) for (const k of c.colunas) if (k.tipo === "calculado") { try { l[k.id] = k.calculo(l); } catch (e) {} }
  }
  function calcular(c, linha) {
    if (!linha) materializar();
    try { const r = c.calculo(linha || estado.valores); return r; } catch (e) { return null; }
  }
  function formatarCalc(c, r) {
    if (r === null || r === undefined || r === "") return "—";
    if (c.formato === "moeda") return moeda(r);
    if (c.formato === "porcentagem") return isFinite(r) ? r.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : "—";
    if (typeof r === "number") return fmtNum(r);
    return String(r);
  }
  function recalcular() {
    const m = modelo(); if (!m) return;
    for (const c of camposDoModelo(m)) {
      if (c.tipo === "calculado") { const d = app.querySelector('[data-calc="' + c.id + '"]'); if (d) d.textContent = formatarCalc(c, calcular(c)); }
      if (c.tipo === "tabela") {
        const linhas = estado.valores[c.id] || [];
        linhas.forEach((l, i) => c.colunas.filter((k) => k.tipo === "calculado").forEach((k) => {
          const d = app.querySelector('[data-calc="' + c.id + "." + i + "." + k.id + '"]');
          if (d) d.textContent = formatarCalc(k, calcular(k, l));
        }));
        const t = app.querySelector('[data-total="' + c.id + '"]');
        if (t) t.textContent = "Total " + moeda(totalTabela(c));
      }
    }
  }
  function valorCelula(col, linha) { return col.tipo === "calculado" ? calcular(col, linha) : linha[col.id]; }
  function totalTabela(c) {
    const col = c.colunas.find((k) => k.id === c.total);
    return (estado.valores[c.id] || []).reduce((t, l) => t + num(valorCelula(col, l)), 0);
  }

  function campoTabela(c) {
    if (!estado.valores[c.id]) estado.valores[c.id] = [{}];
    const linhas = estado.valores[c.id];
    const tabela = el("table", { class: "tab" },
      el("thead", {}, el("tr", {}, c.colunas.map((k) => el("th", { class: ["moeda", "numero", "calculado"].includes(k.tipo) ? "num" : "", style: "width:" + (k.largura || 1) * 10 + "%" }, k.rotulo)), el("th", { style: "width:34px" }))),
      el("tbody", {}, linhas.map((l, i) => el("tr", {},
        c.colunas.map((k) => el("td", { class: ["moeda", "numero", "calculado"].includes(k.tipo) ? "num" : "" }, celula(c, k, l, i))),
        el("td", {}, el("button", { class: "x", type: "button", title: "Tirar linha", "aria-label": "Tirar linha", onclick: () => { linhas.splice(i, 1); if (!linhas.length) linhas.push({}); render(); } }, "×"))))));
    const n = linhasPreenchidas(c.id).length;
    const chaveMin = c.minimoLinhas && n > 0 && n < c.minimoLinhas ? c.id + "__minimo" : null;
    return el("div", { class: "campo" },
      el("label", { class: "rotulo" }, c.rotulo, c.uau ? el("span", { class: "uau" }, " · UAU: " + c.uau) : null),
      el("div", { class: "tabela-wrap" }, tabela),
      el("div", { class: "tab-acoes" },
        el("button", { class: "btn btn-borda btn-pequeno", type: "button", onclick: () => { linhas.push({}); render(); } }, "+ Linha"),
        c.minimoLinhas ? el("span", { class: "dica" }, n + " de " + c.minimoLinhas + " recomendadas") : null,
        c.total ? el("span", { class: "tab-total", "data-total": c.id }, "Total " + moeda(totalTabela(c))) : null),
      n === 0 ? justificativa(c.id) : null,
      chaveMin ? justificativa(chaveMin, c.perguntaMinimo) : null);
  }
  function celula(c, k, l, i) {
    if (k.tipo === "data") return campoData(l[k.id], (val) => { l[k.id] = val; }, { "data-k": c.id + "." + i + "." + k.id, "aria-label": k.rotulo });
    if (k.tipo === "calculado") return el("div", { class: "calc", "data-calc": c.id + "." + i + "." + k.id }, formatarCalc(k, calcular(k, l)));
    const tipo = k.tipo === "data" ? "date" : "text";
    return el("input", { "data-k": c.id + "." + i + "." + k.id, type: tipo, value: l[k.id] || "", list: listaDe(k.id), autocomplete: listaDe(k.id) ? "off" : null, inputmode: ["moeda", "numero"].includes(k.tipo) ? "decimal" : null,
      placeholder: k.tipo === "moeda" ? "0,00" : null, "aria-label": k.rotulo,
      oninput: (e) => { l[k.id] = e.target.value; recalcular(); },
      onblur: (e) => { if (k.tipo === "moeda") { l[k.id] = fmtMoedaInput(e.target.value); e.target.value = l[k.id]; } if (C.sugestoes[k.id] === "item") preencherLinha(l, k.id); recalcular(); renderDepois(); },
      onchange: k.tipo === "data" ? () => renderDepois() : null });
  }

  /* ---------------- comprovantes ---------------- */
  function passoComprovantes(m) {
    const cfg = C.comprovantes;
    const slots = [...m.anexos, { id: "outros", rotulo: "Outros comprovantes", opcional: true }];
    return el("section", { class: "passo" },
      el("div", { class: "eyebrow" }, "Passo 4"),
      el("h2", {}, "Comprovantes"),
      el("p", { class: "dica-anexar" }, "Cada arquivo vira uma página do PDF. Nada é enviado para a internet: tudo fica no seu computador."),
      el("div", { class: "bloco" },
        slots.map((s) => {
          const lista = estado.anexos[s.id] || [];
          const inp = el("input", { type: "file", accept: cfg.formatos, multiple: true, hidden: true, onchange: (e) => adicionarArquivos(s.id, e.target.files) });
          return el("div", { class: "slot" },
            el("div", { class: "slot-topo" },
              el("span", { class: "slot-t" }, s.rotulo),
              el("div", { class: "slot-acoes" },
                s.semValor ? caixaSem("anexo:" + s.id, s.semValor) : null,
                el("label", { class: "btn btn-borda btn-pequeno" }, "+ Anexar", inp))),
            !lista.length && !marcado("anexo:" + s.id) && anexoDispensado(modelo(), s) ? el("div", { class: "dica" }, "Marcado como sem nota fiscal na seção Nota fiscal.") : null,
            lista.length ? el("ul", { class: "arquivos" }, lista.map((a, i) => el("li", {},
              el("span", { class: "nome", title: a.nome }, a.nome),
              el("span", { class: "meta" }, (a.paginas > 1 ? a.paginas + " páginas · " : "") + (a.importado ? "do PDF importado" : tamanho(a.bytes.length))),
              el("button", { class: "x", type: "button", title: "Tirar arquivo", "aria-label": "Tirar arquivo", onclick: () => { lista.splice(i, 1); render(); } }, "×")))) : null,
            s.opcional ? null : justificativa("anexo:" + s.id, "Por que não vai anexar?"));
        }),
        el("div", { class: "formatos" }, "Aceita PDF, JPG, PNG, WEBP, GIF, BMP e HEIC (foto do iPhone). Word, Excel e e-mail: abra o arquivo e use Salvar como PDF, ou mande um print."))
    );
  }

  async function adicionarArquivos(slot, files) {
    const lista = (estado.anexos[slot] = estado.anexos[slot] || []);
    for (const f of files) {
      try {
        aviso("Preparando " + f.name + "…");
        const a = await prepararArquivo(f);
        lista.push(a);
      } catch (e) {
        aviso(f.name + ": " + e.message, true);
      }
    }
    render();
    const total = Object.values(estado.anexos).flat().reduce((t, a) => t + (a.bytes ? a.bytes.length : 0), 0);
    if (total > C.comprovantes.limiteMB * 1048576) aviso("Os comprovantes somam " + tamanho(total) + ". O limite do PDF é " + C.comprovantes.limiteMB + " MB.", true);
  }

  async function prepararArquivo(f) {
    const nome = f.name;
    const ext = (nome.split(".").pop() || "").toLowerCase();
    const tipo = f.type;
    if (ext === "pdf" || tipo === "application/pdf") {
      const bytes = new Uint8Array(await f.arrayBuffer());
      let doc;
      try { doc = await PDFLib.PDFDocument.load(bytes); }
      catch (e) {
        if (/encrypt/i.test(e.message)) throw new Error("PDF protegido por senha. Mande um print da página.");
        throw new Error("não consegui abrir este PDF. Mande um print da página.");
      }
      return { nome, tipo: "pdf", bytes, doc, paginas: doc.getPageCount() };
    }
    if (["doc", "docx", "xls", "xlsx", "msg", "eml", "zip", "rar", "ppt", "pptx", "txt", "csv"].includes(ext))
      throw new Error("formato não aceito. Abra o arquivo e use Salvar como PDF, ou mande um print.");
    let blob = f;
    if (ext === "heic" || ext === "heif" || /hei[cf]/.test(tipo)) {
      await carregarScript("lib/heic2any.min.js");
      const r = await window.heic2any({ blob: f, toType: "image/jpeg", quality: 0.9 });
      blob = Array.isArray(r) ? r[0] : r;
    }
    const bytes = await comprimirImagem(blob);
    return { nome, tipo: "img", bytes, paginas: 1 };
  }

  function carregarScript(src) {
    if (document.querySelector('script[src="' + src + '"]')) return Promise.resolve();
    return new Promise((ok, falha) => { const s = el("script", { src }); s.onload = ok; s.onerror = () => falha(new Error("não consegui carregar o conversor")); document.head.append(s); });
  }

  async function comprimirImagem(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((ok, falha) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error("não consegui abrir esta imagem.")); i.src = url; });
      const max = C.comprovantes.larguraMaxImagem;
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
      const out = await new Promise((ok) => cv.toBlob(ok, "image/jpeg", C.comprovantes.qualidadeImagem));
      return new Uint8Array(await out.arrayBuffer());
    } finally { URL.revokeObjectURL(url); }
  }

  /* ---------------- barra e geração ---------------- */
  function barra() {
    return el("div", { class: "barra" }, el("div", { class: "barra-in" },
      el("div", { class: "status", id: "status" }, textoStatus()),
      el("button", { class: "btn", type: "button", id: "btnGerar", onclick: gerar }, "Gerar PDF")));
  }
  function textoStatus() {
    const p = pendencias(), f = faltando();
    if (!p.length) return el("span", {}, el("b", {}, "Tudo preenchido."), " Pode gerar o PDF.");
    if (!f.length) return el("span", {}, el("b", {}, p.length + " campo(s) em branco, todos justificados."), " Pode gerar o PDF.");
    return el("span", {}, el("b", {}, f.length + " campo(s) em branco sem justificativa."), estado.tentou ? " Escreva o porquê em cada um." : " Ao gerar, vamos pedir o porquê.");
  }
  function atualizarBarra(justEl) {
    const s = document.getElementById("status"); if (s) { s.innerHTML = ""; s.append(textoStatus()); }
    if (justEl && estado.tentou) justEl.classList.toggle("falta", vazio(justEl.querySelector("textarea").value));
  }

  async function gerar() {
    const m = modelo();
    estado.tentou = true;
    const f = faltando();
    if (f.length) {
      render();
      const alvo = app.querySelector(".just.falta textarea");
      if (alvo) { alvo.scrollIntoView({ behavior: "smooth", block: "center" }); alvo.focus({ preventScroll: true }); }
      aviso("Faltam " + f.length + " justificativa(s): " + f.slice(0, 3).map((p) => p.rotulo).join(", ") + (f.length > 3 ? "…" : ""), true);
      return;
    }
    const btn = document.getElementById("btnGerar"); btn.disabled = true; btn.textContent = "Gerando…";
    try {
      if (!estado.codigo) estado.codigo = novoCodigo(m);
      const dados = montarDados(m);
      const bytes = await window.gerarPDF(dados, estado.anexos, estado.importado);
      const nome = (nomeArquivo(m) || estado.codigo) + (estado.versao > 1 ? "-v" + estado.versao : "") + ".pdf";
      baixar(bytes, nome);
      try {
        const calc = (id) => { const c = camposDoModelo(m).find((x) => x.id === id); return c ? calcular(c) : null; };
        CAD.aprender({ modelo: m.id, empresa: estado.empresa, valores: estado.valores,
          totalItens: (() => { const c = camposDoModelo(m).find((x) => x.id === "itens"); return c && c.total ? totalTabela(c) : null; })(), medidoAgora: calc("medidoAgora"), valorDepois: calc("valorDepoisContrato") });
      } catch (e) { console.warn(e); }
      if (bytes.length > C.comprovantes.limiteMB * 1048576) {
        const pesado = Object.values(estado.anexos).flat().filter((a) => a.bytes).sort((a, b) => b.bytes.length - a.bytes.length)[0];
        aviso("O PDF ficou com " + tamanho(bytes.length) + ", acima de " + C.comprovantes.limiteMB + " MB." + (pesado ? " O mais pesado é " + pesado.nome + " (" + tamanho(pesado.bytes.length) + ")." : ""), true);
      } else aviso("Pronto: " + nome + " (" + tamanho(bytes.length) + "). Agora é só anexar no UAU.");
    } catch (e) {
      console.error(e);
      aviso("Não consegui gerar o PDF: " + e.message, true);
    } finally { btn.disabled = false; btn.textContent = "Gerar PDF"; }
  }

  function novoCodigo(m) {
    const ano = new Date().getFullYear();
    const sufixo = Array.from(crypto.getRandomValues(new Uint8Array(3))).map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
    return [m.sigla, estado.cc || "SEMCC", ano, sufixo].join("-");
  }

  function montarDados(m) {
    const empresa = empresaAtual();
    const ccCfg = centrosDa(empresa).find((c) => c.cod === estado.cc);
    const pend = pendencias().map((p) => ({ rotulo: p.rotulo, secao: p.secao, justificativa: estado.just[p.chave], anexo: !!p.anexo, chave: p.chave }));
    const fmtVal = (c, v) => {
      if (marcado(c.id)) return c.semValor;
      if (c.tipo === "calculado") return formatarCalc(c, calcular(c));
      if (vazio(v)) return "";
      if (c.tipo === "data") return v.split("-").reverse().join("/");
      if (c.tipo === "moeda") return moeda(num(v));
      return String(v);
    };
    const secoes = [];
    secoes.push({ titulo: "Identificação", campos: [
      { rotulo: "Empresa", valor: empresa ? (empresa.codigo ? empresa.codigo + " · " : "") + empresa.nome : "", meia: true },
      { rotulo: "Centro de custo (obra UAU)", valor: ccCfg ? estado.cc + " · " + ccCfg.nome : "", meia: true },
      ...C.cabecalho.filter(visivel).map((c) => ({ rotulo: c.rotulo, valor: fmtVal(c, estado.valores[c.id]), meia: c.meia }))
    ]});
    for (const s of m.secoes) {
      const campos = [];
      if (s.semValor && marcado("sec:" + s.titulo)) { secoes.push({ titulo: s.titulo, meia: s.meia, campos: [{ rotulo: s.titulo, valor: s.semValor }] }); continue; }
      for (const c of s.campos) {
        if (!visivel(c)) continue;
        if (c.tipo === "tabela") {
          const linhas = linhasPreenchidas(c.id);
          campos.push({ tabela: true, rotulo: c.rotulo,
            colunas: c.colunas.map((k) => ({ rotulo: k.rotulo, largura: k.largura || 1, direita: ["moeda", "numero", "calculado"].includes(k.tipo) })),
            linhas: linhas.map((l) => c.colunas.map((k) => {
              const v = valorCelula(k, l);
              if (k.tipo === "calculado") return formatarCalc(k, v);
              if (vazio(v)) return "";
              if (k.tipo === "moeda") return moeda(num(v));
              if (k.tipo === "data") return v.split("-").reverse().join("/");
              return String(v);
            })),
            total: c.total ? moeda(totalTabela(c)) : null });
        } else campos.push({ rotulo: c.rotulo, valor: fmtVal(c, estado.valores[c.id]), meia: c.meia, longo: c.tipo === "textoLongo", destaque: c.destaque });
      }
      secoes.push({ titulo: s.titulo, meia: s.meia, campos });
    }
    return {
      formato: "dbvo-modelo-lancamento", versaoConfig: C.versaoConfig,
      codigo: estado.codigo, versao: estado.versao, geradoEm: new Date().toISOString(),
      modelo: { id: m.id, titulo: m.titulo, nome: m.nome },
      anexosCfg: [...m.anexos, { id: "outros", rotulo: "Outros comprovantes" }],
      anexosSem: m.anexos.filter((a) => !(estado.anexos[a.id] || []).length && anexoDispensado(m, a)).map((a) => ({ rotulo: a.rotulo,
        motivo: marcado("anexo:" + a.id) ? a.semValor : (m.secoes.find((s) => (s.semAnexos || []).includes(a.id) && marcado("sec:" + s.titulo)) || {}).semValor })),
      pendencias: pend, secoes,
      bruto: { modeloId: m.id, empresa: estado.empresa, cc: estado.cc, valores: estado.valores, just: estado.just }
    };
  }

  /* Nome do arquivo: <empresa>-<números do UAU>-<FORNECEDOR>-<MMAAAA>; espaço vira "_".
     Empresa: BE + final (BE06); BK e BO usam só o final. */
  function nomeArquivo(m) {
    const v = estado.valores, emp = empresaAtual();
    const limpa = (t) => String(t || "").trim().replace(/[\\/:*?"<>|#%]+/g, "").replace(/\s+/g, "_");
    const suf = emp ? String(emp.sufixo || "") : "";
    const prefixo = suf ? (/^\d+$/.test(suf) ? "BE" + suf : suf) : "BE";
    const hoje = new Date().toISOString().slice(0, 10);
    let nums, data;
    if (m.id === "medicao") { nums = ["CT" + limpa(v.numContrato), "MED" + limpa(v.numMedicao)]; data = v.periodoFim || v.periodoInicio; }
    else if (m.id === "aditivo") { nums = ["CT" + limpa(v.numContrato), "ADT" + limpa(v.numAditivo)]; data = null; }
    else if (m.id === "cotacao") { nums = ["COT" + limpa(v.numCotacao)]; data = null; }
    else if (m.id === "contrato") { nums = ["CT" + limpa(v.numContrato)]; data = v.vigenciaInicio; }
    else { nums = ["NSE" + limpa(v.numProcesso)]; data = v.vencimento; }
    data = data || hoje;
    return [prefixo, ...nums, limpa(v.fornecedor), data.slice(5, 7) + data.slice(0, 4)].filter(Boolean).join("-");
  }
  function baixar(bytes, nome) {
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = el("a", { href: url, download: nome }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  /* ---------------- importar para editar ---------------- */
  document.getElementById("inpImportar").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const doc = await PDFLib.PDFDocument.load(bytes);
      const dados = window.lerDadosPDF(doc);
      if (!dados || dados.formato !== "dbvo-modelo-lancamento") throw new Error("este PDF não foi gerado pela plataforma.");
      const b = dados.bruto;
      if (!C.modelos.find((m) => m.id === b.modeloId)) throw new Error("o modelo deste PDF não existe mais.");
      Object.assign(estado, novoEstado(), {
        modeloId: b.modeloId, empresa: b.empresa, cc: b.cc, valores: b.valores || {}, just: b.just || {},
        codigo: dados.codigo, versao: (dados.versao || 1) + 1, importado: { doc }
      });
      for (const a of dados.anexosPDF || []) {
        (estado.anexos[a.slot] = estado.anexos[a.slot] || []).push({ nome: a.nome, tipo: "importado", importado: true, paginasOrigem: a.paginasPDF, caixa: a.caixa, paginas: a.paginasPDF.length });
      }
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      aviso("PDF importado. Ao gerar de novo, ele sai como " + estado.codigo + " v" + estado.versao + ".");
    } catch (err) {
      console.error(err);
      aviso("Não consegui importar: " + err.message, true);
    }
  });

  render();
  CAD.carregar().then(() => render());
})();
