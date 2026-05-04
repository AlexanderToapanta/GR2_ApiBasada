const BASE = "http://127.0.0.1:8000";

export async function sendMessage(question: string): Promise<string> {
  const res = await fetch(`${BASE}/chat/?pregunta=${encodeURIComponent(question)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.respuesta;
}

export async function ingestFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/ingestar/`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.filename;
}
