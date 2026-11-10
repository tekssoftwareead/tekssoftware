// Painel admin > aba "Manuais".
// Envia manuais (PDF, Word, TXT) direto pelo site para aparecerem na pesquisa — sem precisar do comando no computador.
// O arquivo é lido AQUI no navegador: o texto é separado em pedaços e os prints (imagens) do PDF são extraídos.
// Depois tudo vai para a tabela "conhecimento" e as imagens para o espaço "conhecimento-img" do Supabase.
// Precisa ter rodado banco/manuais.sql uma vez (dá permissão só para administradores).
import { sb } from "../../config/supabase.js";
import { Store } from "../../nucleo/store.js";
import { esc, plural, porOrdem, normTexto } from "../../nucleo/helpers.js";
import { ICONE, avisar, confirmar, botaoIcone, estadoVazio } from "./ui.js";

// bibliotecas carregadas só quando a aba é usada
const PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
const PDFJS_FONTES = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/";
const MAMMOTH = "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js";

const BUCKET = "conhecimento-img";
const TAMANHO_PARTE = 1400;                 // caracteres por pedaço (igual ao comando antigo)
const MIN_LARGURA = 80, MIN_ALTURA = 40;    // imagens menores que isso (ícones, logos) são ignoradas
const MAX_MB = 40;                          // tamanho máximo de cada arquivo
const TIPOS = [".pdf", ".docx", ".txt", ".md"];

const ICONE_LIVRO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7M8 11h5"/></svg>';
const ICONE_NUVEM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9"/><path d="M12 12v9M8.5 15.5L12 12l3.5 3.5"/></svg>';
const ICONE_IMG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>';

const M = { corpo: null, arquivos: [], enviando: false, plano: "" };

