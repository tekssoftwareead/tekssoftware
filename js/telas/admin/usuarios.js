// Painel admin > aba Usuários.
// Criar contas com senha, escolher o perfil (cliente, aluno ou administrador), liberar sistemas com data de validade,
// trocar senha, desativar/reativar e excluir. Tudo passa pelas funções do banco/usuarios.sql (só admin consegue usar).
import { sb } from "../../config/supabase.js";
import { Store } from "../../nucleo/store.js";
import { Auth } from "../../nucleo/auth.js";
import { esc, plural, normTexto, porOrdem } from "../../nucleo/helpers.js";
import { ICONE, avisar, abrirJanela, confirmar, botaoIcone, estadoVazio, copiarTexto } from "./ui.js";

const PAPEIS = {
  cliente: { rotulo: "Cliente", desc: "Vê só os sistemas liberados" },
  aluno: { rotulo: "Aluno", desc: "Vê todos os sistemas" },
  admin: { rotulo: "Administrador", desc: "Vê tudo e usa este painel" }
};

const FILTROS = {
  todos: { rotulo: "Todos", teste: () => true },
  cliente: { rotulo: "Clientes", teste: u => u.papel === "cliente" },
  aluno: { rotulo: "Alunos", teste: u => u.papel === "aluno" },
  admin: { rotulo: "Admins", teste: u => u.papel === "admin" },
  atencao: { rotulo: "Precisa de atenção", teste: u => precisaAtencao(u) }
};

const U = { corpo: null, lista: [], filtro: "todos", termo: "" };

/* ================= DATAS ================= */
const hojeISO = () => new Date().toISOString().slice(0, 10);
const somarDias = (dias) => { const d = new Date(); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
const dataBR = (iso) => iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "";

function tempoAtras(iso) {
  if (!iso) return "Nunca entrou";
  const seg = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seg < 3600) return "Agora há pouco";
  if (seg < 86400) return "Hoje";
  const dias = Math.floor(seg / 86400);
  if (dias === 1) return "Ontem";
  if (dias < 30) return `Há ${dias} dias`;
  if (dias < 365) return `Há ${plural(Math.floor(dias / 30), "mês", "meses")}`;
  return `Há ${plural(Math.floor(dias / 365), "ano", "anos")}`;
}

// situação de um acesso: "ok", "vence" (em até 30 dias) ou "vencido"
function situacaoAcesso(a) {
  if (!a.valido_ate) return "ok";
  if (a.valido_ate < hojeISO()) return "vencido";
  if (a.valido_ate <= somarDias(30)) return "vence";
  return "ok";
}

function precisaAtencao(u) {
  if (!u.papel) return true;   // sem perfil: não consegue entrar
  if (u.papel !== "cliente" || !u.ativo) return false;
  return !u.acessos.length || u.acessos.some(a => situacaoAcesso(a) !== "ok");
}

const nomeSistema = (id) => { const c = Store.categoria(id); return c ? c.nome : id; };

/* ================= ENTRADA ================= */
export async function desenharUsuarios(corpo) {
  U.corpo = corpo;
  corpo.addEventListener("click", aoClicar);
  corpo.addEventListener("input", (e) => {
    if (e.target.id !== "usr-q") return;
    U.termo = e.target.value;
    pintarLista();
  });
  corpo.innerHTML = `<div class="adm-carregando"><span></span><span></span><span></span></div>`;
  await recarregar();
}

const faltaSql = (e) => /PGRST202|42883/.test(String(e && e.code)) ||
  /could not find the function|does not exist/i.test(String(e && e.message));

async function recarregar() {
  const { data, error } = await sb.rpc("portal_admin_listar_usuarios");
  if (!U.corpo || !U.corpo.isConnected) return;

  if (error) {
    console.error(error);
    U.corpo.innerHTML = faltaSql(error)
      ? estadoVazio(ICONE.usuarios, "Falta um passo no banco de dados",
          "Para gerenciar usuários por aqui, rode o arquivo <b>banco/usuarios.sql</b> no Supabase (SQL Editor &gt; New query &gt; Run) e recarregue a página.")
      : estadoVazio(ICONE.alerta, "Não foi possível carregar os usuários", esc(error.message || ""));
    return;
  }

  U.lista = (data || []).map(u => ({ ...u, acessos: Array.isArray(u.acessos) ? u.acessos : [] }));
  desenhar();
}

