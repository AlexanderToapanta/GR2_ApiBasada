import os
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

def procesar_y_almacenar(directorio_archivos: str):
    reader = SimpleDirectoryReader(directorio_archivos)
    documents = reader.load_data()

    db = chromadb.PersistentClient(path=DB_PATH)
    chroma_collection = db.get_or_create_collection(COLLECTION_NAME)
    vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    index = VectorStoreIndex.from_documents(
        documents, storage_context=storage_context
    )
    
    return f"Procesados {len(documents)} documentos con éxito usando Groq." 
