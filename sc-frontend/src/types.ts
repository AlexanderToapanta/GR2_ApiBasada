export interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  ts: Date;
}

export interface Document {
  id: string;
  filename: string;
  status: string;
}
