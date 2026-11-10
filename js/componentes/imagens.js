// Imagens do site que você pode trocar sem mexer em código.
// Basta colocar o arquivo novo na pasta img/ com UM destes nomes:
//
//   logoteks.(png | jpg | jpeg | webp | svg)   -> logo (barra do topo e login)
//   quem-somos.(png | jpg | jpeg | webp)       -> foto da seção "Quem somos"
//
// O site descobre sozinho qual extensão existe. Se trocar e não mudar, aperte Ctrl+F5.
// Se tiver dois arquivos com o mesmo nome e extensões diferentes, apague o antigo.

const EXTENSOES = ["png", "jpg", "jpeg", "webp", "svg"];
const HORA = Math.floor(Date.now() / 3600000); // evita ficar preso numa imagem antiga por mais de 1h

// tenta primeiro a extensão mais provável (evita avisos "404" no console do navegador)
function achar(nome, primeira) {
  const ordem = [primeira, ...EXTENSOES.filter((e) => e !== primeira)];
  return new Promise((resolve) => {
    let i = 0;
    const tentar = () => {
      if (i >= ordem.length) return resolve(null);
      const url = `img/${nome}.${ordem[i++]}?h=${HORA}`;
      const im = new Image();
      im.onload = () => resolve({ url, largura: im.naturalWidth, altura: im.naturalHeight });
      im.onerror = tentar;
      im.src = url;
    };
    tentar();
  });
}

export async function carregarImagens() {
  const [logo, foto] = await Promise.all([achar("logoteks", "png"), achar("quem-somos", "jpg")]);

  if (logo) {
    const raiz = document.documentElement.style;
    // URL absoluta: dentro de uma variável CSS, o endereço relativo seria lido a partir da pasta css/
    const absoluta = new URL(logo.url, document.baseURI).href;
    raiz.setProperty("--logo-url", `url("${absoluta}")`);
    // mantém a proporção do logo novo, seja ele largo ou quadrado
    raiz.setProperty("--logo-prop", String(logo.largura / logo.altura));
  }

  const figura = document.querySelector(".quem-foto");
  const img = document.getElementById("foto-quem-somos");
  if (!figura || !img) return;
  // o index.html já aponta para img/quem-somos.jpg; aqui só trocamos se existir outro formato
  if (foto) { img.src = foto.url; figura.hidden = false; }
}
