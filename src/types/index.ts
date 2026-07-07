export interface Bot {
  id: string;
  nombre: string;
  empresa: string;
  descripcion: string | null;
  color_primario: string;
  logo_url: string | null;
  activo: boolean;
  whatsapp_numero: string | null;
  created_at: string;
}

export type Canal = "web" | "whatsapp";

export interface Conversacion {
  id: string;
  bot_id: string;
  canal: Canal;
  identificador: string;
  created_at: string;
}

export type RolMensaje = "user" | "assistant";

export interface Mensaje {
  id: string;
  conversacion_id: string;
  rol: RolMensaje;
  contenido: string;
  created_at: string;
}

export interface Conocimiento {
  id: string;
  bot_id: string;
  titulo: string | null;
  contenido: string;
  activo: boolean;
  created_at: string;
}