/* ================= TELA ================= */
function desenhar() {
  const L = U.lista;
  const clientes = L.filter(u => u.papel === "cliente");
  const vencendo = clientes.filter(u => u.ativo && u.acessos.some(a => situacaoAcesso(a) !== "ok")).length;
  const inativas = L.filter(u => u.papel && !u.ativo).length;
  const atencao = L.filter(precisaAtencao).length;

  U.corpo.innerHTML = `
    <div class="adm-stats">
      <div class="adm-stat"><span class="adm-stat-ico">${ICONE.usuarios}</span><div><strong>${L.length}</strong><small>${L.length === 1 ? "Conta" : "Contas"}</small></div></div>
      <div class="adm-stat"><span class="adm-stat-ico">${ICONE.usuario}</span><div><strong>${clientes.length}</strong><small>${clientes.length === 1 ? "Cliente" : "Clientes"}</small></div></div>
      <div class="adm-stat${vencendo ? " alerta" : ""}"><span class="adm-stat-ico">${ICONE.relogio}</span><div><strong>${vencendo}</strong><small>Acesso vencendo ou vencido</small></div></div>
      <div class="adm-stat"><span class="adm-stat-ico">${ICONE.bloquear}</span><div><strong>${inativas}</strong><small>${inativas === 1 ? "Desativada" : "Desativadas"}</small></div></div>
    </div>

    <div class="adm-ferramentas">
      <label class="adm-busca">${ICONE.busca}<input type="search" id="usr-q" placeholder="Buscar por nome ou e-mail" value="${esc(U.termo)}" autocomplete="off" aria-label="Buscar usuário"></label>
      <div class="adm-filtros" role="group" aria-label="Filtrar">
        ${Object.keys(FILTROS).map(k => {
          const n = k === "atencao" ? atencao : L.filter(FILTROS[k].teste).length;
          if (k === "atencao" && !n) return "";
          return `<button type="button" class="adm-chip${U.filtro === k ? " ativo" : ""}${k === "atencao" ? " atencao" : ""}" data-acao="filtro" data-filtro="${k}" aria-pressed="${U.filtro === k}">${FILTROS[k].rotulo}<span>${n}</span></button>`;
        }).join("")}
      </div>
      <button type="button" class="btn principal" data-acao="novo">${ICONE.mais}Novo usuário</button>
    </div>

    <div class="adm-usuarios" id="usr-lista"></div>`;

  pintarLista();
}

function pintarLista() {
  const alvo = document.getElementById("usr-lista");
  if (!alvo) return;
  if (U.filtro === "atencao" && !U.lista.some(precisaAtencao)) U.filtro = "todos";
  const termo = normTexto(U.termo.trim());
  const lista = U.lista
    .filter(FILTROS[U.filtro].teste)
    .filter(u => !termo || normTexto((u.nome || "") + " " + (u.email || "")).includes(termo));

  if (!lista.length) {
    alvo.innerHTML = U.lista.length
      ? estadoVazio(ICONE.busca, "Ninguém encontrado", "Tente outro nome ou e-mail, ou mude o filtro.")
      : estadoVazio(ICONE.usuarios, "Nenhuma conta ainda", "Clique em <b>Novo usuário</b> para criar a primeira.");
    return;
  }

  alvo.innerHTML = `
    <div class="adm-usr adm-usr-cab" aria-hidden="true">
      <span></span><span>Pessoa</span><span>Perfil</span><span>Sistemas liberados</span><span>Último acesso</span><span></span>
    </div>
    ${lista.map(linhaUsuario).join("")}`;
}