// mesmo nome de "plano" que a função da IA usa para achar os manuais de cada sistema (ex.: "Power Stock" -> "powerstock")
const planoDe = (id) => normTexto(String(id)).replace(/[^a-z0-9]+/g, "").replace(/^powestock$/, "powerstock");
const sistemas = () => Store.todos("categorias").slice().sort(porOrdem);
const nomeDoPlano = (plano) => { const s = sistemas().find(c => planoDe(c.id) === plano || planoDe(c.nome) === plano); return s ? s.nome : plano; };
const dataBR = (iso) => iso ? new Date(iso).toLocaleDateString("pt-BR") : "";
const extensao = (nome) => (String(nome).match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();

/* ================= ENTRADA ================= */
export async function desenharManuais(corpo) {
  M.corpo = corpo;
  corpo.addEventListener("click", aoClicar);
  corpo.innerHTML = `<div class="adm-carregando"><span></span><span></span><span></span></div>`;
  await recarregar();
}

const faltaSql = (e) => /42P01|42501|PGRST205|PGRST301/.test(String(e && e.code)) ||
  /does not exist|permission denied|row-level security|schema cache/i.test(String(e && e.message));

async function recarregar() {
  const { data, error } = await sb.from("conhecimento").select("plano,arquivo,parte,imagens,criado").range(0, 19999);
  if (!M.corpo || !M.corpo.isConnected) return;
  if (error) {
    console.error(error);
    M.corpo.innerHTML = faltaSql(error)
      ? estadoVazio(ICONE_LIVRO, "Falta um passo no banco de dados",
          "Para enviar manuais por aqui, rode o arquivo <b>banco/manuais.sql</b> no Supabase (SQL Editor &gt; New query &gt; Run) e recarregue a página.")
      : estadoVazio(ICONE.alerta, "Não foi possível carregar os manuais", esc(error.message || ""));
    return;
  }
  // junta os pedaços de cada arquivo
  const mapa = new Map();
  for (const l of data || []) {
    const k = l.plano + "\u0000" + l.arquivo;
    const a = mapa.get(k) || { plano: l.plano, arquivo: l.arquivo, partes: 0, prints: new Set(), criado: l.criado };
    a.partes++;
    (l.imagens || []).forEach(i => a.prints.add(i));
    if (l.criado > a.criado) a.criado = l.criado;
    mapa.set(k, a);
  }
  M.arquivos = [...mapa.values()].sort((a, b) => a.arquivo.localeCompare(b.arquivo));
  desenhar();
}

/* ================= TELA ================= */
function desenhar() {
  const A = M.arquivos;
  const lista = sistemas();
  if (!M.plano && lista.length) M.plano = planoDe(lista[0].id);
  const totalPrints = A.reduce((n, a) => n + a.prints.size, 0);
  const totalPartes = A.reduce((n, a) => n + a.partes, 0);

  // grupos por sistema (inclusive manuais de um sistema que não existe mais)
  const planos = [...new Set([...lista.map(s => planoDe(s.id)), ...A.map(a => a.plano)])];
  const grupos = planos.map(p => ({ plano: p, nome: nomeDoPlano(p), itens: A.filter(a => a.plano === p) })).filter(g => g.itens.length);

  M.corpo.innerHTML = `
    <div class="adm-stats">
      <div class="adm-stat"><span class="adm-stat-ico">${ICONE_LIVRO}</span><div><strong>${A.length}</strong><small>${A.length === 1 ? "Manual" : "Manuais"}</small></div></div>
      <div class="adm-stat"><span class="adm-stat-ico">${ICONE.artigo}</span><div><strong>${totalPartes}</strong><small>Trechos na pesquisa</small></div></div>
      <div class="adm-stat"><span class="adm-stat-ico">${ICONE_IMG}</span><div><strong>${totalPrints}</strong><small>Prints de tela</small></div></div>
    </div>

    <section class="man-envio">
      <div class="man-envio-topo">
        <div>
          <h2>Enviar manuais</h2>
          <p>PDF, Word (.docx) ou texto. O conteúdo passa a aparecer na pesquisa do site na hora, com os prints do PDF.</p>
        </div>
        <label class="adm-campo man-sistema"><span>Sistema</span>
          <select id="man-plano">
            ${lista.map(s => `<option value="${esc(planoDe(s.id))}"${planoDe(s.id) === M.plano ? " selected" : ""}>${esc(s.nome)}</option>`).join("")}
          </select>
        </label>
      </div>
      ${lista.length ? `
        <label class="man-soltar" id="man-soltar" tabindex="0">
          <input type="file" id="man-arquivos" accept=".pdf,.docx,.txt,.md" multiple hidden>
          <span class="man-soltar-ico">${ICONE_NUVEM}</span>
          <strong>Arraste os arquivos aqui ou clique para escolher</strong>
          <small>Pode enviar vários de uma vez. Se já existir um manual com o mesmo nome neste sistema, ele é substituído.</small>
        </label>
        <ul class="man-progresso" id="man-progresso" hidden></ul>`
        : '<p class="adm-muda">Cadastre os sistemas na aba Conteúdo antes de enviar manuais.</p>'}
    </section>

    <div class="man-lista">
      ${grupos.map(g => `
        <section class="adm-no adm-grupo">
          <div class="adm-linha adm-linha-fixa">
            <span class="adm-ico adm-ico-sistema">${ICONE.sistema}</span>
            <span class="adm-titulo"><strong>${esc(g.nome)}</strong><small>${plural(g.itens.length, "manual", "manuais")}</small></span>
          </div>
          <div class="adm-filhos">
            ${g.itens.map(a => `
              <div class="adm-aula">
                <span class="man-tipo">${esc(extensao(a.arquivo).slice(1).toUpperCase() || "ARQ")}</span>
                <span class="adm-titulo"><strong>${esc(a.arquivo)}</strong>
                  <small class="adm-meta">${plural(a.partes, "trecho", "trechos")}<i aria-hidden="true">·</i>${plural(a.prints.size, "print", "prints")}${a.criado ? `<i aria-hidden="true">·</i>enviado em ${esc(dataBR(a.criado))}` : ""}</small>
                </span>
                <span class="adm-acoes">${botaoIcone("apagar", ICONE.lixo, "Apagar manual", `data-plano="${esc(a.plano)}" data-arquivo="${esc(a.arquivo)}"`, "perigo")}</span>
              </div>`).join("")}
          </div>
        </section>`).join("") ||
        estadoVazio(ICONE_LIVRO, "Nenhum manual enviado ainda", "Envie os manuais dos sistemas (PDF ou Word) para eles aparecerem na pesquisa com o passo a passo e os prints de tela.")}
    </div>
    <p class="man-nota">PDF escaneado (só imagem, sem texto que dá para selecionar) não funciona. Não coloque senhas nem dados de clientes nos manuais: o conteúdo fica disponível na pesquisa para quem tem o sistema liberado.</p>`;

  ligarEnvio();
}

function ligarEnvio() {
  const sel = document.getElementById("man-plano");
  if (sel) sel.addEventListener("change", () => { M.plano = sel.value; });
  const zona = document.getElementById("man-soltar");
  const input = document.getElementById("man-arquivos");
  if (!zona || !input) return;
  input.addEventListener("change", () => { if (input.files.length) enviarVarios([...input.files]); input.value = ""; });
  zona.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
  ["dragenter", "dragover"].forEach(t => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.add("sobre"); }));
  ["dragleave", "drop"].forEach(t => zona.addEventListener(t, (e) => { e.preventDefault(); zona.classList.remove("sobre"); }));
  zona.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files.length) enviarVarios([...e.dataTransfer.files]); });
}

