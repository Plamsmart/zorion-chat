"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const campos = leerCamposConocimiento(formData);
  const supabase = createAdminClient();

  const { error } = await supabase.from("conocimiento").insert({
    ...campos,
    bot_id: botId,
    activo: true,
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
  const campos = leerCamposConocimiento(formData);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("conocimiento")
    .update(campos)
    .eq("id", id);

  if (error) {
    throw new Error(`No se pudo actualizar el conocimiento: ${error.message}`);
  }

  revalidatePath(`/admin/bots/${botId}/conocimiento`);
  redirect(`/admin/bots/${botId}/conocimiento`);
}

export async function deleteConocimientoAction(botId: string, id: string) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("conocimiento").delete().eq("id", id);

  if (error) {
    throw new Error(`No se pudo eliminar el conocimiento: ${error.message}`);
  }

  revalidatePath(`/admin/bots/${botId}/conocimiento`);
}
