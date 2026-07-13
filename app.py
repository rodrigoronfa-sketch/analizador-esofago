from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
import io

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = models.mobilenet_v2(weights=None)

num_caracteristicas = model.classifier[1].in_features
model.classifier = nn.Sequential(
    nn.Dropout(0.2),
    nn.Linear(num_caracteristicas, 2)
)

try:
    model.load_state_dict(torch.load('modelo_esofago.pth', map_location=device))
    print("¡Modelo cargado de forma exitosa!")
except Exception as e:
    print(f"Error al cargar el archivo .pth: {e}")

model = model.to(device)
model.eval()

classes = ['Con Lesión', 'Sano']

transformaciones_prediccion = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No se subió ninguna imagen'}), 400
    
    file = request.files['image']
    
    try:
        img_bytes = file.read()
        imagen_pil = Image.open(io.BytesIO(img_bytes)).convert('RGB')
        tensor_imagen = transformaciones_prediccion(imagen_pil).unsqueeze(0).to(device)
        
        with torch.no_grad():
            salidas = model(tensor_imagen)
            probabilidades = torch.softmax(salidas, dim=1)
            
            indice_prediccion = torch.argmax(probabilidades).item()
            porcentaje_confianza = probabilidades[0][indice_prediccion].item() * 100
            
        UMBRAL_MINIMO = 75.0 
        
        if porcentaje_confianza < UMBRAL_MINIMO:
            return jsonify({
                "status": "error",
                "error_clinico": True,
                "mensaje": "Estructura no identificada. La imagen cargada no coincide con los patrones visuales estándar de una endoscopia esofágica. Por seguridad, el diagnóstico ha sido cancelado."
            }), 422

        resultado_condicion = classes[indice_prediccion]

        if resultado_condicion == 'Con Lesión':
            diagnostico = "Se observan alteraciones o cambios macroscópicos en la mucosa del esófago (ej. posible esofagitis o esófago de Barrett). Requiere validación por un gastroenterólogo."
        else:
            diagnostico = "La mucosa esofágica visible se encuentra lisa, rosada y dentro de los parámetros normales estándar."

        return jsonify({
            "status": "success",
            "condicion": resultado_condicion,
            "diagnostico": diagnostico,
            "confianza": f"{porcentaje_confianza:.2f}%"
        })

    except Exception as e:
        print(f"Error interno durante la predicción: {str(e)}")
        return jsonify({'error': f'Error al procesar la imagen: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
