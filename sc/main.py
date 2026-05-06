import os
import shutil
import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from services.ingesta import procesar_y_almacenar, get_documents_metadata
from services.chat import consultar_chat
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción pon la URL de tu front
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directorio temporal para almacenar los archivos antes de procesarlos
UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Modelo para solicitud de chat
class ChatRequest(BaseModel):
    pregunta: str
    selected_docs: list = None

@app.get("/")
def read_root():
    return {"status": "online", "message": "Backend de Chatbot listo"}

@app.get("/documents/")
def get_documents():
    """
    Retorna la lista de documentos procesados.
    """
    try:
        metadata = get_documents_metadata()
        return {
            "documents": [
                {"id": doc_id, "filename": info.get("filename"), "status": info.get("status")}
                for doc_id, info in metadata.items()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingestar/")
async def ingest_document(file: UploadFile = File(...)):
    """
    Recibe un archivo, lo guarda temporalmente y dispara la ingesta.
    """
    # 1. Guardar el archivo temporalmente
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 2. Llamar al servicio de ingesta con el nombre del archivo
        resultado = procesar_y_almacenar(UPLOAD_DIR, filename=file.filename)
        
        # 3. Limpiar el archivo temporal tras procesarlo
        os.remove(file_path)
        
        return {"filename": file.filename, "status": "procesado", "info": resultado}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/chat/")
async def chat(request: ChatRequest):
    """
    Endpoint para interactuar con los documentos procesados.
    Ahora acepta una lista de documentos seleccionados.
    """
    try:
        respuesta = consultar_chat(request.pregunta, selected_docs=request.selected_docs)
        return {"pregunta": request.pregunta, "respuesta": respuesta}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))