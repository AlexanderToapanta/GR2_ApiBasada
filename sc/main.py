import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from services.ingesta import procesar_y_almacenar
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

@app.get("/")
def read_root():
    return {"status": "online", "message": "Backend de Chatbot listo"}

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
        
        # 2. Llamar al servicio de ingesta
        # Nota: SimpleDirectoryReader procesará el archivo en UPLOAD_DIR
        resultado = procesar_y_almacenar(UPLOAD_DIR)
        
        # 3. Limpiar el archivo temporal tras procesarlo
        os.remove(file_path)
        
        return {"filename": file.filename, "status": "procesado", "info": resultado}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/chat/")
async def chat(pregunta: str):
    """
    Endpoint para interactuar con los documentos procesados.
    """
    try:
        respuesta = consultar_chat(pregunta)
        return {"pregunta": pregunta, "respuesta": respuesta}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))