// Menu do topo: botão do celular, acessibilidade e sair.
import { limparIA } from "./ia.js";
import { Auth } from "../nucleo/auth.js";
import { showView } from "../nucleo/rotas.js";
import { limparRota } from "../nucleo/dom.js";
import { fecharBusca } from "./pesquisa.js";
import { fecharModal } from "./modal.js";

export function iniciarMenu() {
  const nav = document.getElementById("nav");
  const menu = document.getElementById("menu");

  menu.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", open);
  });

  // fecha o menu do celular ao clicar num link
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a, button:not(#tema)")) {
      nav.classList.remove("open");
      menu.setAttribute("aria-expanded", false);
    }
  });

  // Tema claro (branco + verde) / escuro (preto + verde). Lembra a escolha.
  const aplicarTema = (escuro) => document.body.classList.toggle("escuro", escuro);
  try { aplicarTema(localStorage.getItem("teks-tema") === "escuro"); } catch (e) {}
  document.getElementById("tema").addEventListener("click", () => {
    const escuro = !document.body.classList.contains("escuro");
    aplicarTema(escuro);
    try { localStorage.setItem("teks-tema", escuro ? "escuro" : "claro"); } catch (e) {}
  });

  linhaDoMenu();

  document.getElementById("logout").addEventListener("click", async (e) => {
    e.preventDefault();
    await Auth.sair();
    try { sessionStorage.removeItem("teks_logado_aba"); } catch (x) {}
    limparIA();
    fecharBusca();
    fecharModal();
    const aviso = document.getElementById("adm-toast");
    if (aviso) aviso.hidden = true;
    const q = document.getElementById("q");
    if (q) q.value = "";
    document.getElementById("password").value = "";
    limparRota();
    showView();
  });
}

// Linha verde embaixo das opções (Cursos, Painel admin, Sair): desliza de uma opção para outra
// ao passar o mouse e volta para a opção atual quando o mouse sai. Só aparece no computador.
function linhaDoMenu() {
  const dir = document.querySelector(".nav-dir");
  if (!dir) return;
  const linha = document.createElement("span");
  linha.className = "nav-linha";
  linha.setAttribute("aria-hidden", "true");
  dir.appendChild(linha);

  const opcoes = () => [...dir.querySelectorAll("a, .nav-pesquisa")].filter(a => !a.hidden && a.offsetParent !== null);
  const ativa = () => opcoes().find(a => a.classList.contains("active")) || null;

  function ir(a) {
    if (!a || !matchMedia("(min-width: 641px)").matches) { linha.style.opacity = "0"; return; }
    const estavaOculta = linha.style.opacity !== "1";
    if (estavaOculta) linha.style.transition = "none"; // aparece já no lugar, sem deslizar de longe
    linha.style.left = (a.offsetLeft + 18) + "px";
    linha.style.width = (a.offsetWidth - 36) + "px";
    linha.style.top = (a.offsetTop + a.offsetHeight - 6) + "px";
    if (estavaOculta) { void linha.offsetWidth; linha.style.transition = ""; }
    linha.style.opacity = "1";
  }
  const voltar = () => ir(ativa());

  dir.addEventListener("mouseover", (e) => { const a = e.target.closest("a, .nav-pesquisa"); if (a && dir.contains(a)) ir(a); });
  dir.addEventListener("focusin", (e) => { const a = e.target.closest("a, .nav-pesquisa"); if (a) ir(a); });
  dir.addEventListener("mouseleave", voltar);
  dir.addEventListener("focusout", voltar);
  window.addEventListener("resize", voltar);
  window.addEventListener("hashchange", () => setTimeout(voltar, 0));
  // a opção atual muda (classe "active") e o link do admin aparece/some (atributo "hidden")
  new MutationObserver(voltar).observe(dir, { subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
  voltar();
}