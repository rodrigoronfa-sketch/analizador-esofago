// ==========================================
// 1. ESTRUCTURAS DE DATOS EN JAVASCRIPT
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

    push(data) {
        const newNode = new Node(data);
        if (this.top !== null) {
            newNode.next = this.top;
        }
        this.top = newNode;
        this.size++;
    }

    // MÉTODO POP STRUCTURAL: Remueve el elemento de arriba de la pila
    pop() {
        if (this.top === null) return null;
        const poppedNode = this.top;
        this.top = this.top.next;
        this.size--;
        return poppedNode.data;
    }

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

// ==========================================
// 2. CONTROL DE ACCESO (LOGIN)
// ==========================================
const loginForm = document.getElementById('loginForm');
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const logoutBtn = document.getElementById('logoutBtn');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === 'admin' && pass === '1234') {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
    } else {
        alert('Credenciales incorrectas. Intente con admin / 1234');
    }
});

logoutBtn.addEventListener('click', () => {
    loginForm.reset();
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
});

// ==========================================
// 3. EVENTOS DE IMAGEN Y ANÁLISIS
// ==========================================
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const uploadForm = document.getElementById('uploadForm');
const analyzeBtn = document.getElementById('analyzeBtn');
const popBtn = document.getElementById('popBtn');

imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = imageInput.files[0];
    if (!file) return;

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

        const response = await fetch('http://127.0.0', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('nodeResultado').className = "tree-node active-branch";
            document.getElementById('treeOutput').innerText = `${data.condicion} (${data.confianza})`;

            const newRecord = {
                timestamp: new Date().toLocaleTimeString(),
                filename: file.name,
                condicion: data.condicion,
                diagnostico: data.diagnostico,
                confianza: data.confianza
            };

            historyStack.push(newRecord);
            renderHistory();
        } else {
            alert('Error en la IA: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con Python. Asegúrate de ejecutar app.py');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerText = "Iniciar Diagnóstico por Árbol e IA";
    }
});

// Evento para ejecutar el Pop estructural de la pila
popBtn.addEventListener('click', () => {
    const removed = historyStack.pop();
    if (removed) {
        alert(`Se eliminó del historial el análisis de: ${removed.filename}`);
        renderHistory();
    }
});

function renderHistory() {
    const historyContainer = document.getElementById('historyContainer');
    historyContainer.innerHTML = '';

    const currentRecords = historyStack.toArray();

    if (currentRecords.length === 0) {
        historyContainer.innerHTML = `<p style="color: #94a3b8;">No se han realizado análisis en esta sesión.</p>`;
        popBtn.classList.add('hidden');
        return;
    }

    popBtn.classList.remove('hidden');

    currentRecords.forEach(record => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';
        itemDiv.innerHTML = `
            <strong>🕒 Hora:</strong> ${record.timestamp} | 📄 <strong>Archivo:</strong> ${record.filename}<br>
            <strong>🔍 Resultado:</strong> <span style="color:${record.condicion === 'Sano' ? 'green' : 'red'}">${record.condicion}</span> (${record.confianza})<br>
            <strong>📋 Detalle:</strong> ${record.diagnostico}
        `;
        historyContainer.appendChild(itemDiv);
    });
}
