"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { esSuperAdmin, getUsuarioActual } from "@/lib/supabase/server";

function leerCamposBot(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    empresa: String(formData.get("empresa") ?? "").trim(),
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    color_primario: String(formData.get("color_primario") ?? "#000000"),
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    whatsapp_numero:
      String(formData.get("whatsapp_numero") ?? "").trim() || null,
    activo: formData.get("activo") === "on",
  };
}

export async function createBotAction(formData: FormData) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    redirect("/admin/login");
  }

  const campos = leerCamposBot(formData);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("bots")
    .insert({ ...campos, owner_id: usuario.id });

  if (error) {
    throw new Error(`No se pudo crear el bot: ${error.message}`);
  }

  revalidatePath("/admin/bots");
  redirect("/admin/bots");
}

export async function updateBotAction(id: string, formData: FormData) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    redirect("/admin/login");
  }

  const campos = leerCamposBot(formData);
  const supabase = createAdminClient();

  let query = supabase.from("bots").update(campos).eq("id", id);
  if (!esSuperAdmin(usuario)) {
    query = query.eq("owner_id", usuario.id);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`No se pudo actualizar el bot: ${error.message}`);
  }

  revalidatePath("/admin/bots");
  redirect("/admin/bots");
}

export async function deleteBotAction(id: string) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    redirect("/admin/login");
  }

  const supabase = createAdminClient();

  let query = supabase.from("bots").delete().eq("id", id);
  if (!esSuperAdmin(usuario)) {
    query = query.eq("owner_id", usuario.id);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`No se pudo eliminar el bot: ${error.message}`);
  }

  revalidatePath("/admin/bots");
}
