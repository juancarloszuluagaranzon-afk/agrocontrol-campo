/**
 * Tipos de la base de datos (Fase 4).
 *
 * Escritos a mano para reflejar `supabase/migrations`. Con la instancia viva se
 * pueden regenerar con `supabase gen types typescript` (§7).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Rol = "operador" | "supervisor" | "jefe_zona" | "direccion";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nombre: string | null;
          rol: Rol;
          created_at: string;
        };
        Insert: {
          id: string;
          nombre?: string | null;
          rol?: Rol;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
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
        Insert: Database["public"]["Tables"]["suertes"]["Row"];
        Update: Partial<Database["public"]["Tables"]["suertes"]["Row"]>;
        Relationships: [];
      };
      programacion: {
        Row: {
          id: string;
          fecha: string;
          tipo: string;
          identificacion: string | null;
          operador: string | null;
          sec_ste: string | null;
          hacienda: string | null;
          lat: number | null;
          lon: number | null;
          labor: string | null;
          zona: number | null;
          avance: number;
          observaciones: string;
          deleted: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          fecha: string;
          tipo: string;
          identificacion?: string | null;
          operador?: string | null;
          sec_ste?: string | null;
          hacienda?: string | null;
          lat?: number | null;
          lon?: number | null;
          labor?: string | null;
          zona?: number | null;
          avance?: number;
          observaciones?: string;
          deleted?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["programacion"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "programacion_sec_ste_fkey";
            columns: ["sec_ste"];
            referencedRelation: "suertes";
            referencedColumns: ["sec_ste"];
          },
        ];
      };
      mediciones: {
        Row: {
          id: string;
          tipo: "area" | "distancia";
          valor: number;
          unidad: string;
          geom: Json | null;
          autor: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tipo: "area" | "distancia";
          valor: number;
          unidad: string;
          geom?: Json | null;
          autor?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["mediciones"]["Insert"]>;
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          tabla: string;
          registro_id: string;
          accion: "insert" | "update" | "delete";
          autor: string | null;
          antes: Json | null;
          despues: Json | null;
          created_at: string;
        };
        Insert: {
          tabla: string;
          registro_id: string;
          accion: "insert" | "update" | "delete";
          autor?: string | null;
          antes?: Json | null;
          despues?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { rol: Rol };
    CompositeTypes: Record<string, never>;
  };
}
