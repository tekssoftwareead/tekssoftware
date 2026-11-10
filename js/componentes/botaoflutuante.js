// Botão flutuante do canto inferior direito: o robô abre/fecha a pesquisa (e o botão do WhatsApp).
export function iniciarBotaoFlutuante() {
  const botaoflutuante = document.getElementById("botaoflutuante");
  const robo = document.getElementById("botaoflutuante-abrir");
  const q = document.getElementById("q");
  if (!botaoflutuante || !robo || !q) return;

  function abrir(abrirIt) {
    botaoflutuante.classList.toggle("aberto", abrirIt);
    robo.setAttribute("aria-expanded", String(abrirIt));
    if (abrirIt) setTimeout(() => q.focus(), 60);
  }

  robo.addEventListener("click", () => abrir(!botaoflutuante.classList.contains("aberto")));
  // clicar fora fecha (o texto pesquisado continua guardado)
  document.addEventListener("click", (e) => { if (!botaoflutuante.contains(e.target)) abrir(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") abrir(false); });
}