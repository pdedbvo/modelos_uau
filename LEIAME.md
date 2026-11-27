# Modelos de lançamento UAU

Plataforma que gera, em PDF no timbrado BE A Moradia do Futuro, o documento que se anexa aos lançamentos no UAU
(centros de custo que não são obra). Cinco modelos: Medição, Cotação, Contrato, Aditivo e Outros pagamentos.

- Nenhum campo é obrigatório. Campo vazio ou comprovante não anexado pede justificativa, que aparece no PDF.
- Comprovantes (PDF, JPG, PNG, WEBP, GIF, BMP, HEIC) viram páginas do PDF. Nada é enviado para a internet.
- "Importar PDF para editar": os dados ficam embutidos no PDF gerado; ao importar, o formulário volta preenchido
  e o documento sai como nova versão (v2, v3…).
- Sugestões: fornecedor, CNPJ, itens, planejamentos e contratos ficam no Firebase `sharepoint-studio`,
  coleção `modelosCadastro` (sem login). As regras estão em `firestore-regras.txt`.

## Mudar campos
Tudo fica em `modelos.js`: empresas, centros de custo, campos de cada modelo, comprovantes e sugestões.
Mudar um rótulo, tirar ou criar um campo é editar uma linha ali. O PDF acompanha sozinho.

## Arquivos
- `index.html`, `estilo.css`, `app.js`: tela
- `pdf.js`: monta o PDF (pdf-lib), embute os dados e reaproveita comprovantes na importação
- `banco.js`: cadastro compartilhado no Firestore
- `timbrado.jpg`: timbrado em versão leve (31 KB)
- `fontes/`: N27 (woff2 para a tela, ttf para o PDF)
- `lib/`: pdf-lib 1.17.1, fontkit 1.1.1, heic2any 0.0.4 (carregado só quando há foto HEIC)
