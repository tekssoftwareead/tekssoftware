// Aviso "Treinamento não liberado": aparece quando o cliente tenta abrir um sistema que não está liberado para ele.
import { Auth } from "../nucleo/auth.js";
import { app, mostrar } from "../nucleo/dom.js";

const ICONE_CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

let modal = null;

function linkSuporte() {
  const num = (window.TEKS_CONFIG && window.TEKS_CONFIG.whatsapp) || "";
  if (!num) return "";
  const texto = "Olá! Estou no portal da Teks Software e gostaria de solicitar acesso a um treinamento.";
  return "https://wa.me/" + num + "?text=" + encodeURIComponent(texto);
}

export function iniciarModal() {
  modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "modal";
  modal.hidden = true;
  const suporte = linkSuporte();
  modal.innerHTML = `
    <div class="modal-caixa" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      ${ICONE_CADEADO}
      <h2 id="modal-titulo">Treinamento não liberado</h2>
      <p>Você não tem esse treinamento liberado. Fale com o suporte para solicitar o acesso.</p>
      <div class="modal-botoes">
        ${suporte ? `<a class="btn principal" href="${suporte}" target="_blank" rel="noopener">Falar com o suporte</a>` : ""}
        <button class="btn" id="modal-fechar" type="button">Fechar</button>
      </div>
    </div>`;
  document.getElementById("home-view").appendChild(modal);

  modal.addEventListener("click", (e) => { if (e.target === modal) fecharModal(); });
  modal.querySelector("#modal-fechar").addEventListener("click", fecharModal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharModal(); });
}

export function abrirModal() {
  if (!modal) return;
  modal.hidden = false;
  modal.querySelector("#modal-fechar").focus();
}

export function fecharModal() { if (modal) modal.hidden = true; }

// abre os cursos do sistema, ou avisa se o cliente não tem o sistema liberado
export function acessar(catId) {
  if (Auth.temAcesso(catId)) location.hash = "#/cursos/" + catId;
  else abrirModal();
}

// tela mostrada quando alguém abre direto (pelo endereço) um curso ou aula sem acesso
export function semAcesso() {
  mostrar(false);
  app.innerHTML = '<p class="empty">Você não tem esse treinamento liberado. Fale com o suporte para solicitar o acesso. <a class="voltar" href="#/">Voltar ao início</a></p>';
}
