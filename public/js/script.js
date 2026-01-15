/**
 * KEROVIC - Catalog Script
 * Handles: Products display, Cart (localStorage), WhatsApp checkout
 */

// ==================== STATE ====================
let products = [];
let cart = JSON.parse(localStorage.getItem('kerovic_cart')) || [];
let whatsappNumber = '584121410816';

// ==================== DOM ELEMENTS ====================
const productsGrid = document.getElementById('productsGrid');
const loadingState = document.getElementById('loadingState');
const noProducts = document.getElementById('noProducts');
const filtersContainer = document.getElementById('filtersContainer');
const cartBtn = document.getElementById('cartBtn');
const cartOverlay = document.getElementById('cartOverlay');
const cartDrawer = document.getElementById('cartDrawer');
const cartClose = document.getElementById('cartClose');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartFooter = document.getElementById('cartFooter');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const checkoutForm = document.getElementById('checkoutForm');
const toastContainer = document.getElementById('toastContainer');

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadProducts();
    loadCategories();
    updateCartUI();
    setupEventListeners();
    setupScrollAnimations();
});

// ==================== API CALLS ====================
async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        whatsappNumber = config.whatsappNumber || whatsappNumber;
    } catch (err) {
        console.error('Error loading config:', err);
    }
}

async function loadProducts(category = null) {
    try {
        showLoading(true);
        const url = category && category !== 'all'
            ? `/api/products?category=${encodeURIComponent(category)}`
            : '/api/products';

        const res = await fetch(url);
        products = await res.json();

        renderProducts(products);
    } catch (err) {
        console.error('Error loading products:', err);
        productsGrid.innerHTML = '<p class="no-products">Error al cargar productos</p>';
    } finally {
        showLoading(false);
    }
}

async function loadCategories() {
    try {
        const res = await fetch('/api/products/meta/categories');
        const categories = await res.json();

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.category = cat;
            btn.textContent = cat;
            filtersContainer.appendChild(btn);
        });
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

// ==================== RENDER FUNCTIONS ====================
function showLoading(show) {
    if (show) {
        loadingState.classList.remove('hidden');
        noProducts.classList.add('hidden');
    } else {
        loadingState.classList.add('hidden');
    }
}

function renderProducts(items) {
    // Clear previous products (keep loading)
    const existingCards = productsGrid.querySelectorAll('.product-card');
    existingCards.forEach(card => card.remove());

    if (items.length === 0) {
        noProducts.classList.remove('hidden');
        return;
    }

    noProducts.classList.add('hidden');

    items.forEach(product => {
        const card = createProductCard(product);
        productsGrid.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
    <div class="product-image">
      <img src="${product.image_url || '/images/placeholder.png'}" 
           alt="${escapeHtml(product.name)}"
           loading="lazy"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f0f4f8%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 font-size=%2240%22 text-anchor=%22middle%22>💅</text></svg>'">
      ${product.category ? `<span class="product-category">${escapeHtml(product.category)}</span>` : ''}
    </div>
    <div class="product-info">
      <h3 class="product-name">${escapeHtml(product.name)}</h3>
      <p class="product-description">${escapeHtml(product.description || '')}</p>
      <div class="product-footer">
        <span class="product-price">$${formatPrice(product.price)}</span>
        <button class="add-to-cart-btn" data-id="${product.id}" title="Agregar al carrito">+</button>
      </div>
    </div>
  `;

    // Add to cart event
    card.querySelector('.add-to-cart-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(product);
    });

    return card;
}

// ==================== CART FUNCTIONS ====================
function addToCart(product) {
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            image_url: product.image_url,
            quantity: 1
        });
    }

    saveCart();
    updateCartUI();
    showToast(`${product.name} agregado al carrito`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function updateQuantity(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

function saveCart() {
    localStorage.setItem('kerovic_cart', JSON.stringify(cart));
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartUI() {
    // Update count badge
    const count = getCartCount();
    cartCount.textContent = count;

    // Update total
    cartTotal.textContent = `$${formatPrice(getCartTotal())}`;

    // Update footer visibility
    cartFooter.style.display = cart.length > 0 ? 'block' : 'none';
    cartEmpty.style.display = cart.length === 0 ? 'block' : 'none';

    // Render cart items
    renderCartItems();
}

function renderCartItems() {
    // Remove existing items (keep empty state)
    const existingItems = cartItems.querySelectorAll('.cart-item');
    existingItems.forEach(item => item.remove());

    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
      <img src="${item.image_url || '/images/placeholder.png'}" 
           alt="${escapeHtml(item.name)}" 
           class="cart-item-image"
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f0f4f8%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 font-size=%2240%22 text-anchor=%22middle%22>💅</text></svg>'">
      <div class="cart-item-details">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">$${formatPrice(item.price)}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" data-id="${item.id}" data-action="decrease">−</button>
          <span class="cart-item-qty">${item.quantity}</span>
          <button class="qty-btn" data-id="${item.id}" data-action="increase">+</button>
        </div>
      </div>
      <button class="cart-item-remove" data-id="${item.id}" title="Eliminar">🗑️</button>
    `;

        // Event listeners
        cartItem.querySelector('[data-action="decrease"]').addEventListener('click', () => {
            updateQuantity(item.id, -1);
        });
        cartItem.querySelector('[data-action="increase"]').addEventListener('click', () => {
            updateQuantity(item.id, 1);
        });
        cartItem.querySelector('.cart-item-remove').addEventListener('click', () => {
            removeFromCart(item.id);
        });

        cartItems.appendChild(cartItem);
    });
}

