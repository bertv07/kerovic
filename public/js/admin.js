/**
 * KEROVIC - Admin Script
 * Handles: Authentication, Product CRUD
 */

// ==================== STATE ====================
let authToken = localStorage.getItem('kerovic_admin_token');
let products = [];
let editingProductId = null;
let existingCategories = [];

// ==================== DOM ELEMENTS ====================
const loginSection = document.getElementById('loginSection');
const adminSection = document.getElementById('adminSection');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const productForm = document.getElementById('productForm');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const productsTableBody = document.getElementById('productsTableBody');
const productImage = document.getElementById('productImage');
const imagePreview = document.getElementById('imagePreview');
const fileLabel = document.getElementById('fileLabel');
const categoriesList = document.getElementById('categoriesList');
const toastContainer = document.getElementById('toastContainer');

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showAdminSection();
    } else {
        showLoginSection();
    }

    setupEventListeners();
});

// ==================== AUTH ====================
function showLoginSection() {
    loginSection.classList.remove('hidden');
    adminSection.classList.add('hidden');
}

function showAdminSection() {
    loginSection.classList.add('hidden');
    adminSection.classList.remove('hidden');
    loadProducts();
    loadCategories();
}

async function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        if (res.ok) {
            const data = await res.json();
            authToken = data.token;
            localStorage.setItem('kerovic_admin_token', authToken);
            loginError.style.display = 'none';
            showAdminSection();
            showToast('Bienvenido al panel de administración', 'success');
        } else {
            loginError.style.display = 'block';
        }
    } catch (err) {
        console.error('Login error:', err);
        loginError.style.display = 'block';
    }
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('kerovic_admin_token');
    showLoginSection();
    document.getElementById('password').value = '';
}

// ==================== PRODUCTS CRUD ====================
async function loadProducts() {
    try {
        const res = await fetch('/api/products');
        products = await res.json();
        renderProductsTable();
    } catch (err) {
        console.error('Error loading products:', err);
        showToast('Error al cargar productos', 'error');
    }
}

async function loadCategories() {
    try {
        const res = await fetch('/api/products/meta/categories');
        existingCategories = await res.json();

        categoriesList.innerHTML = '';
        existingCategories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            categoriesList.appendChild(option);
        });
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

function renderProductsTable() {
    if (products.length === 0) {
        productsTableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 3rem; color: #888;">
          No hay productos. ¡Agrega el primero! 🎉
        </td>
      </tr>
    `;
        return;
    }

    productsTableBody.innerHTML = products.map(product => `
    <tr data-id="${product.id}">
      <td>
        <img src="${product.image_url || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f0f4f8%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 font-size=%2240%22 text-anchor=%22middle%22>💅</text></svg>'}" 
             alt="${escapeHtml(product.name)}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f0f4f8%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 font-size=%2240%22 text-anchor=%22middle%22>💅</text></svg>'">
      </td>
      <td><strong>${escapeHtml(product.name)}</strong></td>
      <td>${escapeHtml(product.category || '-')}</td>
      <td>$${formatPrice(product.price)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-secondary" onclick="editProduct(${product.id})">✏️ Editar</button>
          <button class="btn btn-danger" onclick="deleteProduct(${product.id})">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function handleProductSubmit(e) {
    e.preventDefault();

    const formData = new FormData(productForm);

    // Remove id if creating new product
    if (!editingProductId) {
        formData.delete('id');
    }

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = editingProductId ? 'Actualizando...' : 'Agregando...';

        const url = editingProductId
            ? `/api/products/${editingProductId}`
            : '/api/products';

        const method = editingProductId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });

        if (res.ok) {
            const product = await res.json();
            showToast(editingProductId ? 'Producto actualizado' : 'Producto agregado', 'success');
            resetForm();
            loadProducts();
            loadCategories();
        } else if (res.status === 401) {
            showToast('Sesión expirada. Inicia sesión nuevamente.', 'error');
            handleLogout();
        } else {
            const error = await res.json();
            showToast(error.error || 'Error al guardar', 'error');
        }
    } catch (err) {
        console.error('Submit error:', err);
        showToast('Error de conexión', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = editingProductId ? '💾 Guardar Cambios' : '➕ Agregar Producto';
    }
}

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    editingProductId = id;

    // Fill form
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCategory').value = product.category || '';

    // Show current image
    if (product.image_url) {
        imagePreview.src = product.image_url;
        imagePreview.classList.add('show');
        fileLabel.textContent = 'Imagen actual (selecciona otra para reemplazar)';
    }

    // Update UI
    formTitle.textContent = '✏️ Editar Producto';
    submitBtn.textContent = '💾 Guardar Cambios';
    cancelEditBtn.classList.remove('hidden');

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteProduct(id) {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
        const res = await fetch(`/api/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            showToast('Producto eliminado', 'success');
            loadProducts();
        } else if (res.status === 401) {
            showToast('Sesión expirada', 'error');
            handleLogout();
        } else {
            showToast('Error al eliminar', 'error');
        }
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Error de conexión', 'error');
    }
}

function resetForm() {
    editingProductId = null;
    productForm.reset();
    imagePreview.classList.remove('show');
    imagePreview.src = '';
    fileLabel.textContent = 'Haz clic o arrastra una imagen aquí';
    formTitle.textContent = '➕ Agregar Producto';
    submitBtn.textContent = '➕ Agregar Producto';
    cancelEditBtn.classList.add('hidden');
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    productForm.addEventListener('submit', handleProductSubmit);
    cancelEditBtn.addEventListener('click', resetForm);

    // Image preview
    productImage.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.classList.add('show');
                fileLabel.textContent = file.name;
            };
            reader.readAsDataURL(file);
        }
    });
}

// ==================== UTILITIES ====================
function formatPrice(price) {
    return parseFloat(price).toFixed(2);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
