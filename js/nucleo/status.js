// Mostra no console do navegador (F12 > Console) uma linha dizendo se o site carregou e conectou ao banco.
// Os clientes não veem nada disso. Para conferir de novo, digite  teksStatus()  no console.
import { sb } from "../config/supabase.js";

export async function mostrarStatus() {
  const { error } = await sb.from("categorias").select("id", { count: "exact", head: true });
  if (error) console.log("Site Teks Software: sem conexão com o banco de dados.");
  else console.log("Site Teks Software carregado com sucesso!");
}

window.teksStatus = mostrarStatus;
