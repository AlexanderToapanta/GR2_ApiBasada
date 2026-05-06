const BASE = "http://127.0.0.1:8000";

export async function sendMessage(question: string, selectedDocs?: string[]): Promise<string> {
  const res = await fetch(`${BASE}/chat/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pregunta: question,
      selected_docs: selectedDocs || []
    })
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

export async function getDocuments(): Promise<any[]> {
  const res = await fetch(`${BASE}/documents/`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.documents || [];
}
