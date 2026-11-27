/* Modelos de lançamento UAU · cadastro compartilhado (Firebase sharepoint-studio)
   Guarda só dados de cadastro (fornecedor, CNPJ, itens, planejamentos e contratos)
   para sugerir e preencher nas próximas vezes. Comprovantes nunca vão para cá.
   Se o banco estiver fora do ar, a plataforma continua funcionando sem sugestões. */
(function () {
  const B = window.CONFIG.banco;
  const BASE = "https://firestore.googleapis.com/v1/projects/" + B.projeto + "/databases/(default)/documents/" + B.colecao;
  const CACHE = "modelos-lancamento:cadastro:v1";
  let dados = { fornecedor: [], item: [], planejamento: [], contrato: [] };

  /* ---------- conversão Firestore ---------- */
  function para(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === "boolean") return { booleanValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(para) } };
    if (typeof v === "object") { const f = {}; for (const k in v) f[k] = para(v[k]); return { mapValue: { fields: f } }; }
    return { stringValue: String(v) };
  }
  function de(v) {
    if (!v) return null;
    if ("stringValue" in v) return v.stringValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return v.doubleValue;
    if ("booleanValue" in v) return v.booleanValue;
    if ("nullValue" in v) return null;
    if ("timestampValue" in v) return v.timestampValue;
    if ("arrayValue" in v) return (v.arrayValue.values || []).map(de);
    if ("mapValue" in v) { const o = {}, f = v.mapValue.fields || {}; for (const k in f) o[k] = de(f[k]); return o; }
    return null;
  }
  const norm = (s) => String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
  function idDe(prefixo, ...partes) {
    const s = norm(partes.join("|"));
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return prefixo + "_" + (h >>> 0).toString(36);
  }

  function organizar(docs) {
    const d = { fornecedor: [], item: [], planejamento: [], contrato: [] };
    for (const x of docs) if (d[x.tipo]) d[x.tipo].push(x);
    return d;
  }

  async function carregar() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE) || "null");
      if (c) dados = c.d;
      if (c && Date.now() - c.t < 5 * 60000) return dados;
    } catch (e) {}
    try {
      const todos = [];
      let token = "";
      for (let i = 0; i < 10; i++) {
        const r = await fetch(BASE + "?pageSize=300&key=" + B.chave + (token ? "&pageToken=" + token : ""));
        if (!r.ok) throw new Error(r.status);
        const j = await r.json();
        for (const doc of j.documents || []) { const o = {}; for (const k in doc.fields || {}) o[k] = de(doc.fields[k]); o._id = doc.name.split("/").pop(); todos.push(o); }
        if (!j.nextPageToken) break; token = j.nextPageToken;
      }
      dados = organizar(todos);
      try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), d: dados })); } catch (e) {}
    } catch (e) { console.warn("Cadastro indisponível:", e.message); }
    return dados;
  }

  async function gravar(id, obj, campos) {
    const mask = (campos || Object.keys(obj)).map((k) => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
    const fields = {};
    for (const k in obj) fields[k] = para(obj[k]);
    const r = await fetch(BASE + "/" + id + "?key=" + B.chave + "&" + mask, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields })
    });
    if (!r.ok) throw new Error("cadastro " + r.status);
  }

  /* ---------- consultas ---------- */
  const unicos = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const api = {
    carregar,
    fornecedores: () => unicos(dados.fornecedor.map((x) => x.nome)),
    fornecedor: (nome) => dados.fornecedor.find((x) => norm(x.nome) === norm(nome)),
    itens: () => unicos(dados.item.map((x) => x.texto)),
    item: (texto) => dados.item.find((x) => norm(x.texto) === norm(texto)),
    planejamentos: () => unicos(dados.planejamento.map((x) => x.texto)),
    contratos: (empresa) => unicos(dados.contrato.filter((x) => x.empresa === empresa).map((x) => x.numContrato)),
    contrato: (empresa, num) => dados.contrato.find((x) => x.empresa === empresa && norm(x.numContrato) === norm(num)),

    /* grava tudo o que o documento gerado ensinou */
    async aprender(d) {
      const tarefas = [];
      const agora = new Date().toISOString();
      const v = d.valores, emp = d.empresa;
      if (v.fornecedor) tarefas.push(gravar(idDe("forn", v.fornecedor), { tipo: "fornecedor", nome: v.fornecedor.trim(), cnpj: v.cnpj || "", atualizadoEm: agora }));
      for (const l of v.itens || []) {
        const t = l.item || l.descricao;
        if (!t) continue;
        const o = { tipo: "item", texto: t.trim(), atualizadoEm: agora };
        if (l.unid) o.unid = l.unid;
        if (l.insumo) o.insumo = l.insumo;
        if (l.preco || l.precoDepois) o.preco = l.preco || l.precoDepois;
        tarefas.push(gravar(idDe("item", t), o));
      }
      for (const l of v.vinculos || []) if (l.planejamento) tarefas.push(gravar(idDe("plan", l.planejamento), { tipo: "planejamento", texto: l.planejamento.trim(), atualizadoEm: agora }));
      if (v.numContrato && emp) {
        const id = idDe("ctr", emp, v.numContrato);
        const base = { tipo: "contrato", empresa: emp, numContrato: String(v.numContrato).trim(), atualizadoEm: agora };
        const campos = ["tipo", "empresa", "numContrato", "atualizadoEm"];
        const por = (k, val) => { if (val !== undefined && val !== null && val !== "") { base[k] = val; campos.push(k); } };
        por("fornecedor", v.fornecedor); por("cnpj", v.cnpj); por("objeto", v.objeto);
        if (d.modelo === "contrato") {
          por("valorContrato", v.valorTotal || d.totalItens);
          por("itens", (v.itens || []).filter((l) => l.descricao).map((l) => ({ item: l.descricao, unid: l.unid || "", preco: l.preco || "", insumo: l.insumo || "" })));
        }
        if (d.modelo === "medicao") {
          por("valorContrato", v.valorContrato);
          por("itens", (v.itens || []).filter((l) => l.item).map((l) => ({ item: l.item, unid: l.unid || "", preco: l.preco || "" })));
          if (v.numMedicao) { base.medicoes = { [String(v.numMedicao).replace(/[.`]/g, "")]: d.medidoAgora || 0 }; campos.push("medicoes.`" + String(v.numMedicao).replace(/[.`]/g, "") + "`"); }
        }
        if (d.modelo === "aditivo" && d.valorDepois) por("valorContrato", d.valorDepois);
        tarefas.push(gravar(id, base, campos));
      }
      const r = await Promise.allSettled(tarefas);
      localStorage.removeItem(CACHE);
      carregar();
      return r.filter((x) => x.status === "rejected").length === 0;
    }
  };
  window.Cadastro = api;
})();
