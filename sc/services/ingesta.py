import os
import json
from dotenv import load_dotenv
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, Settings
from llama_index.llms.groq import Groq
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb

load_dotenv()

# Configuración global de LlamaIndex
# Usamos Groq para el modelo de lenguaje (Llama 3, por ejemplo)
# Usamos un modelo de HuggingFace para los embeddings (gratis y local)
Settings.llm = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
Settings.embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")

DB_PATH = "./data/chroma_db"
COLLECTION_NAME = "documentos_usuario"
DOCUMENTS_METADATA_FILE = "./data/documents_metadata.json"

def get_documents_metadata():
    """Lee el archivo de metadata de documentos"""
    if os.path.exists(DOCUMENTS_METADATA_FILE):
        try:
            with open(DOCUMENTS_METADATA_FILE, "r") as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_documents_metadata(metadata: dict):
    """Guarda el archivo de metadata de documentos"""
    os.makedirs(os.path.dirname(DOCUMENTS_METADATA_FILE), exist_ok=True)
    with open(DOCUMENTS_METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)

def procesar_y_almacenar(directorio_archivos: str, filename: str = None):
    reader = SimpleDirectoryReader(directorio_archivos)
    documents = reader.load_data()

    db = chromadb.PersistentClient(path=DB_PATH)
    chroma_collection = db.get_or_create_collection(COLLECTION_NAME)
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    index = VectorStoreIndex.from_documents(
        documents, storage_context=storage_context
    )
    
    # Guardar metadata del documento
    metadata = get_documents_metadata()
    doc_id = filename or f"doc_{len(metadata) + 1}"
    metadata[doc_id] = {
        "filename": filename or "unknown",
        "num_docs": len(documents),
        "status": "processed"
    }
    save_documents_metadata(metadata)
    
    return f"Procesados {len(documents)} documentos con éxito usando Groq." 
