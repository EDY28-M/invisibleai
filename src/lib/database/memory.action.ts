import { getDatabase } from "./config";

export interface GlobalMemoryFact {
  id: string;
  conversation_id: string;
  fact: string;
  created_at: number;
  updated_at: number;
}

export async function upsertMemoryFact(
  conversationId: string,
  fact: string
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  try {

    const existing = await db.select<GlobalMemoryFact[]>(
      "SELECT id FROM global_memory_facts WHERE conversation_id = ?",
      [conversationId]
    );

    if (existing && existing.length > 0) {
      await db.execute(
        "UPDATE global_memory_facts SET fact = ?, updated_at = ? WHERE conversation_id = ?",
        [fact, now, conversationId]
      );
    } else {
      const id = "mem_" + crypto.randomUUID();
      await db.execute(
        "INSERT INTO global_memory_facts (id, conversation_id, fact, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        [id, conversationId, fact, now, now]
      );
    }
  } catch (error) {
    console.error("Failed to upsert memory fact:", error);
    throw error;
  }
}

export async function getGlobalMemoryContext(limit: number = 10): Promise<string> {
  const db = await getDatabase();

  try {
    const facts = await db.select<GlobalMemoryFact[]>(
      "SELECT fact FROM global_memory_facts ORDER BY updated_at DESC LIMIT ?",
      [limit]
    );

    if (!facts || facts.length === 0) {

      try {
        const { getAllConversations } = await import("./chat-history.action");
        const allConvs = await getAllConversations();
        if (allConvs.length > 0) {
          const recent = allConvs.slice(0, 5);
          return "Aún no hay hechos detallados, pero estas son nuestras sesiones recientes:\n" +
            recent.map((c) => `- Sesión: "${c.title}"`).join("\n");
        }
      } catch (err) {
        console.error("Failed to load fallback conversations:", err);
      }
      return "";
    }

    return facts.map((f) => `- ${f.fact}`).join("\n");
  } catch (error) {
    console.error("Failed to fetch global memory context:", error);
    return "";
  }
}

export async function deleteMemoryFact(conversationId: string): Promise<void> {
  const db = await getDatabase();
  try {
    await db.execute("DELETE FROM global_memory_facts WHERE conversation_id = ?", [
      conversationId,
    ]);
  } catch (error) {
    console.error(`Failed to delete memory fact for conversation ${conversationId}:`, error);
  }
}

export async function clearAllMemoryFacts(): Promise<void> {
  const db = await getDatabase();
  try {
    await db.execute("DELETE FROM global_memory_facts");
  } catch (error) {
    console.error("Failed to clear all memory facts:", error);
  }
}
