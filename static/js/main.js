// ==========================================
// 1. ESTRUCTURAS DE DATOS EN JAVASCRIPT (PILAS Y NODOS)
// ==========================================
class Node {
    constructor(data) {
        this.data = data;
        this.next = null;
    }
}

class ClinicalStack {
    constructor() {
        this.top = null;
        this.size = 0;
    }

    // Insertar un nuevo análisis médico arriba de la pila
    push(data) {
        const newNode = new Node(data);
        if (this.top !== null) {
            newNode.next = this.top;
        }
        this.top = newNode;
        this.size++;
    }

    // Eliminar el último análisis de la cima de la pila
    pop() {
        if (this.top === null) return null;
        const poppedNode = this.top;
        this.top = this.top.next;
        this.size--;
        return poppedNode.data;
    }

    // Recorrer los nodos para pasarlos a un arreglo manejable por la interfaz
    toArray() {
        const elements = [];
        let current = this.top;
        while (current !== null) {
            elements.push(current.data);
            current = current.next;
        }
        return elements;
    }
}

const historyStack = new ClinicalStack();

// Variable global para almacenar el nombre del paciente registrado
let pacienteSesion = "";

// ==========================================
// 2. CONTROL DE ACCESO (REGISTRO DEL PACIENTE)
// ==========================================
const loginForm = document.getElementById('loginForm');
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const logoutBtn = document.getElementById('logoutBtn');
const activeMedic = document.getElementById('activeMedic'); // Mantiene el ID del HTML para no romper estilos

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const patientName = document.getElementById('username').value;

    if (patientName.trim() !== '') {
        // Almacenar el nombre del paciente y dar acceso al módulo
        pacienteSesion = patientName.trim();
        activeMedic.innerText = pacienteSesion;
        
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
    } else {
        alert('Por favor, ingrese un nombre válido para continuar.');
    }
});

logoutBtn.addEventListener('click', () => {
    loginForm.reset();
    pacienteSesion = "";
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('treeView').classList.add('hidden');
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
});

// ==========================================
// 3. EVENTOS DE IMAGEN, ÁRBOL Y LLAMADA A PYTHON
// ==========================================
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const uploadForm = document.getElementById('uploadForm');
const analyzeBtn = document.getElementById('analyzeBtn');
const popBtn = document.getElementById('popBtn');

// Mostrar previsualización instantánea de la endoscopia
imageInput.addEventListener('change', () => {
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(imageInput.files[0]);
    }
});

// Enviar la imagen y activar el flujo del árbol de decisiones
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Corrección de acceso seguro al archivo seleccionado
    if (!imageInput.files || imageInput.files.length === 0) {
        alert('Por favor, seleccione un archivo de imagen antes de continuar.');
        return;
    }
    
    const file = imageInput.files[0];

    analyzeBtn.disabled = true;
    analyzeBtn.innerText = "Calculando trayectorias en el Árbol...";
    document.getElementById('treeView').classList.remove('hidden');
    
    document.getElementById('nodeRoot').className = "tree-node active-branch";
    document.getElementById('nodeIA').className = "tree-node";
    document.getElementById('nodeResultado').className = "tree-node";
    document.getElementById('treeOutput').innerText = "Analizando píxeles...";

    const formData = new FormData();
    formData.append('image', file);

    try {
        setTimeout(() => {
            document.getElementById('nodeIA').className = "tree-node active-branch";
        }, 500);

        // Envío directo a Flask usando la ruta relativa segura
        const response = await fetch('/predict', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        // ========================================================
        // CONTROL DE SEGURIDAD: VERIFICACIÓN DE IMAGEN ANULADA
        // ========================================================
        if (data.status === "error" && data.error_clinico) {
            // Reestablecer visualmente el nodo final del árbol
            document.getElementById('nodeResultado').className = "tree-node";
            document.getElementById('treeOutput').innerHTML = `<span style="color:orange; font-weight:bold;">Rechazado</span>`;
            alert(data.mensaje);
            return; // Detiene la función de forma inmediata para proteger el historial
        }
        // ========================================================

        if (response.ok) {
            document.getElementById('nodeResultado').className = "tree-node active-branch";
            
            const colorStatus = data.condicion === 'Sano' ? 'green' : 'red';
            document.getElementById('treeOutput').innerHTML = `<span style="color:${colorStatus}">${data.condicion}</span> (${data.confianza})`;

            // Formatear el registro clínico enlazándolo al nombre del paciente
            const newRecord = {
                timestamp: new Date().toLocaleTimeString(),
                filename: file.name,
                condicion: data.condicion,
                diagnostico: data.diagnostico,
                confianza: data.confianza,
                paciente: pacienteSesion
            };

            // Apilar en la estructura LIFO utilizando nuestros Nodos enlazados
            historyStack.push(newRecord);
            renderHistory();
        } else {
            alert('Error en el Servidor IA: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('No se pudo establecer conexión con Python. Asegúrate de que app.py esté corriendo en segundo plano.');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerText = "Ejecutar Diagnóstico Computarizado";
    }
});

// Evento para desapilar (Pop)
popBtn.addEventListener('click', () => {
    const removed = historyStack.pop();
    if (removed) {
        alert(`Se eliminó del historial el reporte del archivo: ${removed.filename}`);
        renderHistory();
    }
});

// Dibujar la Pila de reportes en la interfaz del Paciente
function renderHistory() {
    const historyContainer = document.getElementById('historyContainer');
    historyContainer.innerHTML = '';

    const currentRecords = historyStack.toArray();

    if (currentRecords.length === 0) {
        historyContainer.innerHTML = `<p style="color: #94a3b8; font-style: italic;">No se registran evaluaciones en su historial actual.</p>`;
        popBtn.classList.add('hidden');
        return;
    }

    popBtn.classList.remove('hidden');

    currentRecords.forEach(record => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        
        const badgeClass = record.condicion === 'Sano' ? 'badge-sano' : 'badge-lesion';

        itemDiv.innerHTML = `
            <strong>🕒 Hora de Consulta:</strong> ${record.timestamp} | 📄 <strong>Archivo original:</strong> ${record.filename}<br>
            <strong>👤 Paciente Evaluado:</strong> ${record.paciente}<br>
            <strong>🔍 Conclusión del Sistema:</strong> <span class="status-badge ${badgeClass}">${record.condicion}</span> (${record.confianza})<br>
            <strong>📋 Detalle Clínico Informativo:</strong> ${record.diagnostico}
        `;
        historyContainer.appendChild(itemDiv);
    });
}
