/**
 * Parse a stored Excalidraw scene JSON string into a loose object shape.
 * Returns `null` on parse failure or empty input; callers cast to the specific
 * `initialData` type their Excalidraw variant expects.
 *
 * Shared between the main editor and the read-only shared viewer to avoid
 * duplicating the parse + fallback logic.
 */
export function parseScene(
  raw: string | null | undefined
): { elements: unknown[]; appState: Record<string, unknown> } | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { elements?: unknown[]; appState?: Record<string, unknown> };
    return {
      elements: Array.isArray(parsed.elements) ? parsed.elements : [],
      appState: parsed.appState ?? {},
    };
  } catch {
    return null;
  }
}
