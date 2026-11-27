/* =====================================================================
   MODELOS DE LANÇAMENTO UAU · CONFIGURAÇÃO
   ---------------------------------------------------------------------
   Tudo o que aparece no formulário e no PDF vem daqui.
   Para mudar um campo: altere o rótulo, o tipo ou a ordem abaixo.
   Para criar um campo: copie uma linha parecida e dê um id novo.
   Para tirar um campo: apague a linha.

   Tipos de campo:
     texto        linha curta
     textoLongo   parágrafo
     numero       número (aceita vírgula)
     moeda        valor em R$
     data         dd/mm/aaaa
     opcao        lista fechada (use "opcoes")
     tabela       linhas e colunas (use "colunas"); "total" soma uma coluna
     calculado    não é digitado: "calculo" recebe os valores e devolve o número

   "uau" é o nome do campo no UAU (aparece como dica).
   "meia: true" deixa o campo com meia largura.
   Nenhum campo é obrigatório: campo vazio pede justificativa.
   ===================================================================== */

window.CONFIG = {
  versaoConfig: 1,

  /* ---------- Empresas e centros de custo ---------- */
  /* Cada empresa tem um final (sufixo). O centro de custo é prefixo + sufixo, ex.: ADM09. */
  /* "principal: true" aparece direto na lista. As outras ficam no botão "Outras empresas".
     "extras" acrescenta centros de custo que só existem naquela empresa; "sem" tira os que ela não tem. */
  empresas: [
    { codigo: "19", nome: "BE T09 Empreendimento Imobiliário SCP", sufixo: "09", principal: true },
    { codigo: "6", nome: "BE T06 Empreendimento Imobiliário SCP", sufixo: "06", principal: true },
    { codigo: "2", nome: "BE Deodoro Empreendimento Imobiliário Ltda", sufixo: "02", principal: true },
    { codigo: "275", nome: "BE Kaa Square Empreendimento Imobiliário Ltda", sufixo: "BK", principal: true, sem: ["PDV"],
      extras: [{ prefixo: "DIS", codigo: "DISBR", nome: "Distribuição de lucro - SPE", sugerir: "nao-se-enquadra" }] },
    { codigo: "289", nome: "BE Bonifácio Empreendimento Imobiliário Ltda", sufixo: "BO", principal: true, sem: ["PDV"] },
    { codigo: "", nome: "Empresa final 01", sufixo: "01" },
    { codigo: "", nome: "Empresa final 03", sufixo: "03" },
    { codigo: "", nome: "Empresa final 04", sufixo: "04" },
    { codigo: "", nome: "Empresa final 05", sufixo: "05" },
    { codigo: "", nome: "Empresa final 07", sufixo: "07" },
    { codigo: "", nome: "Empresa final 08", sufixo: "08" },
    { codigo: "", nome: "Empresa final 10", sufixo: "10" }
  ],
  centrosDeCusto: [
    { prefixo: "ADM", nome: "Despesas administrativas" },
    { prefixo: "ALP", nome: "Custos com aprovações, licenciamento e projetos" },
    { prefixo: "APT", nome: "Aporte", sugerir: "nao-se-enquadra" },
    { prefixo: "CAQ", nome: "Custo com aquisições" },
    { prefixo: "CDR", nome: "Carteira de recebíveis", sugerir: "nao-se-enquadra" },
    { prefixo: "COM", nome: "Despesas comerciais" },
    { prefixo: "DIS", nome: "Distribuição de lucros", sugerir: "nao-se-enquadra" },
    { prefixo: "DPO", nome: "Despesa pós obra" },
    { prefixo: "DPV", nome: "Despesa com pós venda" },
    { prefixo: "EMP", nome: "Empréstimos", sugerir: "nao-se-enquadra" },
    { prefixo: "MKT", nome: "Despesas com marketing" },
    { prefixo: "PDV", nome: "Plantão de vendas - obras e reformas" },
    { prefixo: "OBR", nome: "Custos de obra" }
  ],

  /* ---------- Cabeçalho comum a todos os modelos ---------- */
  cabecalho: [
    { id: "solicitante", rotulo: "Solicitante", tipo: "texto", meia: true },
    { id: "area", rotulo: "Área", tipo: "opcao", meia: true,
      opcoes: ["CSUA", "CSUM", "EDFC", "EDFE", "ENGA", "ENGE", "ENGO", "Operações", "Incorporação"] },
    { id: "fornecedor", rotulo: "Fornecedor / contratado", tipo: "texto", uau: "Fornecedor / Contratado", meia: true },
    { id: "cnpj", rotulo: "CNPJ / CPF", tipo: "texto", meia: true }
  ],

  /* ---------- Cadastro compartilhado (sugestões) ---------- */
  /* Guarda fornecedor, CNPJ, itens, planejamentos e contratos para sugerir nas próximas vezes. */
  banco: {
    projeto: "sharepoint-studio",
    colecao: "modelosCadastro",
    chave: "AIzaSyA1w_OOq478oTeTzebdaL29oCnvwFwWW3g"
  },
  /* Quais campos ganham sugestão: id do campo (ou da coluna) -> lista */
  sugestoes: {
    fornecedor: "fornecedor",
    numContrato: "contrato",
    item: "item",
    descricao: "item",
    planejamento: "planejamento"
  },

  /* ---------- Comprovantes ---------- */
  comprovantes: {
    formatos: ".pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif",
    limiteMB: 5,
    larguraMaxImagem: 1600,
    qualidadeImagem: 0.75
  },

  /* ---------- Os quatro modelos ---------- */
  modelos: [
    {
      id: "medicao",
      sigla: "MED",
      nome: "Medição",
      titulo: "Medição de contrato",
      anexarEm: "Anexe na tela da medição (Obras > Contratos > Controle de medições).",
      descricao: "Pagamento de um contrato já cadastrado no UAU.",
      secoes: [
        { titulo: "Contrato e medição", campos: [
          { id: "numContrato", rotulo: "Nº contrato", tipo: "texto", uau: "Nº contrato", meia: true },
          { id: "numMedicao", rotulo: "Nº medição", tipo: "texto", uau: "Controle de medições", meia: true },
          { id: "objeto", rotulo: "Objeto do contrato", tipo: "texto", uau: "Objeto" },
          { id: "periodoInicio", rotulo: "Período: início", tipo: "data", meia: true },
          { id: "periodoFim", rotulo: "Período: fim", tipo: "data", meia: true }
        ]},
        { titulo: "O que foi entregue no período", campos: [
          { id: "entregue", rotulo: "Descreva o que foi entregue", tipo: "textoLongo", dica: "É o histórico que quem consultar depois vai ler." }
        ]},
        { titulo: "Itens medidos", campos: [
          { id: "itens", rotulo: "Itens", tipo: "tabela", uau: "Itens da Medição", total: "valor",
            colunas: [
              { id: "item", rotulo: "Item", tipo: "texto", largura: 3 },
              { id: "unid", rotulo: "Unid.", tipo: "texto", largura: 1 },
              { id: "qtde", rotulo: "Qtde.", tipo: "numero", largura: 1 },
              { id: "preco", rotulo: "Preço unit.", tipo: "moeda", largura: 1.5 },
              { id: "valor", rotulo: "Valor", tipo: "calculado", largura: 1.5, formato: "moeda", calculo: (l) => num(l.qtde) * num(l.preco) }
            ]}
        ]},
        { titulo: "Saldo do contrato", meia: true, campos: [
          { id: "valorContrato", rotulo: "Valor do contrato", tipo: "moeda", uau: "Valor do Contrato" },
          { id: "medidoAnterior", rotulo: "Medido até a anterior", tipo: "moeda" },
          { id: "medidoAgora", rotulo: "Medido agora", tipo: "calculado", formato: "moeda", calculo: (v) => somaTabela(v.itens, "valor") },
          { id: "saldo", rotulo: "Saldo", tipo: "calculado", formato: "moeda", destaque: true,
            calculo: (v) => num(v.valorContrato) - num(v.medidoAnterior) - somaTabela(v.itens, "valor") },
          { id: "executado", rotulo: "% executado", tipo: "calculado", formato: "porcentagem",
            calculo: (v) => num(v.valorContrato) ? (num(v.medidoAnterior) + somaTabela(v.itens, "valor")) / num(v.valorContrato) * 100 : null }
        ]},
        { titulo: "Boletim", meia: true, campos: [
          { id: "subtotal", rotulo: "Subtotal", tipo: "calculado", formato: "moeda", calculo: (v) => somaTabela(v.itens, "valor") },
          { id: "descontoNormal", rotulo: "Desconto Normal", tipo: "moeda", uau: "Desconto Normal" },
          { id: "retencao", rotulo: "Retenção", tipo: "moeda", uau: "Retenção" },
          { id: "adiantamentos", rotulo: "Adiantamentos/Abatimentos", tipo: "moeda", uau: "Adiantamentos/Abatimentos" },
          { id: "valorLiquido", rotulo: "Valor Líquido Final", tipo: "calculado", formato: "moeda", destaque: true,
            calculo: (v) => somaTabela(v.itens, "valor") - num(v.descontoNormal) - num(v.retencao) + num(v.adiantamentos) }
        ]},
        { titulo: "Nota fiscal", campos: [
          { id: "nfNumero", rotulo: "Nº NF", tipo: "texto", uau: "Documento fiscal", meia: true },
          { id: "nfEmissao", rotulo: "Emissão", tipo: "data", meia: true },
          { id: "nfVencimento", rotulo: "Vencimento", tipo: "data", meia: true }
        ]},
        { titulo: "Observações", campos: [
          { id: "observacoes", rotulo: "Observações", tipo: "textoLongo" }
        ]}
      ],
      anexos: [
        { id: "nf", rotulo: "Nota fiscal" },
        { id: "evidencia", rotulo: "Evidência da entrega (relatório, fotos, ateste)" }
      ]
    },

    {
      id: "cotacao",
      sigla: "COT",
      nome: "Cotação",
      titulo: "Cotação",
      anexarEm: "Anexe na confirmação da cotação (Confirmar Cotação).",
      descricao: "Compra ou serviço pontual que passou por mapa e confirmação da cotação.",
      minimoPropostas: 3,
      secoes: [
        { titulo: "Cotação e pedido", campos: [
          { id: "numCotacao", rotulo: "Nº cotação", tipo: "texto", uau: "Mapa de Cotação", meia: true },
          { id: "numPedido", rotulo: "Nº pedido / ordem de compra", tipo: "texto", uau: "Ordem de compra", meia: true }
        ]},
        { titulo: "Justificativa da compra", campos: [
          { id: "justificativaCompra", rotulo: "O que é, para que serve e quem usa", tipo: "textoLongo" }
        ]},
        { titulo: "Itens", campos: [
          { id: "itens", rotulo: "Itens", tipo: "tabela", uau: "Seleção de Insumos e Fornecedores",
            colunas: [
              { id: "descricao", rotulo: "Descrição", tipo: "texto", largura: 3 },
              { id: "insumo", rotulo: "Insumo UAU", tipo: "texto", largura: 1.2 },
              { id: "unid", rotulo: "Unid.", tipo: "texto", largura: 0.8 },
              { id: "qtde", rotulo: "Qtde.", tipo: "numero", largura: 0.8 }
            ]}
        ]},
        { titulo: "Propostas recebidas", campos: [
          { id: "propostas", rotulo: "Propostas", tipo: "tabela", uau: "Mapa de Cotação", minimoLinhas: 3,
            perguntaMinimo: "Por que menos de 3 propostas?",
            colunas: [
              { id: "fornecedor", rotulo: "Fornecedor", tipo: "texto", largura: 2.4 },
              { id: "total", rotulo: "Valor total", tipo: "moeda", largura: 1.3 },
              { id: "frete", rotulo: "Frete", tipo: "moeda", largura: 1 },
              { id: "condicao", rotulo: "Cond. pagamento", tipo: "texto", largura: 1.4 },
              { id: "prazo", rotulo: "Prazo entrega", tipo: "texto", largura: 1.1 },
              { id: "validade", rotulo: "Validade", tipo: "data", largura: 1.1 }
            ]},
          { id: "melhorPreco", rotulo: "Menor valor (total + frete)", tipo: "calculado", formato: "texto",
            calculo: (v) => melhorProposta(v.propostas) }
        ]},
        { titulo: "Decisão", campos: [
          { id: "escolhido", rotulo: "Fornecedor escolhido", tipo: "texto", uau: "Confirmar Cotação", meia: true },
          { id: "motivo", rotulo: "Motivo da escolha", tipo: "opcao", meia: true,
            opcoes: ["Menor preço", "Melhor prazo", "Qualidade técnica", "Fornecedor único", "Outro"] },
          { id: "motivoDetalhe", rotulo: "Detalhe do motivo", tipo: "textoLongo" },
          { id: "condicaoFinal", rotulo: "Condição de pagamento acordada", tipo: "texto", uau: "Fechamento de compra", meia: true },
          { id: "entregaFinal", rotulo: "Data de entrega acordada", tipo: "data", meia: true }
        ]},
        { titulo: "Observações", campos: [
          { id: "observacoes", rotulo: "Observações", tipo: "textoLongo" }
        ]}
      ],
      anexos: [
        { id: "propostas", rotulo: "Propostas dos fornecedores" }
      ]
    },

    {
      id: "contrato",
      sigla: "CTR",
      nome: "Contrato",
      titulo: "Contrato",
      anexarEm: "Anexe na tela do contrato (Obras > Contratos > Contratos Materiais e Serviços).",
      descricao: "Cadastro de contrato novo ou aditivo.",
      secoes: [
        { titulo: "Contrato", campos: [
          { id: "numContrato", rotulo: "Nº contrato", tipo: "texto", uau: "Nº contrato", meia: true },
          { id: "tipoControle", rotulo: "Tipo de controle", tipo: "opcao", uau: "Tipo de Controle", meia: true, opcoes: ["Material", "Serviço", "Misto"] },
          { id: "objeto", rotulo: "Objeto", tipo: "textoLongo", uau: "Objeto" },
          { id: "vigenciaInicio", rotulo: "Vigência: início", tipo: "data", uau: "Período", meia: true },
          { id: "vigenciaFim", rotulo: "Vigência: fim", tipo: "data", meia: true },
          { id: "valorTotal", rotulo: "Valor total", tipo: "moeda", uau: "Valor do Contrato", meia: true },
          { id: "gestor", rotulo: "Gestor do contrato", tipo: "texto", meia: true }
        ]},
        { titulo: "Itens do contrato", campos: [
          { id: "itens", rotulo: "Itens", tipo: "tabela", uau: "Itens do contrato", total: "valor",
            colunas: [
              { id: "descricao", rotulo: "Descrição", tipo: "texto", largura: 3 },
              { id: "insumo", rotulo: "Insumo UAU", tipo: "texto", largura: 1.2 },
              { id: "unid", rotulo: "Unid.", tipo: "texto", largura: 0.8 },
              { id: "qtde", rotulo: "Qtde.", tipo: "numero", largura: 0.8 },
              { id: "preco", rotulo: "Preço unit.", tipo: "moeda", largura: 1.3 },
              { id: "valor", rotulo: "Valor", tipo: "calculado", formato: "moeda", largura: 1.3, calculo: (l) => num(l.qtde) * num(l.preco) }
            ]}
        ]},
        { titulo: "Vínculo com o planejamento", campos: [
          { id: "vinculos", rotulo: "Vínculos", tipo: "tabela", uau: "Insumos Vinculado", total: "valor",
            dica: "Diga em qual planejamento (insumo de verba) cada item entra. Um item pode ser dividido em mais de um.",
            colunas: [
              { id: "item", rotulo: "Item do contrato", tipo: "texto", largura: 2.4 },
              { id: "planejamento", rotulo: "Planejamento / insumo vinculado", tipo: "texto", largura: 2.4 },
              { id: "valor", rotulo: "Valor vinculado", tipo: "moeda", largura: 1.3 }
            ]},
          { id: "valorContratoV", rotulo: "Valor do Contrato", tipo: "calculado", formato: "moeda", meia: true,
            calculo: (v) => num(v.valorTotal) || somaTabela(v.itens, "valor") },
          { id: "valorVinculado", rotulo: "Valor Vinculado", tipo: "calculado", formato: "moeda", meia: true,
            calculo: (v) => somaTabela(v.vinculos, "valor") },
          { id: "valorAVincular", rotulo: "Valor a Vincular", tipo: "calculado", formato: "moeda", destaque: true,
            calculo: (v) => (num(v.valorTotal) || somaTabela(v.itens, "valor")) - somaTabela(v.vinculos, "valor"),
            justificarSe: (r) => Math.abs(r) > 0.005, pergunta: "O Valor a Vincular não está zerado. Por quê?" }
        ]},
        { titulo: "Condições", campos: [
          { id: "formaMedicao", rotulo: "Como será medido", tipo: "opcao", meia: true, opcoes: ["Mensal fixo", "Por entrega", "Por quantidade", "Outro"] },
          { id: "reajuste", rotulo: "Reajuste (índice e data-base)", tipo: "texto", meia: true },
          { id: "cronograma", rotulo: "Cronograma de pagamentos", tipo: "textoLongo" },
          { id: "retencao", rotulo: "Retenção / garantia", tipo: "texto", uau: "Retenção", meia: true },
          { id: "adiantamento", rotulo: "Adiantamento", tipo: "opcao", uau: "Permitir adiantamentos parciais", meia: true, opcoes: ["Não", "Sim"] },
          { id: "tributos", rotulo: "Tributos retidos (ISS, INSS, IR)", tipo: "texto", uau: "Usar configuração de tributos" }
        ]},
        { titulo: "Observações", campos: [
          { id: "observacoes", rotulo: "Observações", tipo: "textoLongo" }
        ]}
      ],
      anexos: [
        { id: "contrato", rotulo: "Contrato assinado" }
      ]
    },

    {
      id: "aditivo",
      sigla: "ADT",
      nome: "Aditivo",
      titulo: "Aditivo de contrato",
      anexarEm: "Anexe na tela do aditivo (Obras > Contratos > Aditivo de Contrato).",
      descricao: "Mudança de valor, prazo ou escopo de um contrato já cadastrado.",
      secoes: [
        { titulo: "Contrato e aditivo", campos: [
          { id: "numContrato", rotulo: "Nº contrato", tipo: "texto", uau: "Nº contrato", meia: true },
          { id: "numAditivo", rotulo: "Nº aditivo", tipo: "texto", uau: "Aditivo de Contrato", meia: true },
          { id: "objeto", rotulo: "Objeto do contrato", tipo: "texto", uau: "Objeto" },
          { id: "tipoAditivo", rotulo: "Tipo de aditivo", tipo: "opcao", meia: true, opcoes: ["Valor", "Prazo", "Escopo", "Misto"] },
          { id: "gestor", rotulo: "Gestor do contrato", tipo: "texto", meia: true }
        ]},
        { titulo: "Justificativa do aditivo", campos: [
          { id: "justificativaAditivo", rotulo: "Por que o contrato precisa mudar", tipo: "textoLongo", dica: "O que aconteceu, o que muda e o que acontece se não aditivar." }
        ]},
        { titulo: "Itens aditivados", campos: [
          { id: "itens", rotulo: "Itens", tipo: "tabela", total: "diferenca",
            colunas: [
              { id: "item", rotulo: "Item", tipo: "texto", largura: 2.2 },
              { id: "situacao", rotulo: "Situação", tipo: "texto", largura: 1, dica: "Novo, Alterado ou Suprimido" },
              { id: "qtdeAntes", rotulo: "Qtde. antes", tipo: "numero", largura: 0.9 },
              { id: "qtdeDepois", rotulo: "Qtde. depois", tipo: "numero", largura: 0.9 },
              { id: "precoAntes", rotulo: "Preço antes", tipo: "moeda", largura: 1.1 },
              { id: "precoDepois", rotulo: "Preço depois", tipo: "moeda", largura: 1.1 },
              { id: "valorAntes", rotulo: "Valor antes", tipo: "calculado", formato: "moeda", largura: 1.2, calculo: (l) => num(l.qtdeAntes) * num(l.precoAntes) },
              { id: "valorDepois", rotulo: "Valor depois", tipo: "calculado", formato: "moeda", largura: 1.2, calculo: (l) => num(l.qtdeDepois) * num(l.precoDepois) },
              { id: "diferenca", rotulo: "Diferença", tipo: "calculado", formato: "moeda", largura: 1.2, calculo: (l) => num(l.qtdeDepois) * num(l.precoDepois) - num(l.qtdeAntes) * num(l.precoAntes) }
            ]}
        ]},
        { titulo: "Vínculo com o planejamento", campos: [
          { id: "vinculos", rotulo: "Vínculos do valor aditivado", tipo: "tabela", uau: "Insumos Vinculado", total: "valor",
            dica: "Diga em qual planejamento (insumo de verba) entra a diferença de cada item.",
            colunas: [
              { id: "item", rotulo: "Item", tipo: "texto", largura: 2.4 },
              { id: "planejamento", rotulo: "Planejamento / insumo vinculado", tipo: "texto", largura: 2.4 },
              { id: "valor", rotulo: "Valor vinculado", tipo: "moeda", largura: 1.3 }
            ]},
          { id: "valorAVincularAd", rotulo: "Valor a Vincular", tipo: "calculado", formato: "moeda", destaque: true,
            calculo: (v) => (linhasTabela(v.itens).reduce((t, l) => t + num(l.qtdeDepois) * num(l.precoDepois) - num(l.qtdeAntes) * num(l.precoAntes), 0)) - somaTabela(v.vinculos, "valor"),
            justificarSe: (r) => Math.abs(r) > 0.005, pergunta: "O Valor a Vincular não está zerado. Por quê?" }
        ]},
        { titulo: "Prazo", meia: true, campos: [
          { id: "prazoAntes", rotulo: "Término anterior", tipo: "data" },
          { id: "prazoDepois", rotulo: "Novo término", tipo: "data" }
        ]},
        { titulo: "Valor do contrato", meia: true, campos: [
          { id: "valorAntesContrato", rotulo: "Valor antes do aditivo", tipo: "moeda" },
          { id: "valorDiferenca", rotulo: "Diferença do aditivo", tipo: "calculado", formato: "moeda",
            calculo: (v) => linhasTabela(v.itens).reduce((t, l) => t + num(l.qtdeDepois) * num(l.precoDepois) - num(l.qtdeAntes) * num(l.precoAntes), 0) },
          { id: "valorDepoisContrato", rotulo: "Valor depois do aditivo", tipo: "calculado", formato: "moeda", destaque: true,
            calculo: (v) => num(v.valorAntesContrato) + linhasTabela(v.itens).reduce((t, l) => t + num(l.qtdeDepois) * num(l.precoDepois) - num(l.qtdeAntes) * num(l.precoAntes), 0) }
        ]},
        { titulo: "Observações", campos: [
          { id: "observacoes", rotulo: "Observações", tipo: "textoLongo" }
        ]}
      ],
      anexos: [
        { id: "aditivo", rotulo: "Termo aditivo assinado" },
        { id: "evidencia", rotulo: "Proposta ou evidência da mudança" }
      ]
    },
    {
      id: "nao-se-enquadra",
      sigla: "NSE",
      nome: "Não se enquadra",
      titulo: "Pagamento sem contrato e sem cotação",
      anexarEm: "Anexe no processo de pagamento no UAU.",
      descricao: "Aluguel, assinatura, conta de consumo, reembolso e outros pagamentos sem contrato nem cotação.",
      secoes: [
        { titulo: "Pagamento", campos: [
          { id: "categoria", rotulo: "Categoria", tipo: "opcao", meia: true,
            opcoes: ["Aluguel", "Assinatura", "Conta de consumo", "Reembolso", "Outros"] },
          { id: "numProcesso", rotulo: "Nº do processo no UAU", tipo: "texto", meia: true },
          { id: "oQueE", rotulo: "O que é", tipo: "textoLongo" },
          { id: "competencia", rotulo: "Mês de competência", tipo: "texto", dica: "ex.: 11/2026", meia: true },
          { id: "valor", rotulo: "Valor", tipo: "moeda", meia: true },
          { id: "vencimento", rotulo: "Vencimento", tipo: "data", meia: true },
          { id: "recorrencia", rotulo: "Recorrência", tipo: "opcao", meia: true, opcoes: ["Único", "Mensal", "Outra"] },
          { id: "semContrato", rotulo: "Por que não tem contrato nem cotação", tipo: "textoLongo" }
        ]},
        { titulo: "Observações", campos: [
          { id: "observacoes", rotulo: "Observações", tipo: "textoLongo" }
        ]}
      ],
      anexos: [
        { id: "fatura", rotulo: "Fatura, recibo ou nota" }
      ]
    }
  ]
};

/* ---------- funções usadas nos cálculos (não precisa mexer) ---------- */
function num(v) {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function linhasTabela(l) { return l || []; }
function somaTabela(linhas, coluna) {
  return (linhas || []).reduce((t, l) => t + num(l[coluna]), 0);
}
function melhorProposta(linhas) {
  const validas = (linhas || []).filter((l) => l.fornecedor && num(l.total));
  if (!validas.length) return "";
  const m = validas.reduce((a, b) => (num(a.total) + num(a.frete) <= num(b.total) + num(b.frete) ? a : b));
  const v = num(m.total) + num(m.frete);
  return m.fornecedor + " · " + v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
