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
      inventory_events: {
        Row: {
          id: string;
          user_id: string;
          wine_id: string;
          event_type: "purchase" | "adjustment" | "consume";
          quantity_delta: number;
          note: string | null;
          source: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["inventory_events"]["Row"]> &
          Pick<
            Database["public"]["Tables"]["inventory_events"]["Row"],
            "user_id" | "wine_id" | "event_type" | "quantity_delta"
          >;
        Update: Partial<Database["public"]["Tables"]["inventory_events"]["Row"]>;
      };
      preference_profiles: {
        Row: {
          user_id: string;
          structured: Json;
          summary: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          structured?: Json;
          summary?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["preference_profiles"]["Row"]>;
      };
      recommendations: {
        Row: {
          id: string;
          user_id: string;
          occasion: string;
          cuisine: string;
          budget_min: number | null;
          budget_max: number | null;
          result: Json;
          accepted_wine_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["recommendations"]["Row"]> &
          Pick<
            Database["public"]["Tables"]["recommendations"]["Row"],
            "user_id" | "occasion" | "cuisine" | "result"
          >;
        Update: Partial<Database["public"]["Tables"]["recommendations"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_inventory_event: {
        Args: {
          p_user_id: string;
          p_wine_id: string;
          p_event_type: "purchase" | "adjustment" | "consume";
          p_quantity_delta: number;
          p_note?: string | null;
          p_source?: string | null;
        };
        Returns: Database["public"]["Tables"]["inventory_events"]["Row"];
      };
      create_wine_with_purchase_event: {
        Args: {
          p_user_id: string;
          p_producer: string;
          p_name: string;
          p_vintage: number | null;
          p_wine_type: "red" | "white" | "rose" | "sparkling" | "dessert" | "fortified";
          p_varietals: string[];
          p_region: string | null;
          p_country: string | null;
          p_alcohol_pct: number | null;
          p_quantity: number;
          p_cost_per_bottle: number | null;
          p_price_band: "under_100" | "101_200" | "201_300" | "301_500" | "500_plus" | null;
          p_price_source: "user" | "web_estimate" | "unknown" | null;
          p_currency: string;
          p_purchase_date: string | null;
          p_location: string | null;
          p_notes: string | null;
          p_photo_path: string | null;
          p_extraction_meta: Json | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