function iniciais(u) {
  const base = String(u.nome || u.email || "?").replace(/@.*/, "").trim();
  const partes = base.split(/[\s._-]+/).filter(Boolean);
  return ((partes[0] || "?")[0] + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

function matiz(texto) {
  let h = 0;
  for (const ch of String(texto)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function pillsSistemas(u) {
  if (!u.papel) return '<span class="adm-muda">—</span>';
  if (u.papel !== "cliente") return '<span class="adm-pill neutro">Todos os sistemas</span>';
  if (!u.acessos.length) return '<span class="adm-pill vencido">Nenhum sistema</span>';
  return u.acessos.map(a => {
    const sit = situacaoAcesso(a);
    const dica = a.valido_ate ? (sit === "vencido" ? "Venceu em " : "Válido até ") + dataBR(a.valido_ate) : "Sem data de validade";
    const extra = sit === "vencido" ? " · vencido" : sit === "vence" ? " · até " + dataBR(a.valido_ate).slice(0, 5) : "";
    return `<span class="adm-pill${sit === "ok" ? "" : " " + sit}" title="${esc(dica)}">${esc(nomeSistema(a.categoria_id))}${extra}</span>`;
  }).join("");
}

function linhaUsuario(u) {
  const eu = u.id === Auth.id();
  const base = `data-id="${esc(u.id)}"`;
  const papel = u.papel
    ? `<span class="adm-papel papel-${esc(u.papel)}">${esc((PAPEIS[u.papel] || {}).rotulo || u.papel)}</span>`
    : '<span class="adm-papel papel-sem" title="Esta conta existe no login, mas ainda não tem perfil no portal. Clique em Configurar.">Sem perfil</span>';

  return `
    <article class="adm-usr${u.papel && !u.ativo ? " inativo" : ""}">
      <span class="adm-avatar" style="--matiz:${matiz(u.email || u.id)}" aria-hidden="true">${esc(iniciais(u))}</span>
      <div class="adm-usr-id">
        <strong>${esc(u.nome || (u.email || "").replace(/@.*/, ""))}${eu ? ' <span class="adm-voce">você</span>' : ""}</strong>
        <small>${esc(u.email || "")}</small>
      </div>
      <div class="adm-usr-papel">${papel}${u.papel && !u.ativo ? '<span class="adm-badge">Desativada</span>' : ""}</div>
      <div class="adm-usr-sis">${pillsSistemas(u)}</div>
      <div class="adm-usr-meta" title="${u.ultimo_acesso ? "Último login: " + esc(new Date(u.ultimo_acesso).toLocaleString("pt-BR")) : ""}">
        ${esc(tempoAtras(u.ultimo_acesso))}<small>Desde ${esc(dataBR(u.criado_em))}</small>
      </div>
      <div class="adm-acoes">
        ${u.papel ? botaoIcone("editar", ICONE.editar, "Editar", base) : `<button type="button" class="adm-mini-btn" data-acao="editar" ${base}>Configurar</button>`}
        ${botaoIcone("senha", ICONE.chave, "Trocar senha", base)}
        ${u.papel && !eu ? botaoIcone("alternar", u.ativo ? ICONE.bloquear : ICONE.ativar, u.ativo ? "Desativar conta" : "Reativar conta", base) : ""}
        ${!eu ? botaoIcone("excluir", ICONE.lixo, "Excluir conta", base, "perigo") : ""}
      </div>
    </article>`;
}

/* ================= AÇÕES ================= */
async function aoClicar(e) {
  const b = e.target.closest("[data-acao]");
  if (!b || !U.corpo.contains(b)) return;
  e.preventDefault();
  const acao = b.dataset.acao;

  if (acao === "filtro") {
    U.filtro = b.dataset.filtro;
    U.corpo.querySelectorAll(".adm-chip").forEach(c => {
      const ativo = c.dataset.filtro === U.filtro;
      c.classList.toggle("ativo", ativo);
      c.setAttribute("aria-pressed", ativo);
    });
    return pintarLista();
  }
  if (acao === "novo") return formularioUsuario(null);

  const u = U.lista.find(x => x.id === b.dataset.id);
  if (!u) return;
  try {
    if (acao === "editar") return formularioUsuario(u);
    if (acao === "senha") return janelaSenha(u);
    if (acao === "excluir") return excluirUsuario(u);
    if (acao === "alternar") {
      const { error } = await sb.rpc("portal_admin_salvar_usuario", {
        p_user: u.id, p_nome: u.nome, p_papel: u.papel, p_ativo: !u.ativo, p_acessos: null
      });
      if (error) throw error;
      await recarregar();
      avisar(u.ativo ? "Conta desativada. A pessoa não consegue mais entrar." : "Conta reativada.");
    }
  } catch (err) {
    console.error(err);
    avisar(err.message || String(err), true);
  }
}

/* ================= SENHAS ================= */
function gerarSenha() {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const n = new Uint32Array(10);
  crypto.getRandomValues(n);
  return Array.from(n, x => letras[x % letras.length]).join("");
}

function campoSenha(id) {
  return `
    <label class="adm-campo" for="${id}"><span>Senha *</span>
      <div class="adm-senha">
        <input id="${id}" type="text" autocomplete="new-password" spellcheck="false" minlength="6">
        <button type="button" class="adm-mini-btn" data-gerar="${id}">${ICONE.gerar}Gerar</button>
      </div>
      <small>Pelo menos 6 caracteres. Use "Gerar" para criar uma senha forte.</small>
    </label>`;
}

function ligarGerador(form) {
  form.querySelectorAll("[data-gerar]").forEach(b => b.addEventListener("click", () => {
    const campo = form.querySelector("#" + b.dataset.gerar);
    campo.value = gerarSenha();
    campo.focus();
    campo.select();
  }));
}

// depois de criar a conta ou trocar a senha: mostra os dados para enviar à pessoa
function mostrarCredenciais(titulo, email, senha) {
  const texto = `Acesso ao portal da Teks Software\nE-mail: ${email}\nSenha: ${senha}\n${location.origin}${location.pathname}`;
  const j = abrirJanela({
    icone: ICONE.ok, titulo, semSalvar: true, textoCancelar: "Fechar",
    corpo: `
      <p class="adm-muda">Envie estes dados para a pessoa. Por segurança, a senha não fica salva em lugar nenhum para consulta depois.</p>
      <div class="adm-cred">
        <div><small>E-mail</small><strong>${esc(email)}</strong></div>
        <div><small>Senha</small><strong class="adm-mono">${esc(senha)}</strong></div>
      </div>
      <button type="button" class="btn principal adm-copiar" id="adm-copiar">${ICONE.copiar}Copiar dados de acesso</button>`
  });
  j.form.querySelector("#adm-copiar").addEventListener("click", async (e) => {
    try { await copiarTexto(texto); e.currentTarget.innerHTML = ICONE.ok + "Copiado!"; }
    catch (x) { j.mostrarErro("Não consegui copiar. Selecione o texto e copie manualmente."); }
  });
}

function janelaSenha(u) {
  abrirJanela({
    icone: ICONE.chave, titulo: "Trocar senha", subtitulo: u.nome ? `${u.nome} · ${u.email}` : u.email,
    textoSalvar: "Salvar nova senha",
    corpo: campoSenha("usr-senha") + '<p class="adm-muda adm-nota">A senha antiga deixa de funcionar na hora.</p>',
    aoAbrir: ligarGerador,
    async aoSalvar(form) {
      const senha = form.querySelector("#usr-senha").value.trim();
      if (senha.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
      const { error } = await sb.rpc("portal_admin_definir_senha", { p_user: u.id, p_senha: senha });
      if (error) throw error;
      setTimeout(() => mostrarCredenciais("Senha alterada", u.email, senha), 0);
    }
  });
}

/* ================= CRIAR / EDITAR ================= */
function formularioUsuario(u) {
  const editando = !!u;
  const eu = editando && u.id === Auth.id();
  const papelAtual = (u && u.papel) || "cliente";
  const meus = new Map(((u && u.acessos) || []).map(a => [String(a.categoria_id), a.valido_ate || ""]));
  const sistemas = Store.todos("categorias").slice().sort(porOrdem);

  const corpo = `
    <div class="adm-grade2">
      <label class="adm-campo" for="usr-nome"><span>Nome</span>
        <input id="usr-nome" type="text" value="${esc((u && u.nome) || "")}" autocomplete="off" placeholder="Ex.: Restaurante Sabor Caseiro">
      </label>
      ${editando
        ? `<div class="adm-campo"><span>E-mail</span><input type="text" value="${esc(u.email || "")}" readonly tabindex="-1" class="adm-readonly"></div>`
        : `<label class="adm-campo" for="usr-email"><span>E-mail *</span><input id="usr-email" type="email" autocomplete="off" placeholder="cliente@empresa.com.br"></label>`}
    </div>
    ${editando ? "" : campoSenha("usr-senha")}

    <fieldset class="adm-campo adm-fieldset"${eu ? " disabled" : ""}>
      <legend>Perfil${eu ? " <small>(você não pode mudar o seu próprio perfil)</small>" : ""}</legend>
      <div class="adm-opcoes">
        ${Object.keys(PAPEIS).map(k => `
          <label class="adm-opcao">
            <input type="radio" name="usr-papel" value="${k}"${papelAtual === k ? " checked" : ""}>
            <strong>${PAPEIS[k].rotulo}</strong><small>${PAPEIS[k].desc}</small>
          </label>`).join("")}
      </div>
    </fieldset>

    <fieldset class="adm-campo adm-fieldset" id="usr-sistemas-box">
      <legend>Sistemas liberados</legend>
      ${sistemas.length ? `
        <div class="adm-sistemas">
          ${sistemas.map(s => {
            const tem = meus.has(String(s.id));
            return `
              <div class="adm-sis-linha${tem ? " marcado" : ""}">
                <label class="adm-check"><input type="checkbox" data-sis="${esc(s.id)}"${tem ? " checked" : ""}> ${esc(s.nome)}${s.ativo ? "" : ' <span class="adm-badge">Rascunho</span>'}</label>
                <label class="adm-validade"><span>Válido até</span>
                  <input type="date" data-validade="${esc(s.id)}" value="${esc(meus.get(String(s.id)) || "")}"${tem ? "" : " disabled"} aria-label="Válido até (${esc(s.nome)})">
                </label>
              </div>`;
          }).join("")}
        </div>
        <small class="adm-dica">Deixe a data vazia para liberar sem prazo. Depois da data, o sistema aparece com cadeado para o cliente.</small>`
        : '<p class="adm-muda">Nenhum sistema cadastrado ainda. Crie os sistemas na aba Conteúdo.</p>'}
    </fieldset>

    <label class="adm-check adm-check-destaque"${eu ? ' hidden' : ""}><input type="checkbox" id="usr-ativo"${!editando || u.ativo || !u.papel ? " checked" : ""}> Conta ativa (pode entrar no portal)</label>`;

  abrirJanela({
    icone: editando ? ICONE.usuario : ICONE.mais,
    titulo: editando ? (u.papel ? "Editar usuário" : "Configurar conta") : "Novo usuário",
    subtitulo: editando ? u.email : "A conta já sai pronta para entrar, sem precisar confirmar e-mail.",
    larga: true,
    textoSalvar: editando ? "Salvar alterações" : "Criar conta",
    corpo,
    aoAbrir(form) {
      ligarGerador(form);
      const box = form.querySelector("#usr-sistemas-box");
      const atualizarPapel = () => {
        const p = (form.querySelector("input[name=usr-papel]:checked") || {}).value;
        box.hidden = p !== "cliente";
      };
      form.querySelectorAll("input[name=usr-papel]").forEach(r => r.addEventListener("change", atualizarPapel));
      atualizarPapel();
      form.querySelectorAll("[data-sis]").forEach(c => c.addEventListener("change", () => {
        const data = form.querySelector(`[data-validade="${CSS.escape(c.dataset.sis)}"]`);
        data.disabled = !c.checked;
        c.closest(".adm-sis-linha").classList.toggle("marcado", c.checked);
      }));
    },
    async aoSalvar(form) {
      const nome = form.querySelector("#usr-nome").value.trim();
      const papel = eu ? "admin" : (form.querySelector("input[name=usr-papel]:checked") || {}).value;
      const ativo = eu ? true : form.querySelector("#usr-ativo").checked;
      if (!papel) throw new Error("Escolha o perfil.");

      const acessos = papel === "cliente"
        ? [...form.querySelectorAll("[data-sis]:checked")].map(c => ({
            categoria_id: c.dataset.sis,
            valido_ate: form.querySelector(`[data-validade="${CSS.escape(c.dataset.sis)}"]`).value || null
          }))
        : null;

      if (editando) {
        const { error } = await sb.rpc("portal_admin_salvar_usuario", {
          p_user: u.id, p_nome: nome, p_papel: papel, p_ativo: ativo, p_acessos: acessos
        });
        if (error) throw error;
        await recarregar();
        avisar("Alterações salvas.");
        return;
      }

      const email = form.querySelector("#usr-email").value.trim().toLowerCase();
      const senha = form.querySelector("#usr-senha").value.trim();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Digite um e-mail válido.");
      if (senha.length < 6) throw new Error("A senha precisa ter pelo menos 6 caracteres.");
      if (papel === "cliente" && !acessos.length &&
          !window.confirm("Nenhum sistema foi marcado. O cliente vai entrar, mas não verá nenhum curso. Criar assim mesmo?")) return false;

      const { error } = await sb.rpc("portal_admin_criar_usuario", {
        p_email: email, p_senha: senha, p_nome: nome, p_papel: papel, p_ativo: ativo, p_acessos: acessos || []
      });
      if (error) throw error;
      await recarregar();
      setTimeout(() => mostrarCredenciais("Conta criada", email, senha), 0);
    }
  });
}

/* ================= EXCLUIR ================= */
async function excluirUsuario(u) {
  const ok = await confirmar({
    titulo: "Excluir conta?",
    textoSalvar: "Excluir conta",
    texto: `<p><strong>${esc(u.nome || u.email)}</strong>${u.nome ? `<br><span class="adm-muda">${esc(u.email)}</span>` : ""}</p>
      <p>A pessoa perde o acesso e o login é apagado, junto com os sistemas liberados.</p>
      <p class="adm-muda">Essa ação não pode ser desfeita. Se quiser só bloquear por um tempo, use <b>Desativar</b>.</p>`
  });
  if (!ok) return;
  try {
    const { error } = await sb.rpc("portal_admin_excluir_usuario", { p_user: u.id });
    if (error) throw error;
    await recarregar();
    avisar("Conta excluída.");
  } catch (err) {
    console.error(err);
    avisar(err.message || String(err), true);
  }
}
