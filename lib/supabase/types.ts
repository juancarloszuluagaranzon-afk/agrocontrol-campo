/**
 * Tipos de la base de datos.
 *
 * PROVISIONAL: escritos a mano a partir de `supabase/migrations` /
 * `supabase_suertes.sql`. Cuando exista la instancia real se reemplazan por la
 * salida de `supabase gen types typescript` (§7, §9) y se versionan aquí.
 *
 * Cubre las tablas definidas hoy en el SQL: `suertes`, `maquinaria`,
 * `programacion`. Las tablas `mediciones` y `audit_log` (§9) se añadirán en la
 * Fase 4.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      suertes: {
        Row: {
          sec_ste: string;
          suerte: string | null;
          sector: string | null;
          hacienda: string | null;
          planta: string | null;
          supervisor: string | null;
          jefe_zona: string | null;
          ha_oficial: number | null;
          lat: number | null;
          lon: number | null;
          geom: Json | null;
        };
        Insert: {
          sec_ste: string;
          suerte?: string | null;
          sector?: string | null;
          hacienda?: string | null;
          planta?: string | null;
          supervisor?: string | null;
          jefe_zona?: string | null;
          ha_oficial?: number | null;
          lat?: number | null;
          lon?: number | null;
          geom?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["suertes"]["Insert"]>;
        Relationships: [];
      };
      maquinaria: {
        Row: {
          id: number;
          tipo: string;
          identificacion: string | null;
          estado: string | null;
          creado_en: string | null;
        };
        Insert: {
          id?: number;
          tipo: string;
          identificacion?: string | null;
          estado?: string | null;
          creado_en?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["maquinaria"]["Insert"]>;
        Relationships: [];
      };
      programacion: {
        Row: {
          id: number;
          fecha: string;
          maquinaria_id: number | null;
          sec_ste: string | null;
          operador: string | null;
          labor: string | null;
          zona: number | null;
          avance: number | null;
          observaciones: string | null;
          creado_en: string | null;
        };
        Insert: {
          id?: number;
          fecha: string;
          maquinaria_id?: number | null;
          sec_ste?: string | null;
          operador?: string | null;
          labor?: string | null;
          zona?: number | null;
          avance?: number | null;
          observaciones?: string | null;
          creado_en?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["programacion"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "programacion_maquinaria_id_fkey";
            columns: ["maquinaria_id"];
            referencedRelation: "maquinaria";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programacion_sec_ste_fkey";
            columns: ["sec_ste"];
            referencedRelation: "suertes";
            referencedColumns: ["sec_ste"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
