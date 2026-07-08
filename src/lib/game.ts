import { supabase } from "@/integrations/supabase/client";

export type Room = {
  id: string;
  code: string;
  admin_client_id: string;
  current_round_id: string | null;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  client_id: string;
  name: string;
  score: number;
  joined_at: string;
};

export type Round = {
  id: string;
  room_id: string;
  word_chooser_id: string;
  imposter_id: string | null;
  word: string | null;
  status: "choosing_word" | "active" | "ended";
  created_at: string;
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars

function generateCode(len = 5): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export async function createRoom(clientId: string, nickname: string): Promise<{ room: Room; player: Player }> {
  // Try a handful of times in the extremely unlikely case of code collision.
  for (let i = 0; i < 5; i++) {
    const code = generateCode();
    const { data: room, error } = await supabase
      .from("rooms")
      .insert({ code, admin_client_id: clientId })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") continue; // unique violation on code
      throw error;
    }
    const { data: player, error: pErr } = await supabase
      .from("players")
      .insert({ room_id: room.id, client_id: clientId, name: nickname })
      .select()
      .single();
    if (pErr) throw pErr;
    return { room: room as Room, player: player as Player };
  }
  throw new Error("Nepodarilo sa vygenerovať kód space, skús to znovu.");
}

export async function findRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return (data as Room) ?? null;
}

export async function joinRoom(code: string, clientId: string, nickname: string): Promise<{ room: Room; player: Player }> {
  const room = await findRoomByCode(code);
  if (!room) throw new Error("Space s týmto kódom neexistuje.");

  // If player already exists (same client), just update name.
  const { data: existing } = await supabase
    .from("players")
    .select("*")
    .eq("room_id", room.id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing) {
    if (existing.name !== nickname) {
      await supabase.from("players").update({ name: nickname }).eq("id", existing.id);
    }
    return { room, player: { ...(existing as Player), name: nickname } };
  }

  const { data: player, error } = await supabase
    .from("players")
    .insert({ room_id: room.id, client_id: clientId, name: nickname })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: p2 } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .eq("client_id", clientId)
        .single();
      return { room, player: p2 as Player };
    }
    throw error;
  }
  return { room, player: player as Player };
}

export async function startRound(roomId: string, players: Player[]): Promise<Round> {
  if (players.length < 3) throw new Error("Na spustenie kola potrebujete aspoň 3 hráčov.");
  const chooser = players[Math.floor(Math.random() * players.length)];
  const { data: round, error } = await supabase
    .from("rounds")
    .insert({
      room_id: roomId,
      word_chooser_id: chooser.id,
      status: "choosing_word",
    })
    .select()
    .single();
  if (error) throw error;
  await supabase.from("rooms").update({ current_round_id: round.id }).eq("id", roomId);
  return round as Round;
}

export async function submitWord(round: Round, word: string, players: Player[]): Promise<void> {
  // Imposter is anyone except the word chooser.
  const candidates = players.filter((p) => p.id !== round.word_chooser_id);
  if (candidates.length === 0) throw new Error("Nie sú dostupní hráči na impostera.");
  const imposter = candidates[Math.floor(Math.random() * candidates.length)];
  const { error } = await supabase
    .from("rounds")
    .update({
      word: word.trim(),
      imposter_id: imposter.id,
      status: "active",
    })
    .eq("id", round.id);
  if (error) throw error;
}

export async function endRound(roundId: string): Promise<void> {
  const { error } = await supabase.from("rounds").update({ status: "ended" }).eq("id", roundId);
  if (error) throw error;
}

export async function adjustScore(playerId: string, delta: number): Promise<void> {
  const { data: p, error } = await supabase.from("players").select("score").eq("id", playerId).single();
  if (error) throw error;
  const next = Math.max(0, ((p as { score: number }).score ?? 0) + delta);
  await supabase.from("players").update({ score: next }).eq("id", playerId);
}

export async function clearCurrentRound(roomId: string): Promise<void> {
  await supabase.from("rooms").update({ current_round_id: null }).eq("id", roomId);
}