// ==================== CHECKOUT (WHATSAPP) ====================
function handleCheckout(e) {
    e.preventDefault();

    if (cart.length === 0) {
        showToast('El carrito está vacío', 'error');
        return;
    }

    const formData = new FormData(checkoutForm);
    const name = formData.get('name');
    const address = formData.get('address');
    const phone = formData.get('phone');

    // Build message
    let message = `*NUEVO PEDIDO - KEROVIC*\n\n`;
    message += `*Cliente:* ${name}\n`;
    message += `*Direccion:* ${address}\n`;
    if (phone) message += `*Telefono:* ${phone}\n`;
    message += `\n*PRODUCTOS:*\n`;
    message += `-----------------\n`;

    cart.forEach(item => {
        message += `- ${item.name}\n`;
        message += `  Cantidad: ${item.quantity} x $${formatPrice(item.price)}\n`;
        message += `  Subtotal: $${formatPrice(item.price * item.quantity)}\n\n`;
    });

    message += `-----------------\n`;
    message += `*TOTAL: $${formatPrice(getCartTotal())}*`;

    // Encode and open WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    // Clear cart after sending
    cart = [];
    saveCart();
    updateCartUI();
    checkoutForm.reset();
    closeCart();

    showToast('¡Pedido enviado! Te contactaremos pronto.', 'success');
}

// ==================== CART DRAWER ====================
function openCart() {
    cartOverlay.classList.add('active');
    cartDrawer.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartOverlay.classList.remove('active');
    cartDrawer.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Cart toggle
    cartBtn.addEventListener('click', openCart);
    cartClose.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    // Checkout form
    checkoutForm.addEventListener('submit', handleCheckout);

    // Category filters
    filtersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Update active state
            filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');

            // Load filtered products
            const category = e.target.dataset.category;
            loadProducts(category);
        }
    });

    // Close cart on escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCart();
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

// ==================== SCROLL ANIMATIONS ====================
function setupScrollAnimations() {
    // Intersection Observer for scroll reveal
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Optionally unobserve after revealing
                // revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe products after they're rendered
    const observeProducts = () => {
        const products = document.querySelectorAll('.product-card');
        products.forEach(card => revealObserver.observe(card));
    };

    // Observe contact cards
    const contactCards = document.querySelectorAll('.contact-card');
    contactCards.forEach(card => revealObserver.observe(card));

    // Use MutationObserver to detect when products are added
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.classList && node.classList.contains('product-card')) {
                        revealObserver.observe(node);
                    }
                });
            });
        });

        mutationObserver.observe(productsGrid, { childList: true });
    }

    // Initial observation
    observeProducts();
}
