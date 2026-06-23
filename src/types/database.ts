export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          auth_user_id?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          email?: string | null;
          created_at?: string;
        };
      };
      wines: {
        Row: {
          id: string;
          user_id: string;
          producer: string;
          name: string;
          vintage: number | null;
          wine_type: "red" | "white" | "rose" | "sparkling" | "dessert" | "fortified";
          varietals: string[];
          region: string | null;
          country: string | null;
          alcohol_pct: number | null;
          quantity: number;
          cost_per_bottle: number | null;
          price_band: "under_100" | "101_200" | "201_300" | "301_500" | "500_plus" | null;
          price_source: "user" | "web_estimate" | "unknown" | null;
          currency: string;
          purchase_date: string | null;
          location: string | null;
          notes: string | null;
          photo_path: string | null;
          extraction_meta: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["wines"]["Row"]> &
          Pick<Database["public"]["Tables"]["wines"]["Row"], "user_id" | "producer" | "name" | "wine_type">;
        Update: Partial<Database["public"]["Tables"]["wines"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
