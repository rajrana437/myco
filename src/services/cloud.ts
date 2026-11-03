import { supabase } from "@/lib/supabase";

export type Tent = {
  id: string;
  user_id: string;
  name: string;
  species: string | null;
  created_at: string;
  updated_at: string;
};

export type CloudReading = {
  id: number;
  tent_id: string;
  temperature: number | null;
  humidity: number | null;
  humidifier_on: boolean | null;
  fan_on: boolean | null;
  sensor_ok: boolean | null;
  recorded_at: string;
};

export async function listMyTents(): Promise<Tent[]> {
  const { data, error } = await supabase
    .from("tents")
    .select("id,user_id,name,species,created_at,updated_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Tent[];
}

export async function createTent(input: { name: string; species?: string | null }): Promise<Tent> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Sign in before creating a grow tent.");

  const { data, error } = await supabase
    .from("tents")
    .insert({
      user_id: authData.user.id,
      name: input.name.trim(),
      species: input.species?.trim() || null,
    })
    .select("id,user_id,name,species,created_at,updated_at")
    .single();
  if (error) throw error;
  return data as Tent;
}

export async function getLatestReadings(tentId: string, limit = 100): Promise<CloudReading[]> {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit), 500));
  const { data, error } = await supabase
    .from("readings")
    .select("id,tent_id,temperature,humidity,humidifier_on,fan_on,sensor_ok,recorded_at")
    .eq("tent_id", tentId)
    .order("recorded_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw error;
  return (data ?? []) as CloudReading[];
}
