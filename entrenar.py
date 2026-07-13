import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader, random_split

BATCH_SIZE = 32
EPOCHS = 100
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Entrenando utilizando el dispositivo: {device}")

transformaciones = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

dataset_completo = datasets.ImageFolder('dataset', transform=transformaciones)
print(f"Clases detectadas automáticamente: {dataset_completo.classes}") # Debería ser ['lesion', 'sano']

tamano_train = int(0.8 * len(dataset_completo))
tamano_val = len(dataset_completo) - tamano_train
train_set, val_set = random_split(dataset_completo, [tamano_train, tamano_val])

train_loader = DataLoader(train_set, batch_size=BATCH_SIZE, shuffle=True)
val_loader = DataLoader(val_set, batch_size=BATCH_SIZE, shuffle=False)

model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

for param in model.parameters():
    param.requires_grad = False

num_caracteristicas = model.classifier[1].in_features
model.classifier = nn.Sequential(
    nn.Dropout(0.2),
    nn.Linear(num_caracteristicas, 2) # 2 salidas: lesión o sano
)
model = model.to(device)

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.classifier.parameters(), lr=0.001)

print("Iniciando el entrenamiento de la IA...")
for epoch in range(EPOCHS):
    model.train()
    running_loss = 0.0
    
    for imagenes, etiquetas in train_loader:
        imagenes, etiquetas = imagenes.to(device), etiquetas.to(device)
        
        optimizer.zero_grad()
        salidas = model(imagenes)
        loss = criterion(salidas, etiquetas)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item() * imagenes.size(0)
        
    epoch_loss = running_loss / len(train_set)
    print(f"Época [{epoch+1}/{EPOCHS}] - Pérdida (Loss): {epoch_loss:.4f}")

torch.save(model.state_dict(), 'modelo_esofago.pth')
print("¡Entrenamiento finalizado con éxito! El archivo 'modelo_esofago.pth' ha sido guardado.")
