"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

function leerCamposBot(formData: FormData) {
  return {
    nombre: String(formData.get("nombre") ?? "").trim(),
    empresa: String(formData.get("empresa") ?? "").trim(),
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    color_primario: String(formData.get("color_primario") ?? "#000000"),
    whatsapp_numero:
      String(formData.get("whatsapp_numero") ?? "").trim() || null,
    activo: formData.get("activo") === "on",
  };
}

export async function createBotAction(formData: FormData) {
  const campos = leerCamposBot(formData);
  const supabase = createAdminClient();

  const { error } = await supabase.from("bots").insert(campos);

  if (error) {
    throw new Error(`No se pudo crear el bot: ${error.message}`);
  }

  revalidatePath("/admin/bots");
  redirect("/admin/bots");
}

export async function updateBotAction(id: string, formData: FormData) {
  const campos = leerCamposBot(formData);
  const supabase = createAdminClient();

  const { error } = await supabase.from("bots").update(campos).eq("id", id);

  if (error) {
    throw new Error(`No se pudo actualizar el bot: ${error.message}`);
  }

  revalidatePath("/admin/bots");
  redirect("/admin/bots");
}

export async function deleteBotAction(id: string) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("bots").delete().eq("id", id);

  if (error) {
    throw new Error(`No se pudo eliminar el bot: ${error.message}`);
  }

  revalidatePath("/admin/bots");
}
