"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { esSuperAdmin, getUsuarioActual } from "@/lib/supabase/server";

function leerCamposConocimiento(formData: FormData) {
  return {
    titulo: String(formData.get("titulo") ?? "").trim() || null,
    contenido: String(formData.get("contenido") ?? "").trim(),
  };
}

export async function createConocimientoAction(
  botId: string,
  formData: FormData
) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    redirect("/admin/login");
  }

  const campos = leerCamposConocimiento(formData);
  const supabase = createAdminClient();

  const { error } = await supabase.from("conocimiento").insert({
    ...campos,
    bot_id: botId,
    activo: true,
    owner_id: usuario.id,
  });

  if (error) {
    throw new Error(`No se pudo crear el conocimiento: ${error.message}`);
  }

  revalidatePath(`/admin/bots/${botId}/conocimiento`);
  redirect(`/admin/bots/${botId}/conocimiento`);
}

export async function updateConocimientoAction(
  botId: string,
  id: string,
  formData: FormData
) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    redirect("/admin/login");
  }

  const campos = leerCamposConocimiento(formData);
  const supabase = createAdminClient();

  let query = supabase.from("conocimiento").update(campos).eq("id", id);
  if (!esSuperAdmin(usuario)) {
    query = query.eq("owner_id", usuario.id);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`No se pudo actualizar el conocimiento: ${error.message}`);
  }

  revalidatePath(`/admin/bots/${botId}/conocimiento`);
  redirect(`/admin/bots/${botId}/conocimiento`);
}

export async function deleteConocimientoAction(botId: string, id: string) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    redirect("/admin/login");
  }

  const supabase = createAdminClient();

  let query = supabase.from("conocimiento").delete().eq("id", id);
  if (!esSuperAdmin(usuario)) {
    query = query.eq("owner_id", usuario.id);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`No se pudo eliminar el conocimiento: ${error.message}`);
  }

  revalidatePath(`/admin/bots/${botId}/conocimiento`);
}