async function aoClicar(e) {
  const b = e.target.closest("[data-acao='apagar']");
  if (!b) return;
  e.preventDefault();
  const { plano, arquivo } = b.dataset;
  const ok = await confirmar({
    titulo: "Apagar manual?", textoSalvar: "Apagar",
    texto: `<p><strong>${esc(arquivo)}</strong><br><span class="adm-muda">${esc(nomeDoPlano(plano))}</span></p>
      <p>O manual deixa de aparecer na pesquisa. O arquivo no seu computador não é afetado.</p>`
  });
  if (!ok) return;
  try {
    const { error } = await sb.from("conhecimento").delete().eq("plano", plano).eq("arquivo", arquivo);
    if (error) throw error;
    await recarregar();
    avisar("Manual apagado.");
  } catch (err) {
    console.error(err);
    avisar("Não foi possível apagar: " + (err.message || err), true);
  }
}

/* ================= ENVIO ================= */
async function enviarVarios(arquivos) {
  if (M.enviando) return avisar("Espere terminar o envio atual.", true);
  const plano = M.plano;
  if (!plano) return avisar("Escolha o sistema.", true);
  M.enviando = true;
  const lista = document.getElementById("man-progresso");
  const zona = document.getElementById("man-soltar");
  lista.hidden = false;
  lista.innerHTML = "";
  zona.classList.add("ocupado");

  let certos = 0;
  for (const arq of arquivos) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="man-p-nome">${esc(arq.name)}</span><span class="man-p-status">Na fila…</span>`;
    lista.appendChild(li);
    const status = (texto, tipo = "") => { li.className = tipo; li.querySelector(".man-p-status").textContent = texto; };
    try {
      const r = await enviarUm(arq, plano, status);
      status(`Pronto: ${plural(r.partes, "trecho", "trechos")}, ${plural(r.prints, "print", "prints")}`, "ok");
      certos++;
    } catch (err) {
      console.error(arq.name, err);
      status(err.message || String(err), "erro");
    }
  }
  M.enviando = false;
  zona.classList.remove("ocupado");
  if (certos) {
    const progresso = lista.innerHTML;
    await recarregar();
    const nova = document.getElementById("man-progresso");   // mantém o resultado do envio visível
    if (nova) { nova.innerHTML = progresso; nova.hidden = false; }
    avisar(certos === 1 ? "Manual enviado." : `${certos} manuais enviados.`);
  }
}

async function enviarUm(arq, plano, status) {
  const ext = extensao(arq.name);
  if (ext === ".doc") throw new Error("Arquivo .doc antigo: abra no Word e salve como .docx.");
  if (!TIPOS.includes(ext)) throw new Error("Tipo não aceito. Use PDF, Word (.docx), TXT ou MD.");
  if (arq.size > MAX_MB * 1024 * 1024) throw new Error(`Arquivo maior que ${MAX_MB} MB.`);

  status("Lendo o arquivo…");
  const lido = await lerArquivo(arq, (pag, total) => status(`Lendo página ${pag} de ${total}…`));
  const partes = separar(lido.texto, TAMANHO_PARTE);
  if (!partes.length) throw new Error(ext === ".pdf" ? "Sem texto: parece ser PDF escaneado (só imagem)." : "O arquivo não tem texto.");

  // envia só os prints que ficaram em algum pedaço
  const usadas = [...new Set(partes.flatMap(p => p.imgs))];
  const caminhos = new Map();
  for (let i = 0; i < usadas.length; i++) {
    status(`Enviando prints ${i + 1} de ${usadas.length}…`);
    caminhos.set(usadas[i], await enviarImagem(plano, lido.imagens[usadas[i]]));
  }

  status("Salvando…");
  const titulo = arq.name.replace(/\.[a-z0-9]+$/i, "");
  const del = await sb.from("conhecimento").delete().eq("plano", plano).eq("arquivo", arq.name);
  if (del.error) throw new Error("Não consegui substituir a versão antiga: " + del.error.message);
  const linhas = partes.map((p, i) => ({
    plano, arquivo: arq.name, parte: i + 1, titulo, texto: p.texto,
    imagens: p.imgs.map(n => caminhos.get(n)).filter(Boolean)
  }));
  for (let i = 0; i < linhas.length; i += 50) {
    const { error } = await sb.from("conhecimento").insert(linhas.slice(i, i + 50));
    if (error) throw new Error("Não consegui salvar: " + error.message);
  }
  return { partes: partes.length, prints: new Set(caminhos.values()).size };
}

async function enviarImagem(plano, blob) {
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-1", await blob.arrayBuffer()))]
    .map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
  const nome = `${plano}/${hash}.png`;
  const { error } = await sb.storage.from(BUCKET).upload(nome, blob, { contentType: "image/png", upsert: true });
  if (error && !/exists|duplicate/i.test(error.message || "")) {
    throw new Error(/bucket/i.test(error.message || "") ? "O espaço de imagens não existe: rode banco/manuais.sql." : "Print não enviado: " + error.message);
  }
  return nome;
}

/* ================= LEITURA DOS ARQUIVOS ================= */
async function lerArquivo(arq, progresso) {
  const ext = extensao(arq.name);
  if (ext === ".txt" || ext === ".md") return { texto: await arq.text(), imagens: [] };
  if (ext === ".docx") {
    const mammoth = await carregarMammoth();
    const r = await mammoth.extractRawText({ arrayBuffer: await arq.arrayBuffer() });
    return { texto: r.value || "", imagens: [] };
  }
  return lerPdf(await arq.arrayBuffer(), progresso);
}

let _mammoth = null;
function carregarMammoth() {
  if (window.mammoth) return Promise.resolve(window.mammoth);
  _mammoth = _mammoth || new Promise((ok, falha) => {
    const s = document.createElement("script");
    s.src = MAMMOTH;
    s.onload = () => window.mammoth ? ok(window.mammoth) : falha(new Error("Leitor de Word não carregou."));
    s.onerror = () => { _mammoth = null; falha(new Error("Não consegui carregar o leitor de Word. Verifique a internet.")); };
    document.head.appendChild(s);
  });
  return _mammoth;
}

let _pdfjs = null;
function carregarPdfjs() {
  _pdfjs = _pdfjs || import(PDFJS).then(m => { m.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; return m; })
    .catch(() => { _pdfjs = null; throw new Error("Não consegui carregar o leitor de PDF. Verifique a internet."); });
  return _pdfjs;
}

const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4], m[4] * n[1] + m[5] * n[3] + n[5],
];
const pegarObjeto = (objs, nome) => new Promise((ok) => {
  const t = setTimeout(() => ok(null), 5000);
  try { objs.get(nome, (o) => { clearTimeout(t); ok(o); }); } catch (e) { clearTimeout(t); ok(null); }
});

// imagem do pdf.js (ImageBitmap ou pixels em cinza/RGB/RGBA) -> PNG
function paraRGBA(img) {
  const { width: w, height: h, data } = img;
  const out = new Uint8ClampedArray(w * h * 4);
  if (data.length === w * h * 4) out.set(data);
  else if (data.length === w * h * 3) for (let i = 0, j = 0; i < w * h; i++) { out[j++] = data[i * 3]; out[j++] = data[i * 3 + 1]; out[j++] = data[i * 3 + 2]; out[j++] = 255; }
  else if (data.length === w * h) for (let i = 0, j = 0; i < w * h; i++) { out[j++] = data[i]; out[j++] = data[i]; out[j++] = data[i]; out[j++] = 255; }
  else {
    const stride = Math.ceil(w / 8);   // cinza de 1 bit
    if (data.length < stride * h) return null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = (data[y * stride + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0;
      const j = (y * w + x) * 4; out[j] = out[j + 1] = out[j + 2] = v; out[j + 3] = 255;
    }
  }
  return out;
}
function imagemParaPng(img) {
  return new Promise((ok) => {
    const c = document.createElement("canvas");
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d");
    if (img.bitmap) ctx.drawImage(img.bitmap, 0, 0);
    else {
      const rgba = paraRGBA(img);
      if (!rgba) return ok(null);
      ctx.putImageData(new ImageData(rgba, img.width, img.height), 0, 0);
    }
    c.toBlob(b => ok(b), "image/png");
  });
}

// Lê o PDF na ordem de leitura; marca com [[IMG:n]] onde cada print aparece (igual ao comando antigo)
async function lerPdf(dados, progresso) {
  const pdfjs = await carregarPdfjs();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(dados), useSystemFonts: true, verbosity: 0, standardFontDataUrl: PDFJS_FONTES }).promise;
  const imagens = [];
  const paginas = [];
  const OPS = pdfjs.OPS;

  for (let p = 1; p <= doc.numPages; p++) {
    progresso(p, doc.numPages);
    const pagina = await doc.getPage(p);
    const itens = [];

    const tc = await pagina.getTextContent();
    const linhas = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = it.transform[5], x = it.transform[4];
      const l = linhas.find(q => Math.abs(q.y - y) < 3);
      const parte = { x, s: it.str, w: it.width, h: it.height };
      if (l) l.partes.push(parte); else linhas.push({ y, partes: [parte] });
    }
    for (const l of linhas) {
      l.partes.sort((a, b) => a.x - b.x);
      let t = "";
      l.partes.forEach((q, k) => {
        if (k > 0) {
          const ant = l.partes[k - 1];
          const folga = typeof ant.w === "number" ? q.x - (ant.x + ant.w) : Infinity;
          if (!(/\s$/.test(t) || /^\s/.test(q.s) || folga < (q.h || 10) * 0.12)) t += " ";
        }
        t += q.s;
      });
      itens.push({ y: l.y, texto: t.replace(/\s+/g, " ").trim() });
    }

    // links clicáveis (ex.: vídeo do YouTube) entram como texto
    try {
      for (const an of (await pagina.getAnnotations()) || []) if (an.url && an.rect) itens.push({ y: an.rect[3], texto: an.url });
    } catch (e) { /* sem links */ }

    // imagens e a posição delas na página
    try {
      const ol = await pagina.getOperatorList();
      let ctm = [1, 0, 0, 1, 0, 0]; const pilha = [];
      for (let i = 0; i < ol.fnArray.length; i++) {
        const fn = ol.fnArray[i], args = ol.argsArray[i];
        if (fn === OPS.save) pilha.push(ctm);
        else if (fn === OPS.restore) ctm = pilha.pop() || ctm;
        else if (fn === OPS.transform) ctm = mul(args, ctm);
        else if (fn === OPS.paintFormXObjectBegin) { pilha.push(ctm); if (args && args[0]) ctm = mul(args[0], ctm); }
        else if (fn === OPS.paintFormXObjectEnd) ctm = pilha.pop() || ctm;
        else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
          const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => [ctm[0] * u + ctm[2] * v + ctm[4], ctm[1] * u + ctm[3] * v + ctm[5]]);
          const ys = pts.map(q => q[1]), xs = pts.map(q => q[0]);
          if (Math.max(...ys) - Math.min(...ys) < MIN_ALTURA || Math.max(...xs) - Math.min(...xs) < MIN_LARGURA) continue;
          try {
            const img = fn === OPS.paintInlineImageXObject ? args[0]
              : (await pegarObjeto(pagina.objs, args[0])) || (await pegarObjeto(pagina.commonObjs, args[0]));
            if (!img || !img.width || !img.height || (!img.data && !img.bitmap)) continue;
            const png = await imagemParaPng(img);
            if (!png || png.size > 5 * 1024 * 1024) continue;
            imagens.push(png);
            itens.push({ y: Math.max(...ys), img: imagens.length - 1 });
          } catch (e) { console.warn("página", p, "imagem ignorada:", e && e.message); }
        }
      }
    } catch (e) { console.warn("página", p, "sem imagens:", e && e.message); }

    itens.sort((a, b) => b.y - a.y);
    let texto = "", yAnt = null;
    for (const it of itens) {
      if (it.img !== undefined) { texto += `\n\n[[IMG:${it.img}]]\n\n`; yAnt = null; continue; }
      texto += (yAnt !== null && yAnt - it.y > 22 ? "\n\n" : "\n") + it.texto;
      yAnt = it.y;
    }
    paginas.push(texto);
    pagina.cleanup();
  }
  await doc.destroy();
  return { texto: paginas.join("\n\n"), imagens };
}

// separa em pedaços; o pedaço termina logo depois do print, para texto e print ficarem juntos
function separar(textoBruto, tamanho) {
  const limpo = String(textoBruto || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const paragrafos = limpo.split(/\n\s*\n/).flatMap(p => {
    if (/\[\[IMG:\d+\]\]/.test(p)) return [p];
    const out = []; for (let i = 0; i < p.length; i += tamanho) out.push(p.slice(i, i + tamanho)); return out;
  });
  const partes = [];
  let atual = { texto: "", imgs: [] };
  const fechar = () => { if (atual.texto.trim() || atual.imgs.length) partes.push(atual); atual = { texto: "", imgs: [] }; };
  for (const bruto of paragrafos) {
    const imgs = [...bruto.matchAll(/\[\[IMG:(\d+)\]\]/g)].map(m => Number(m[1]));
    const p = bruto.replace(/\[\[IMG:\d+\]\]/g, "").trim();
    if (p && atual.texto && atual.texto.length + p.length + 2 > tamanho) fechar();
    if (p) atual.texto += (atual.texto ? "\n\n" : "") + p;
    if (imgs.length) {
      if (!atual.texto.trim() && partes.length) partes[partes.length - 1].imgs.push(...imgs);
      else { atual.imgs.push(...imgs); fechar(); }
    }
  }
  fechar();
  return partes.filter(x => x.texto.trim().length > 20);
}
