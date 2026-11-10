// Cria a conexão com o Supabase usando os dados do config.js (na raiz do site).
const CFG = window.TEKS_CONFIG;

if (!CFG || !CFG.url || CFG.url.indexOf("COLE_") === 0 || !window.supabase) {
  document.body.innerHTML =
    '<p style="font-family:Inter,Arial,sans-serif;background:#111;color:#fff;padding:40px;line-height:1.6">' +
    'Falta configurar o arquivo <b>config.js</b> com a URL e a chave do Supabase.</p>';
  throw new Error("config.js não configurado");
}

export const sb = window.supabase.createClient(CFG.url, CFG.key);
