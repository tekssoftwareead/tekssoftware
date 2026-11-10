// Painel admin: peças usadas em todas as abas (ícones, aviso rápido e janela de formulário/confirmação).
import { esc } from "../../nucleo/helpers.js";

const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ICONE = {
  sistema: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  curso: svg('<path d="M2 8l10-4 10 4-10 4z"/><path d="M6 10v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>'),
  modulo: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  aula: svg('<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor"/>'),
  artigo: svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  usuario: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  usuarios: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>'),
  conteudo: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  subir: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  descer: svg('<path d="M12 5v14M18 13l-6 6-6-6"/>'),
  editar: svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  olho: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  olhoFechado: svg('<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  lixo: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  chave: svg('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>'),
  busca: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  fechar: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  bloquear: svg('<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>'),
  ativar: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>'),
  ok: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  alerta: svg('<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17.5v.5"/>'),
  copiar: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
  gerar: svg('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  relogio: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')
};

/* ================= AVISO RÁPIDO ================= */
export function avisar(texto, erro) {
  let t = document.getElementById("adm-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "adm-toast";
    t.className = "adm-toast";
    t.setAttribute("role", "status");
    document.getElementById("home-view").appendChild(t);
  }
  t.innerHTML = (erro ? ICONE.alerta : ICONE.ok) + `<span>${esc(texto)}</span>`;
  t.classList.toggle("erro", !!erro);
  t.hidden = false;
  clearTimeout(avisar._t);
  avisar._t = setTimeout(() => { t.hidden = true; }, erro ? 5000 : 2600);
}

/* ================= JANELA (formulário ou confirmação) =================
   aoSalvar(form): faça o trabalho; para mostrar um erro, lance um Error com a mensagem.
   Se aoSalvar devolver false, a janela continua aberta. */
export function abrirJanela({ icone, titulo, subtitulo, corpo = "", textoSalvar = "Salvar", textoCancelar = "Cancelar",
                              perigo = false, larga = false, semSalvar = false, aoAbrir, aoSalvar }) {
  const antigo = document.getElementById("adm-overlay");
  if (antigo) antigo.remove();

  const overlay = document.createElement("div");
  overlay.id = "adm-overlay";
  overlay.className = "adm-overlay";
  overlay.innerHTML = `
    <form class="adm-caixa${larga ? " larga" : ""}" id="adm-form" novalidate role="dialog" aria-modal="true" aria-labelledby="adm-janela-titulo">
      <header class="adm-caixa-cab">
        ${icone ? `<span class="adm-caixa-ico${perigo ? " perigo" : ""}">${icone}</span>` : ""}
        <div class="adm-caixa-tit">
          <h2 id="adm-janela-titulo">${esc(titulo)}</h2>
          ${subtitulo ? `<p class="adm-caminho">${esc(subtitulo)}</p>` : ""}
        </div>
        <button type="button" class="adm-fechar" data-fechar aria-label="Fechar">${ICONE.fechar}</button>
      </header>
      <div class="adm-caixa-corpo">${corpo}</div>
      <p class="adm-erro" id="adm-erro" role="alert" hidden></p>
      <footer class="adm-form-botoes">
        <button type="button" class="btn" data-fechar>${esc(textoCancelar)}</button>
        ${semSalvar ? "" : `<button type="submit" class="btn ${perigo ? "perigo" : "principal"}" id="adm-salvar">${esc(textoSalvar)}</button>`}
      </footer>
    </form>`;
  document.getElementById("home-view").appendChild(overlay);

  const form = overlay.querySelector("form");
  const erro = overlay.querySelector("#adm-erro");
  const botaoSalvar = overlay.querySelector("#adm-salvar");

  const fechar = () => {
    document.removeEventListener("keydown", aoTeclar);
    overlay.remove();
  };
  const aoTeclar = (e) => { if (e.key === "Escape") fechar(); };
  document.addEventListener("keydown", aoTeclar);
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) fechar(); });
  overlay.querySelectorAll("[data-fechar]").forEach(b => b.addEventListener("click", fechar));

  const mostrarErro = (texto) => { erro.textContent = texto; erro.hidden = false; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!aoSalvar || !botaoSalvar) return;
    erro.hidden = true;
    botaoSalvar.disabled = true;
    botaoSalvar.textContent = "Salvando...";
    try {
      const r = await aoSalvar(form);
      if (r !== false) fechar();
      else { botaoSalvar.disabled = false; botaoSalvar.textContent = textoSalvar; }
    } catch (err) {
      console.error(err);
      mostrarErro(err && err.message ? err.message : String(err));
      botaoSalvar.disabled = false;
      botaoSalvar.textContent = textoSalvar;
    }
  });

  if (aoAbrir) aoAbrir(form);
  const primeiro = form.querySelector(".adm-caixa-corpo input[type=text]:not([readonly]), .adm-caixa-corpo input[type=email], .adm-caixa-corpo textarea");
  if (primeiro) primeiro.focus();
  else if (botaoSalvar) botaoSalvar.focus();

  return { overlay, form, fechar, mostrarErro };
}

// janela de "tem certeza?" (resolve true/false)
export function confirmar({ titulo, texto, textoSalvar = "Apagar", icone = ICONE.lixo }) {
  return new Promise((resolve) => {
    let ok = false;
    const j = abrirJanela({
      icone, titulo, perigo: true, textoSalvar,
      corpo: `<div class="adm-confirma">${texto}</div>`,
      aoSalvar: () => { ok = true; }
    });
    // resolve quando a janela sair da tela (salvou ou cancelou)
    const obs = new MutationObserver(() => {
      if (!j.overlay.isConnected) { obs.disconnect(); resolve(ok); }
    });
    obs.observe(document.getElementById("home-view"), { childList: true });
  });
}

// botão quadradinho só com ícone (o nome aparece ao passar o mouse e para leitores de tela)
export function botaoIcone(acao, icone, rotulo, attrs = "", classe = "") {
  return `<button type="button" class="adm-ico-btn${classe ? " " + classe : ""}" data-acao="${acao}" ${attrs} title="${esc(rotulo)}" aria-label="${esc(rotulo)}">${icone}</button>`;
}

export function estadoVazio(icone, titulo, texto) {
  return `<div class="adm-vazio"><span class="adm-vazio-ico">${icone}</span><strong>${esc(titulo)}</strong>${texto ? `<p>${texto}</p>` : ""}</div>`;
}

export function copiarTexto(texto) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
  const t = document.createElement("textarea");
  t.value = texto; t.style.position = "fixed"; t.style.opacity = "0";
  document.body.appendChild(t); t.select();
  try { document.execCommand("copy"); } finally { t.remove(); }
  return Promise.resolve();
}
