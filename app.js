/**
 * CosmeticaCRM - Men Kosmetika Biznesi uchun CRM Tizimi
 * App.js - Firebase Compat Version (Updated)
 */

// ==========================================
// AUTHENTICATION CHECK
// ==========================================
var auth = firebase.auth();
var currentUserRole = 'admin';

auth.onAuthStateChanged(function (user) {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        document.getElementById('displayUserName').textContent = user.email || 'Foydalanuvchi';
        // Load user role from Firestore (default admin)
        db.collection('users').doc(user.uid).get().then(function (doc) {
            if (doc.exists) {
                var data = doc.data() || {};
                if (data.role) currentUserRole = String(data.role).trim().toLowerCase();
                // Update role text in UI
                var roleTextEl = document.querySelector('.user-role');
                if (roleTextEl) {
                    roleTextEl.textContent = (currentUserRole === 'admin') ? 'Admin' : 'Menejer';
                }
            }
            renderProducts();
            updateUIVisibility();
        }).catch(function (error) {
            console.error("Error loading user role:", error);
            currentUserRole = 'admin';
            renderProducts();
            updateUIVisibility();
        });
    }
});

document.getElementById('logoutBtn').addEventListener('click', function (e) {
    e.preventDefault();
    auth.signOut().then(function () {
        window.location.href = 'login.html';
    }).catch(function (error) {
        showToast('Chiqishda xatolik: ' + error.message, 'error');
    });
});

// ==========================================
// FORMAT HELPERS
// ==========================================
function formatMoney(amount) {
    return new Intl.NumberFormat('uz-UZ').format(amount || 0) + " so'm";
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
    return d.getDate() + '-' + months[d.getMonth()] + '. ' + d.getFullYear();
}

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type) {
    type = type || 'success';
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    var icons = { success: 'check-circle', error: 'exclamation-circle', info: 'info-circle' };
    var iconEl = document.createElement('i');
    iconEl.className = 'fas fa-' + (icons[type] || 'info-circle');
    var textNode = document.createTextNode(' ' + (message || ''));
    toast.appendChild(iconEl);
    toast.appendChild(textNode);
    container.appendChild(toast);
    toast.addEventListener('click', function () {
        toast.classList.add('fadeout');
        setTimeout(function () { toast.remove(); }, 300);
    });
    setTimeout(function () {
        toast.classList.add('fadeout');
        setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
}

// ==========================================
// MODAL MANAGEMENT
// ==========================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('click', function (e) {
    if (e.target.closest('.modal-close') || e.target.closest('[data-modal]')) {
        var btn = e.target.closest('[data-modal]');
        if (btn) closeModal(btn.dataset.modal);
    }
    if (e.target.classList.contains('modal-overlay')) {
        closeModal(e.target.id);
    }
});
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(function (m) { closeModal(m.id); });
    }
});

// ==========================================
// NAVIGATION
// ==========================================
var pageConfig = {
    dashboard: { title: 'Dashboard', subtitle: "Umumiy ko'rinish va statistika" },
    sales: { title: 'Sotuvlar', subtitle: 'Barcha sotuvlarni boshqarish' },
    finance: { title: 'Kirim / Chiqim', subtitle: 'Moliyaviy operatsiyalar' },
    products: { title: 'Mahsulotlar', subtitle: "Mahsulotlar ro'yxati va boshqaruvi" },
    settings: { title: 'Sozlamalar', subtitle: 'Tizim sozlamalari boshqaruvi' },
    staff: { title: 'Xodimlar', subtitle: 'Xodimlar va kirish huquqlari' },
    customers: { title: 'Mijozlar', subtitle: 'Mijozlar bazasi va tarixi' },
    profile: { title: 'Menejer Profili', subtitle: 'Shaxsiy profil va ish statistikasi' }
};

function navigateTo(pageName) {
    document.querySelectorAll('.nav-item').forEach(function (item) {
        item.classList.toggle('active', item.dataset.page === pageName);
    });
    document.querySelectorAll('.page').forEach(function (page) {
        page.classList.toggle('active', page.id === 'page-' + pageName);
    });
    var config = pageConfig[pageName];
    if (config) {
        document.getElementById('pageTitle').textContent = config.title;
        document.getElementById('pageSubtitle').textContent = config.subtitle;
    }
    document.getElementById('sidebar').classList.remove('open');
    var overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
    updateUIVisibility(pageName);
    if (pageName === 'customers') renderCustomers();
    if (pageName === 'profile') loadUserProfile();
}

function updateUIVisibility(currentPage) {
    // Hozirgi foydalanuvchi ma'lumotlarini olish
    var user = firebase.auth().currentUser;
    if (!user) return;

    db.collection('users').doc(user.uid).get().then(function (doc) {
        var perms = { sales: true, customers: true, finance: true, products: true, staff: false, settings: false };
        var isAdmin = false;

        if (doc.exists) {
            var data = doc.data();
            isAdmin = (data.role === 'admin');
            if (data.permissions) perms = data.permissions;
        }

        // Sidebar menyularini boshqarish
        document.querySelectorAll('.nav-item').forEach(function (item) {
            var page = item.dataset.page;
            if (isAdmin) {
                item.style.display = 'block';
            } else {
                // Admin bo'lmaganlar uchun ruxsatnomalarni tekshirish
                if (perms[page] === false) {
                    item.style.display = 'none';
                    // Agar hozirgi sahifa yashirilgan bo'lsa, dashboardga yo'naltirish
                    if (currentPage === page) navigateTo('dashboard');
                } else {
                    item.style.display = 'block';
                }
            }
        });

        // Amallar tugmalarini boshqarish (faqat admin uchun)
        document.querySelectorAll('.btn-icon.delete, .btn-icon.edit.user-edit-btn, #addUserBtn').forEach(function (btn) {
            btn.style.display = isAdmin ? 'inline-flex' : 'none';
        });

    }).catch(function (error) {
        console.error("UI visibility error:", error);
    });

    initSelectPicker('customerRegionPicker', allRegions);
}

document.querySelectorAll('.nav-item').forEach(function (item) {
    item.addEventListener('click', function (e) {
        e.preventDefault();
        navigateTo(item.dataset.page);
    });
});

document.getElementById('nav-profile').addEventListener('click', function (e) {
    e.preventDefault();
    navigateTo('profile');
});

function loadUserProfile() {
    var user = auth.currentUser;
    if (!user) return;

    document.getElementById('infoEmail').textContent = user.email;
    document.getElementById('infoUid').textContent = user.uid;
    document.getElementById('profileName').textContent = user.email.split('@')[0];

    // Role display
    var role = (currentUserRole === 'admin') ? 'Admin' : 'Menejer';
    document.getElementById('infoRole').textContent = role;
    document.getElementById('profileRoleText').innerHTML = '<i class="fas fa-shield-halved"></i> ' + role;

    // Load performance stats
    var userSales = salesArr.filter(function (s) { return false; });

    // Ruxsatnomalarni yuklash
    db.collection('users').doc(user.uid).get().then(function (doc) {
        if (doc.exists) {
            var data = doc.data();
            if (data.name) document.getElementById('profileName').textContent = data.name;
            
            // Faqat adminlar ruxsatnomalarni ko'ra oladi va o'zgartira oladi
            var isAdmin = (currentUserRole === 'admin');
            var card = document.getElementById('profilePermissionsCard');
            if (card) card.style.display = isAdmin ? 'block' : 'none';

            if (data.permissions) {
                var p = data.permissions;
                document.getElementById('profile_perm_sales').checked = p.sales !== false;
                document.getElementById('profile_perm_customers').checked = p.customers !== false;
                document.getElementById('profile_perm_finance').checked = p.finance !== false;
                document.getElementById('profile_perm_products').checked = p.products !== false;
                document.getElementById('profile_perm_staff').checked = !!p.staff;
                document.getElementById('profile_perm_settings').checked = !!p.settings;
            }
        }
    });
}

// Ruxsatnomalarni saqlash
document.getElementById('saveProfilePermissionsBtn').addEventListener('click', function() {
    var user = auth.currentUser;
    if (!user) return;

    var btn = this;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saqlanmoqda...';

    var perms = {
        sales: document.getElementById('profile_perm_sales').checked,
        customers: document.getElementById('profile_perm_customers').checked,
        finance: document.getElementById('profile_perm_finance').checked,
        products: document.getElementById('profile_perm_products').checked,
        staff: document.getElementById('profile_perm_staff').checked,
        settings: document.getElementById('profile_perm_settings').checked
    };

    db.collection('users').doc(user.uid).update({ permissions: perms }).then(function() {
        showToast("Ruxsatnomalar muvaffaqiyatli yangilandi!");
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> O\'zgarishlarni saqlash';
        updateUIVisibility(); // UI-ni darhol yangilash
    }).catch(function(err) {
        showToast("Xatolik: " + err.message, "error");
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> O\'zgarishlarni saqlash';
    });
});

document.getElementById('logoutBtnProfile').addEventListener('click', function () {
    auth.signOut().then(function () { window.location.href = 'login.html'; });
});

// ==========================================
// MOBILE SIDEBAR
// ==========================================
var mobileMenuBtn = document.getElementById('mobileMenuBtn');
var sidebar = document.getElementById('sidebar');
var sidebarOverlay = document.createElement('div');
sidebarOverlay.className = 'sidebar-overlay';
document.body.appendChild(sidebarOverlay);

mobileMenuBtn.addEventListener('click', function () {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
});
sidebarOverlay.addEventListener('click', function () {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
});

// ==========================================
// CATEGORY METADATA (WITH ICONS)
// ==========================================
var categoryIcons = {
    // Finance Categories
    'Sotuv daromadi': { icon: 'fa-shopping-bag', color: '#10b981' },
    'Boshqa kirim': { icon: 'fa-plus-circle', color: '#3b82f6' },
    "Qaytarilgan mablag'": { icon: 'fa-undo', color: '#f59e0b' },
    'Investitsiya': { icon: 'fa-hand-holding-usd', color: '#8b5cf6' },
    'Target': { icon: 'fa-bullseye', color: '#ef4444' },
    'Yandex': { icon: 'fa-taxi', color: '#fcd34d' },
    'Pochta': { icon: 'fa-envelope', color: '#64748b' },
    // Product Categories
    'Yuz kremi': { icon: 'fa-sparkles', color: '#f472b6' },
    'Parfyumeriya': { icon: 'fa-spray-can', color: '#a78bfa' },
    'Soqol parvarishi': { icon: 'fa-user-ninja', color: '#4b5563' },
    'Soch parvarishi': { icon: 'fa-scissors', color: '#fbbf24' },
    'Tana parvarishi': { icon: 'fa-spa', color: '#34d399' },
    'Atir': { icon: 'fa-bottle-droplet', color: '#ec4899' },
    'Dezodorant': { icon: 'fa-wind', color: '#60a5fa' },
    'Boshqa': { icon: 'fa-box', color: '#94a3b8' }
};

var incomeCategories = ['Sotuv daromadi', 'Boshqa kirim', "Qaytarilgan mablag'", 'Investitsiya'];
var expenseCategories = ['Target', 'Yandex', 'Pochta'];
var allProductCategories = ['Yuz kremi', 'Parfyumeriya', 'Soqol parvarishi', 'Soch parvarishi', 'Tana parvarishi', 'Atir', 'Dezodorant', 'Boshqa'];
var allRegions = ["Toshkent shahri", "Toshkent viloyati", "Andijon", "Buxoro", "Farg'ona", "Jizzax", "Namangan", "Navoiy", "Qashqadaryo", "Samarqand", "Sirdaryo", "Surxondaryo", "Xorazm", "Qoraqalpog'iston"];

// ==========================================
// SELECT PICKER SYSTEM
// ==========================================
function setSelectValue(pickerId, value, label) {
    var picker = document.getElementById(pickerId);
    if (!picker) return;
    var input = picker.querySelector('input[type="hidden"]');
    var triggerLabel = picker.querySelector('.select-trigger-label');
    var options = picker.querySelectorAll('.select-option');

    if (input) input.value = value;
    if (triggerLabel) triggerLabel.textContent = label || value || 'Tanlang...';

    options.forEach(function (opt) {
        opt.classList.toggle('selected', opt.dataset.value === value);
    });
}

function initSelectPicker(pickerId, options, onSelect) {
    var picker = document.getElementById(pickerId);
    if (!picker) return;
    var trigger = picker.querySelector('.select-trigger');
    var dropdown = picker.querySelector('.select-dropdown');

    // Build options if provided
    if (options && options.length > 0) {
        dropdown.innerHTML = options.map(function (opt) {
            var val = typeof opt === 'string' ? opt : opt.value;
            var lab = typeof opt === 'string' ? opt : opt.label;
            var meta = categoryIcons[val] || { icon: 'fa-circle-dot', color: 'currentColor' };
            return '<button type="button" class="select-option" data-value="' + val + '" data-label="' + lab + '">' +
                '<i class="fas ' + meta.icon + '" style="color:' + meta.color + '"></i>' +
                '<span>' + lab + '</span>' +
                '</button>';
        }).join('');
    }

    // Toggle dropdown
    trigger.onclick = function (e) {
        e.stopPropagation();
        var isOpen = picker.classList.contains('open');
        document.querySelectorAll('.select-picker.open').forEach(function (p) { p.classList.remove('open'); });
        if (!isOpen) picker.classList.add('open');
    };

    // Option click
    dropdown.onclick = function (e) {
        var opt = e.target.closest('.select-option');
        if (!opt) return;
        var val = opt.dataset.value;
        var lab = opt.dataset.label;
        setSelectValue(pickerId, val, lab);
        picker.classList.remove('open');
        if (onSelect) onSelect(val, lab);
    };
}

// Close pickers on outside click
document.addEventListener('click', function () {
    document.querySelectorAll('.select-picker.open').forEach(function (p) {
        p.classList.remove('open');
    });
});

// ==========================================
// DATA STATE
// ==========================================
var productsArr = [];

var salesArr = [];
var financesArr = [];
var usersArr = [];

// ==========================================
// REAL-TIME FIRESTORE LISTENERS
// ==========================================
db.collection("products").onSnapshot(function (snapshot) {
    productsArr = [];
    snapshot.forEach(function (doc) { productsArr.push(Object.assign({ id: doc.id }, doc.data())); });
    renderProducts();
    syncSaleItemRowOptions();
    updateSaleTotal();
    refreshDashboard();
});



db.collection("sales").onSnapshot(function (snapshot) {
    salesArr = [];
    snapshot.forEach(function (doc) { salesArr.push(Object.assign({ id: doc.id }, doc.data())); });
    renderSales();
    refreshDashboard();
});

db.collection("finances").onSnapshot(function (snapshot) {
    financesArr = [];
    snapshot.forEach(function (doc) { financesArr.push(Object.assign({ id: doc.id }, doc.data())); });
    renderFinance();
    refreshDashboard();
});

// ==========================================
// === PRODUCTS CRUD ===
// ==========================================
function renderProducts(searchTerm) {
    searchTerm = searchTerm || '';
    var tbody = document.getElementById('productsBody');
    var empty = document.getElementById('productsEmpty');
    var filtered = productsArr.slice();
    if (searchTerm) {
        var q = searchTerm.toLowerCase();
        filtered = filtered.filter(function (p) { return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q); });
    }
    // Yordamchi adminlar faqat active mahsulotlarni ko'radi
    if (currentUserRole !== 'admin') {
        filtered = filtered.filter(function (p) { return (p.status || 'active') !== 'inactive'; });
    }
    if (filtered.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = filtered.map(function (p, i) {
        var status = p.status || 'active';
        var statusClass = status === 'inactive' ? 'inactive' : 'active';
        var statusText = status === 'inactive' ? 'Inactive' : 'Active';
        var imageHtml = p.imageUrl
            ? '<div class="product-list-thumb"><img src="' + p.imageUrl + '" alt="' + escapeHtml(p.name) + '"></div>'
            : '<div class="product-list-thumb"><div class="product-list-thumb-placeholder">' + (escapeHtml(p.name || 'M')[0] || 'M') + '</div></div>';
        return '' +
            '<tr>' +
            '<td data-label="#">' + (i + 1) + '</td>' +
            '<td data-label="Mahsulot"><div class="product-list-info">' + imageHtml +
            '<div class="product-list-meta"><span class="product-list-name">' + escapeHtml(p.name) + '</span></div></div></td>' +
            '<td data-label="Kategoriya">' + escapeHtml(p.category || 'вЂ”') + '</td>' +
            '<td data-label="Narx">' + formatMoney(p.price) + '</td>' +
            '<td data-label="Tannarx">' + (p.cost ? formatMoney(p.cost) : '\u2014') + '</td>' +
            '<td data-label="Status"><span class="status-badge ' + statusClass + '">' + statusText + '</span></td>' +
            '<td data-label="Amallar">' +
            '<button class="btn-icon edit product-edit-btn" data-id="' + p.id + '" title="Tahrirlash"><i class="fas fa-pen"></i></button>' +
            '<button class="btn-icon delete product-delete-btn" data-id="' + p.id + '" data-name="' + escapeHtml(p.name) + '" data-storage-path="' + (p.imageStoragePath || '') + '" title="O\'chirish"><i class="fas fa-trash"></i></button>' +
            '</td>' +
            '</tr>';
    }).join('');
}

function editProduct(id) {
    var p = productsArr.find(function (x) { return x.id === id; });
    if (!p) return;
    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name;
    initSelectPicker('productCategoryPicker', allProductCategories);
    setSelectValue('productCategoryPicker', p.category, p.category);
    setSelectValue('productStatusPicker', p.status || 'active', (p.status || 'active') === 'active' ? 'Active' : 'Inactive');
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-box-open"></i> Mahsulotni tahrirlash';
    // Mavjud rasmni ko'rsatish
    resetImageUpload();
    if (p.imageUrl) {
        document.getElementById('imagePreview').src = p.imageUrl;
        document.getElementById('imagePreviewContainer').style.display = 'block';
        document.getElementById('imageUploadPlaceholder').style.display = 'none';
    }
    openModal('productModal');
}

document.getElementById('addProductBtn').addEventListener('click', function () {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    initSelectPicker('productCategoryPicker', allProductCategories);
    setSelectValue('productCategoryPicker', '', 'Tanlang...');
    setSelectValue('productStatusPicker', 'active', 'Active');
    document.getElementById('productModalTitle').innerHTML = '<i class="fas fa-box-open"></i> Yangi Mahsulot';
    resetImageUpload();
    openModal('productModal');
});

// Generic Status Picker
initSelectPicker('productStatusPicker');
initSelectPicker('newUserRolePicker');


document.getElementById('productForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('productId').value;
    var fileInput = document.getElementById('productImage');
    var file = fileInput.files && fileInput.files[0];

    var data = {
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value) || 0,
        status: document.getElementById('productStatus').value || 'active',
        cost: parseFloat(document.getElementById('productCost').value) || 0,
        description: document.getElementById('productDescription').value.trim(),
        updatedAt: new Date().toISOString()
    };

    // Rasm yuklash oвЂchirildi
    if (file) {
        data.imageUrl = document.getElementById('imagePreview').src || '';
        data.imageStoragePath = '';
    }
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('imageUploadArea').classList.remove('uploading');
    saveProductData(id, data);
});



// CUSTOMERS CRUD REMOVED




// SALES MULTI-ITEM LOGIC
function getAvailableSaleProducts() {
    var list = productsArr.slice();
    if (currentUserRole !== 'admin') {
        list = list.filter(function (p) { return (p.status || 'active') !== 'inactive'; });
    }
    return list.sort(function (a, b) {
        return (a.name || '').localeCompare((b.name || ''), 'uz');
    });
}

function getSaleProductById(productId) {
    return productsArr.find(function (p) { return p.id === productId; }) || null;
}

function getSaleProductLabel(productId) {
    var product = getSaleProductById(productId);
    return product ? (product.name || 'Mahsulot') : 'Mahsulot tanlang...';
}

function buildSaleProductThumb(product) {
    if (product && product.imageUrl) {
        return '<img src="' + escapeHtml(product.imageUrl) + '" alt="' + escapeHtml(product.name || 'Mahsulot') + '">';
    }
    var firstLetter = ((product && product.name) ? product.name : 'M').charAt(0).toUpperCase();
    return '<span class="product-option-fallback">' + escapeHtml(firstLetter) + '</span>';
}

function buildSaleProductMenuItems(selectedId) {
    var products = getAvailableSaleProducts();
    if (products.length === 0) {
        return '<div class="product-option-empty">Mahsulot topilmadi</div>';
    }

    return products.map(function (p) {
        var isActive = p.id === selectedId ? ' active' : '';
        return '<button type="button" class="product-option-item' + isActive + '" data-pid="' + p.id + '">' +
            '<div class="product-option-thumb">' + buildSaleProductThumb(p) + '</div>' +
            '<div class="product-option-meta">' +
            '<span class="product-option-name">' + escapeHtml(p.name || 'Noma\'lum') + '</span>' +
            '<span class="product-option-price">' + formatMoney(p.price) + '</span>' +
            '</div>' +
            '</button>';
    }).join('');
}

function closeSaleProductDropdowns(exceptPicker) {
    document.querySelectorAll('#saleItemsList .item-product.open').forEach(function (picker) {
        if (exceptPicker && picker === exceptPicker) return;
        picker.classList.remove('open');
    });
}

var saleProductDropdownEventsBound = false;
function bindSaleProductDropdownEvents() {
    if (saleProductDropdownEventsBound) return;
    saleProductDropdownEventsBound = true;

    document.addEventListener('click', function (e) {
        if (!e.target.closest('#saleItemsList .item-product')) {
            closeSaleProductDropdowns();
        }
    });
}

function setSaleRowProduct(row, productId, autofillPrice) {
    var hiddenInput = row.querySelector('.item-product-select');
    var labelEl = row.querySelector('.item-product-trigger-label');
    var triggerBtn = row.querySelector('.item-product-trigger');
    var menu = row.querySelector('.item-product-dropdown');
    var priceInput = row.querySelector('.item-price-input');
    var safeId = productId || '';
    var product = getSaleProductById(safeId);
    if (!product) {
        safeId = '';
    }
    product = getSaleProductById(safeId);

    if (hiddenInput) hiddenInput.value = safeId;
    row.dataset.pid = safeId;
    if (labelEl) labelEl.textContent = getSaleProductLabel(safeId);
    if (triggerBtn) triggerBtn.title = getSaleProductLabel(safeId);
    row.classList.toggle('product-not-selected', !product);

    if (menu) {
        menu.querySelectorAll('.product-option-item').forEach(function (item) {
            item.classList.toggle('active', item.getAttribute('data-pid') === safeId);
        });
    }

    if (autofillPrice && priceInput) {
        priceInput.value = product ? (parseFloat(product.price) || 0) : 0;
    }

    updateSaleTotal();
}

function syncSaleItemRowOptions() {
    document.querySelectorAll('#saleItemsList .sale-item-row').forEach(function (row) {
        var hiddenInput = row.querySelector('.item-product-select');
        var selectedId = hiddenInput ? hiddenInput.value : '';
        var menu = row.querySelector('.item-product-dropdown');
        if (menu) {
            menu.innerHTML = buildSaleProductMenuItems(selectedId);
        }
        setSaleRowProduct(row, selectedId, false);
    });
}

function addSaleItemRow(itemData) {
    itemData = itemData || {};
    var container = document.getElementById('saleItemsList');
    if (!container) return;

    var selectedId = itemData.productId || '';
    var selectedProduct = getSaleProductById(selectedId);
    var quantity = parseInt(itemData.quantity, 10);
    if (!quantity || quantity < 1) quantity = 1;
    var price = parseFloat(itemData.price);
    if (isNaN(price)) price = selectedProduct ? (parseFloat(selectedProduct.price) || 0) : 0;

    var row = document.createElement('div');
    row.className = 'sale-item-row';
    row.dataset.pid = selectedId;
    row.innerHTML = '<div class="item-product">' +
        '<input type="hidden" class="item-product-select" value="' + escapeHtml(selectedId) + '">' +
        '<button type="button" class="item-product-trigger">' +
        '<span class="item-product-trigger-label">' + escapeHtml(getSaleProductLabel(selectedId)) + '</span>' +
        '<i class="fas fa-chevron-down"></i>' +
        '</button>' +
        '<div class="item-product-dropdown">' + buildSaleProductMenuItems(selectedId) + '</div>' +
        '</div>' +
        '<div class="item-qty item-qty-stepper">' +
        '<button type="button" class="qty-btn qty-minus" title="Kamaytirish"><i class="fas fa-minus"></i></button>' +
        '<input type="number" class="item-qty-input" min="1" step="1" value="' + quantity + '" required>' +
        '<button type="button" class="qty-btn qty-plus" title="Ko\'paytirish"><i class="fas fa-plus"></i></button>' +
        '</div>' +
        '<div class="item-price"><div class="item-price-wrap"><input type="number" class="item-price-input" min="0" step="100" value="' + price + '" required><span class="item-price-suffix">so\'m</span></div></div>' +
        '<button type="button" class="sale-item-remove" title="O\'chirish"><i class="fas fa-trash"></i></button>';

    var productPicker = row.querySelector('.item-product');
    var productMenu = row.querySelector('.item-product-dropdown');
    var productTrigger = row.querySelector('.item-product-trigger');
    var qtyInput = row.querySelector('.item-qty-input');
    var priceInput = row.querySelector('.item-price-input');
    var minusBtn = row.querySelector('.qty-minus');
    var plusBtn = row.querySelector('.qty-plus');

    bindSaleProductDropdownEvents();

    productTrigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = productPicker.classList.contains('open');
        closeSaleProductDropdowns(productPicker);
        productPicker.classList.toggle('open', !isOpen);
    });

    productMenu.addEventListener('click', function (e) {
        var option = e.target.closest('.product-option-item');
        if (!option) return;
        var pid = option.getAttribute('data-pid') || '';
        setSaleRowProduct(row, pid, true);
        productPicker.classList.remove('open');
    });

    qtyInput.addEventListener('input', updateSaleTotal);
    qtyInput.addEventListener('blur', function () {
        var qty = parseInt(this.value, 10);
        this.value = qty && qty > 0 ? qty : 1;
        updateSaleTotal();
    });

    minusBtn.addEventListener('click', function () {
        var qty = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = Math.max(1, qty - 1);
        updateSaleTotal();
    });

    plusBtn.addEventListener('click', function () {
        var qty = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = qty + 1;
        updateSaleTotal();
    });

    priceInput.addEventListener('input', updateSaleTotal);
    priceInput.addEventListener('blur', function () {
        var val = parseFloat(this.value);
        this.value = !isNaN(val) && val >= 0 ? val : 0;
        updateSaleTotal();
    });

    row.querySelector('.sale-item-remove').addEventListener('click', function () {
        row.remove();
        if (!container.querySelector('.sale-item-row')) {
            addSaleItemRow();
            return;
        }
        updateSaleTotal();
    });

    container.appendChild(row);
    setSaleRowProduct(row, selectedId, false);
}

function updateSaleTotal() {
    var total = 0;
    document.querySelectorAll('.sale-item-row').forEach(function (row) {
        var productSelect = row.querySelector('.item-product-select');
        var pid = productSelect ? productSelect.value : '';
        if (!pid) return;
        var qty = parseFloat(row.querySelector('.item-qty-input').value) || 0;
        var price = parseFloat(row.querySelector('.item-price-input').value) || 0;
        total += qty * price;
    });
    document.getElementById('saleTotalDisplay').textContent = formatMoney(total);
}

var addSaleItemBtn = document.getElementById('addSaleItemBtn');
if (addSaleItemBtn) {
    addSaleItemBtn.addEventListener('click', function () {
        addSaleItemRow();
    });
}



function renderSales(searchTerm) {
    searchTerm = searchTerm || '';
    var tbody = document.getElementById('salesBody');
    var empty = document.getElementById('salesEmpty');
    var filtered = salesArr.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    if (searchTerm) {
        var q = searchTerm.toLowerCase();
        filtered = filtered.filter(function (s) {
            return (s.name && s.name.toLowerCase().includes(q)) ||
                (s.region && s.region.toLowerCase().includes(q)) ||
                s.date.includes(q);
        });
    }
    if (filtered.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = filtered.map(function (s, i) {
        var items = s.items || [];
        var tagsHtml = items.map(function (it) {
            var p = productsArr.find(function (px) { return px.id === it.productId; });
            var pname = p ? escapeHtml(p.name) : '—';
            return '<span class="sale-row-item-tag">' + pname + ' <span class="qty">x' + it.quantity + '</span></span>';
        }).join('');

        var itemsHtml = '<div class="sale-items-card" data-sale-id="' + s.id + '">' + tagsHtml + '</div>';

        if (items.length > 5) {
            itemsHtml = '<div class="sale-items-card" data-sale-id="' + s.id + '">' +
                '<span class="sale-row-items-count"><i class="fas fa-boxes-stacked"></i> ' + items.length + ' ta mahsulot</span>' +
                '</div>';
        }

        var fullItemsText = items.map(function (it) {
            var p = productsArr.find(function (px) { return px.id === it.productId; });
            return (p ? p.name : '—') + ' (x' + it.quantity + ')';
        }).join(', ');

        return '' +
            '<tr class="sale-data-row">' +
            '<td data-label="#">' + (i + 1) + '</td>' +
            '<td data-label="Sana"><div class="sale-date-cell"><i class="far fa-calendar-alt"></i> ' + formatDate(s.date) + '</div></td>' +
            '<td data-label="Nomi"><span class="sale-user-name">' + escapeHtml(s.name || '—') + '</span></td>' +
            '<td data-label="Viloyat"><div class="sale-region-badge"><i class="fas fa-location-dot"></i> ' + escapeHtml(s.region || '—') + '</div></td>' +
            '<td data-label="Mahsulotlar" title="' + fullItemsText + '"><div class="sale-items-wrap">' + itemsHtml + '</div></td>' +
            '<td data-label="Jami summa" class="amount-highlight">' + formatMoney(s.totalAmount) + '</td>' +
            '<td data-label="Amallar"><div class="sale-actions-wrap"><button class="btn-icon edit sale-edit-btn" data-id="' + s.id + '" title="Tahrirlash"><i class="fas fa-pen"></i></button>' +
            '<button class="btn-icon delete sale-delete-btn" data-id="' + s.id + '" title="O\'chirish"><i class="fas fa-trash"></i></button></div></td>' +
            '</tr>';
    }).join('');
}

// Global viewer logic
document.addEventListener('click', function (e) {
    var card = e.target.closest('.sale-items-card');
    if (card) {
        var sid = card.getAttribute('data-sale-id');
        var sale = salesArr.find(function (x) { return x.id === sid; });
        if (sale && sale.items) {
            var gallery = document.getElementById('saleImagesGallery');
            gallery.innerHTML = '<div class="loader-placeholder" style="text-align:center; padding:20px; width:100%"><i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...</div>';
            openModal('viewSaleImagesModal');

            var imagesHtml = sale.items.map(function (it) {
                var p = productsArr.find(function (px) { return px.id === it.productId; });
                if (p && p.imageUrl) {
                    return '<div class="gallery-item">' +
                        '<img src="' + p.imageUrl + '" alt="' + escapeHtml(p.name) + '">' +
                        '<div class="gallery-item-info">' + escapeHtml(p.name) + ' (x' + it.quantity + ')</div>' +
                        '</div>';
                }
                return '<div class="gallery-item no-img">' +
                    '<div class="placeholder"><i class="fas fa-image"></i></div>' +
                    '<div class="gallery-item-info">' + (p ? escapeHtml(p.name) : '—') + ' (x' + it.quantity + ')</div>' +
                    '</div>';
            }).join('');

            gallery.innerHTML = imagesHtml || '<p style="text-align:center; padding:20px; color:var(--text-muted)">Rasmlar mavjud emas</p>';
        }
    }
});

function editSale(id) {
    var s = salesArr.find(function (x) { return x.id === id; });
    if (!s) return;
    document.getElementById('saleId').value = s.id;
    document.getElementById('saleDate').value = s.date;
    document.getElementById('saleName').value = s.name || '';
    initSelectPicker('saleRegionPicker', allRegions);
    setSelectValue('saleRegionPicker', s.region || '', s.region || 'Tanlang...');
    document.getElementById('saleNote').value = s.note || '';

    // Clear and fill rows
    document.getElementById('saleItemsList').innerHTML = '';
    if (s.items && s.items.length > 0) {
        s.items.forEach(function (it) { addSaleItemRow(it); });
    } else if (s.productId) {
        // Handle migration for old single-item sales
        addSaleItemRow({ productId: s.productId, quantity: s.quantity || 1, price: s.price });
    } else {
        addSaleItemRow();
    }

    document.getElementById('saleModalTitle').innerHTML = '<i class="fas fa-shopping-cart"></i> Sotuvni tahrirlash';
    openModal('saleModal');
}

document.getElementById('addSaleBtn').addEventListener('click', function () {
    document.getElementById('saleForm').reset();
    document.getElementById('saleId').value = '';
    document.getElementById('saleDate').value = getTodayStr();
    document.getElementById('saleItemsList').innerHTML = '';
    addSaleItemRow();
    initSelectPicker('saleRegionPicker', allRegions);
    setSelectValue('saleRegionPicker', '', 'Tanlang...');
    document.getElementById('saleTotalDisplay').textContent = "0 so'm";
    document.getElementById('saleModalTitle').innerHTML = '<i class="fas fa-shopping-cart"></i> Yangi Sotuv';
    openModal('saleModal');
    setTimeout(function () {
        var firstPicker = document.querySelector('#saleItemsList .item-product-trigger');
        if (firstPicker) firstPicker.focus();
    }, 300);
});

document.getElementById('saleForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('saleId').value;
    var items = [];
    var totalAmount = 0;

    document.querySelectorAll('.sale-item-row').forEach(function (row) {
        var productSelect = row.querySelector('.item-product-select');
        var pid = productSelect ? productSelect.value : '';
        var qty = parseInt(row.querySelector('.item-qty-input').value) || 0;
        var price = parseFloat(row.querySelector('.item-price-input').value) || 0;
        if (pid && qty > 0) {
            items.push({ productId: pid, quantity: qty, price: price });
            totalAmount += qty * price;
        }
    });

    if (items.length === 0) { showToast('Kamida bitta mahsulot tanlang!', 'error'); return; }

    var data = {
        date: document.getElementById('saleDate').value,
        name: document.getElementById('saleName').value.trim(),
        region: document.getElementById('saleRegion').value,
        items: items,
        totalAmount: totalAmount,
        note: document.getElementById('saleNote').value.trim(),
        updatedAt: new Date().toISOString()
    };

    if (id) {
        db.collection("sales").doc(id).update(data).then(function () { showToast('Sotuv yangilandi!'); closeModal('saleModal'); }).catch(function (err) { showToast('Xatolik: ' + err.message, 'error'); });
    } else {
        data.createdAt = new Date().toISOString();
        db.collection("sales").add(data).then(function (docRef) {
            // Auto add income to finance
            var desc = (data.name || '') + ': ';
            desc += items.map(function (it) {
                var p = productsArr.find(function (px) { return px.id === it.productId; });
                return (p ? p.name : 'Mahs') + ' (x' + it.quantity + ')';
            }).join(', ');

            db.collection("finances").add({
                date: data.date,
                type: 'income',
                category: 'Sotuv daromadi',
                description: desc,
                amount: totalAmount,
                saleId: docRef.id,
                createdAt: new Date().toISOString()
            });

            showToast("Yangi sotuv qo'shildi!");
            closeModal('saleModal');
            // Update customer stats if applicable
            updateCustomerStats(data.name, totalAmount);
        }).catch(function (err) { showToast('Xatolik: ' + err.message, 'error'); });
    }
});

function updateCustomerStats(customerName, amount) {
    if (!customerName) return;
    // Ism bo'yicha mijozni qidirish (sodda usul)
    db.collection('customers').where('name', '==', customerName).get().then(function (snapshot) {
        snapshot.forEach(function (doc) {
            var c = doc.data();
            db.collection('customers').doc(doc.id).update({
                salesCount: (c.salesCount || 0) + 1,
                totalSpent: (c.totalSpent || 0) + amount,
                lastPurchaseDate: new Date().toISOString()
            });
        });
    });
}

// ==========================================
// === FINANCE CRUD ===
// ==========================================
function populateFinanceCategories(type) {
    var cats = type === 'income' ? incomeCategories : expenseCategories;
    initSelectPicker('financeCategoryPicker', cats);
    setSelectValue('financeCategoryPicker', '', 'Tanlang...');
}

function renderFinance(searchTerm) {
    searchTerm = searchTerm || '';
    var tbody = document.getElementById('financeBody');
    var empty = document.getElementById('financeEmpty');
    var filtered = financesArr.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    if (searchTerm) {
        var q = searchTerm.toLowerCase();
        filtered = filtered.filter(function (f) { return f.category.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)) || f.date.includes(q); });
    }
    var totalIncome = financesArr.filter(function (f) { return f.type === 'income'; }).reduce(function (sum, f) { return sum + f.amount; }, 0);
    var totalExpense = financesArr.filter(function (f) { return f.type === 'expense'; }).reduce(function (sum, f) { return sum + f.amount; }, 0);
    document.getElementById('financeIncome').textContent = formatMoney(totalIncome);
    document.getElementById('financeExpense').textContent = formatMoney(totalExpense);
    document.getElementById('financeBalance').textContent = formatMoney(totalIncome - totalExpense);
    if (filtered.length === 0) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    tbody.innerHTML = filtered.map(function (f, i) {
        var isInc = f.type === 'income';
        return '' +
            '<tr>' +
            '<td data-label="#">' + (i + 1) + '</td>' +
            '<td data-label="Sana">' + formatDate(f.date) + '</td>' +
            '<td data-label="Turi"><span class="type-badge ' + f.type + '"><i class="fas fa-' + (isInc ? 'arrow-down' : 'arrow-up') + '"></i> ' + (isInc ? 'Kirim' : 'Chiqim') + '</span></td>' +
            '<td data-label="Kategoriya">' + escapeHtml(f.category) + '</td>' +
            '<td data-label="Tavsif">' + escapeHtml(f.description || 'вЂ”') + '</td>' +
            '<td data-label="Summa" class="' + (isInc ? 'amount-positive' : 'amount-negative') + '">' + (isInc ? '+' : '-') + formatMoney(f.amount) + '</td>' +
            '<td data-label="Amallar">' +
            '<button class="btn-icon edit finance-edit-btn" data-id="' + f.id + '" title="Tahrirlash"><i class="fas fa-pen"></i></button>' +
            '<button class="btn-icon delete finance-delete-btn" data-id="' + f.id + '" title="O\'chirish"><i class="fas fa-trash"></i></button>' +
            '</td>' +
            '</tr>';
    }).join('');
}

function editFinance(id) {
    var f = financesArr.find(function (x) { return x.id === id; });
    if (!f) return;
    document.getElementById('financeId').value = f.id;
    document.getElementById('financeType').value = f.type;
    document.getElementById('financeDate').value = f.date;
    document.getElementById('financeAmount').value = f.amount;
    document.getElementById('financeDescription').value = f.description || '';
    var isInc = f.type === 'income';
    document.getElementById('financeModalTitle').innerHTML = isInc ? '<i class="fas fa-arrow-circle-down" style="color:var(--success)"></i> Kirimni tahrirlash' : '<i class="fas fa-arrow-circle-up" style="color:var(--danger)"></i> Chiqimni tahrirlash';
    populateFinanceCategories(f.type);
    setSelectValue('financeCategoryPicker', f.category, f.category);
    openModal('financeModal');
}

document.getElementById('addIncomeBtn').addEventListener('click', function () {
    document.getElementById('financeForm').reset();
    document.getElementById('financeId').value = '';
    document.getElementById('financeType').value = 'income';
    document.getElementById('financeDate').value = getTodayStr();
    document.getElementById('financeModalTitle').innerHTML = '<i class="fas fa-arrow-circle-down" style="color:var(--success)"></i> Kirim qo\'shish';
    populateFinanceCategories('income');
    openModal('financeModal');
});

document.getElementById('addExpenseBtn').addEventListener('click', function () {
    document.getElementById('financeForm').reset();
    document.getElementById('financeId').value = '';
    document.getElementById('financeType').value = 'expense';
    document.getElementById('financeDate').value = getTodayStr();
    document.getElementById('financeModalTitle').innerHTML = '<i class="fas fa-arrow-circle-up" style="color:var(--danger)"></i> Chiqim qo\'shish';
    populateFinanceCategories('expense');
    openModal('financeModal');
});

// Dashboard expense button - opens same finance modal in expense mode
document.getElementById('addDashExpenseBtn').addEventListener('click', function () {
    document.getElementById('financeForm').reset();
    document.getElementById('financeId').value = '';
    document.getElementById('financeType').value = 'expense';
    document.getElementById('financeDate').value = getTodayStr();
    document.getElementById('financeModalTitle').innerHTML = '<i class="fas fa-arrow-circle-up" style="color:var(--danger)"></i> Chiqim qo\'shish';
    populateFinanceCategories('expense');
    openModal('financeModal');
});

document.getElementById('financeForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('financeId').value;
    var data = {
        date: document.getElementById('financeDate').value,
        type: document.getElementById('financeType').value,
        category: document.getElementById('financeCategory').value,
        description: document.getElementById('financeDescription').value.trim(),
        amount: parseFloat(document.getElementById('financeAmount').value) || 0
    };
    if (id) {
        db.collection("finances").doc(id).update(data).then(function () { showToast("Ma'lumot yangilandi!"); closeModal('financeModal'); }).catch(function (err) { showToast('Xatolik: ' + err.message, 'error'); });
    } else {
        data.createdAt = new Date().toISOString();
        db.collection("finances").add(data).then(function () { showToast(data.type === 'income' ? "Kirim qo'shildi!" : "Chiqim qo'shildi!"); closeModal('financeModal'); }).catch(function (err) { showToast('Xatolik: ' + err.message, 'error'); });
    }
});

// ==========================================
// === UNIVERSAL DELETE ===
// ==========================================
var deleteTarget = { coll: '', id: '', storagePath: '' };

function deleteItem(coll, id, name) {
    deleteTarget = { coll: coll, id: id, storagePath: '' };
    document.getElementById('deleteMessage').textContent = '"' + name + '" ni o\'chirmoqchimisiz?';
    openModal('deleteModal');
}

// Mahsulotni rasm bilan birga o'chirish
function deleteProductWithImage(id, name, storagePath) {
    deleteTarget = { coll: 'products', id: id, storagePath: storagePath || '' };
    document.getElementById('deleteMessage').textContent = '"' + name + '" ni o\'chirmoqchimisiz?';
    openModal('deleteModal');
}

// Delegatsiya qilingan click handlerlar (inline onclick o'rniga)
document.addEventListener('click', function (e) {
    var btn;

    // Product edit
    btn = e.target.closest('.product-edit-btn');
    if (btn) {
        var pid = btn.getAttribute('data-id');
        if (pid) editProduct(pid);
        return;
    }

    // Product delete
    btn = e.target.closest('.product-delete-btn');
    if (btn) {
        var dpId = btn.getAttribute('data-id');
        var dpName = btn.getAttribute('data-name') || '';
        var dpPath = btn.getAttribute('data-storage-path') || '';
        deleteProductWithImage(dpId, dpName, dpPath);
        return;
    }



    // Sale edit
    btn = e.target.closest('.sale-edit-btn');
    if (btn) {
        var sid = btn.getAttribute('data-id');
        if (sid) editSale(sid);
        return;
    }

    // Sale delete
    btn = e.target.closest('.sale-delete-btn');
    if (btn) {
        var sdelId = btn.getAttribute('data-id');
        deleteItem('sales', sdelId, 'bu sotuvni');
        return;
    }

    // Finance edit
    btn = e.target.closest('.finance-edit-btn');
    if (btn) {
        var fid = btn.getAttribute('data-id');
        if (fid) editFinance(fid);
        return;
    }

    // Finance delete
    btn = e.target.closest('.finance-delete-btn');
    if (btn) {
        var fdelId = btn.getAttribute('data-id');
        deleteItem('finances', fdelId, 'bu yozuvni');
        return;
    }
});

document.getElementById('confirmDeleteBtn').addEventListener('click', function () {
    var storagePath = deleteTarget.storagePath;
    db.collection(deleteTarget.coll).doc(deleteTarget.id).delete().then(function () {
        closeModal('deleteModal');
        showToast("O'chirildi!", 'info');
        // Agar mahsulot rasmi bo'lsa, uni Storage dan ham o'chirish
        if (storagePath) {
            storage.ref(storagePath).delete().catch(function () {
                // Rasm o'chirishda xatolik bo'lsa ham jarayon davom etadi
            });
        }
    }).catch(function (err) { showToast('Xatolik: ' + err.message, 'error'); });
});

// ==========================================
// === DASHBOARD ===
// ==========================================

function refreshDashboard() {
    var inc = financesArr.filter(function (f) { return f.type === 'income'; }).reduce(function (s, f) { return s + f.amount; }, 0);
    var exp = financesArr.filter(function (f) { return f.type === 'expense'; }).reduce(function (s, f) { return s + f.amount; }, 0);

    document.getElementById('totalIncome').textContent = formatMoney(inc);
    document.getElementById('totalExpense').textContent = formatMoney(exp);
    document.getElementById('totalProfit').textContent = formatMoney(inc - exp);

    // 1. REGION STATS
    var regionCount = {};
    var regionSum = {};
    salesArr.forEach(function (s) {
        var r = s.region || "Noma'lum";
        regionCount[r] = (regionCount[r] || 0) + 1;
        regionSum[r] = (regionSum[r] || 0) + (s.totalAmount || 0);
    });

    var demoList = document.getElementById('demographicsList');
    if (demoList) {
        var sortedRegions = Object.keys(regionCount).sort(function (a, b) { return regionCount[b] - regionCount[a]; }).slice(0, 10);
        if (sortedRegions.length === 0) {
            demoList.innerHTML = '<p class="text-muted" style="text-align:center; padding:20px;">Hali sotuvlar geografiyasi shakllanmagan</p>';
        } else {
            demoList.innerHTML = sortedRegions.map(function (r) {
                var count = regionCount[r];
                var sum = regionSum[r] || 0;
                var percent = Math.round((count / (salesArr.length || 1)) * 100);
                return '<div class="demographic-item">' +
                    '<div class="region-icon"><i class="fas fa-location-dot"></i></div>' +
                    '<div class="region-info">' +
                    '<span class="region-name">' + escapeHtml(r) + '</span>' +
                    '<span class="region-count">' + count + ' ta sotuv</span>' +
                    '</div>' +
                    '<div class="region-sum">' + formatMoney(sum) + '</div>' +
                    '<div class="region-progress-wrap">' +
                    '<div class="region-progress-bar"><div class="region-progress-fill" style="width: ' + percent + '%"></div></div>' +
                    '<span class="region-percent">' + percent + '%</span>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }
    }

    // 2. TOP PRODUCTS
    var prodStats = {};
    salesArr.forEach(function (s) {
        (s.items || []).forEach(function (it) {
            prodStats[it.productId] = (prodStats[it.productId] || 0) + (it.quantity || 0);
        });
    });

    var topListEl = document.getElementById('topProductsList');
    if (topListEl) {
        var sortedProds = Object.keys(prodStats).sort(function (a, b) { return prodStats[b] - prodStats[a]; }).slice(0, 10);
        if (sortedProds.length === 0) {
            topListEl.innerHTML = '<p class="text-muted" style="text-align:center; padding:10px;">Ma\'lumot yo\'q</p>';
        } else {
            topListEl.innerHTML = sortedProds.map(function (pid, index) {
                var product = productsArr.find(function (p) { return p.id === pid; });
                var name = product ? product.name : "Noma'lum";
                var qty = prodStats[pid];
                var imgHtml = (product && product.imageUrl)
                    ? '<img src="' + escapeHtml(product.imageUrl) + '" class="top-img" alt="' + escapeHtml(name) + '">'
                    : '<div class="top-img-placeholder">' + (name.charAt(0).toUpperCase() || 'M') + '</div>';
                var priceText = product ? formatMoney(product.price) : "Narx yo'q";

                return '<li class="top-item">' +
                    '<div class="top-img-wrap">' + imgHtml + '</div>' +
                    '<div class="top-info">' +
                    '<span class="top-name">' + escapeHtml(name) + '</span>' +
                    '<span class="top-meta">' + priceText + ' — ' + qty + ' dona</span>' +
                    '</div>' +
                    '</li>';
            }).join('');
        }
    }

    // 4. EXPENSES (Recent 10) - New Visual Design
    var expenses = financesArr.filter(function (f) { return f.type === 'expense'; }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 10);
    var listContainer = document.getElementById('dashExpenseList');
    var emptyE = document.getElementById('dashEmptyExpense');

    if (expenses.length === 0) {
        if (listContainer) listContainer.innerHTML = '';
        if (emptyE) emptyE.style.display = 'block';
    } else {
        if (emptyE) emptyE.style.display = 'none';
        if (listContainer) {
            listContainer.innerHTML = expenses.map(function (f) {
                var desc = (f.description || "").toLowerCase();
                var icon = "fa-receipt";
                var typeClass = "other";

                if (desc.includes('yandex') || desc.includes('taxi') || desc.includes('taksi')) {
                    icon = "fa-car";
                    typeClass = "transport";
                } else if (desc.includes('target') || desc.includes('reklama') || desc.includes('ads')) {
                    icon = "fa-bullhorn";
                    typeClass = "marketing";
                } else if (desc.includes('pochta') || desc.includes('dostavka') || desc.includes('kurer')) {
                    icon = "fa-envelope";
                    typeClass = "service";
                }

                return '<div class="expense-row">' +
                    '<div class="expense-icon-wrap ' + typeClass + '"><i class="fas ' + icon + '"></i></div>' +
                    '<div class="expense-details">' +
                    '<span class="expense-title">' + escapeHtml(f.description || '—') + '</span>' +
                    '<span class="expense-date">' + formatDate(f.date) + '</span>' +
                    '</div>' +
                    '<div class="expense-value-wrap">' +
                    '<span class="expense-value">-' + formatMoney(f.amount) + '</span>' +
                    '</div>' +
                    '</div>';
            }).join('');
        }
    }
}


// ==========================================
// === SETTINGS: THEME MODE ===
// ==========================================
function setThemeMode(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('crm_theme_mode', mode);

    var lightBtn = document.getElementById('btnLightMode');
    var darkBtn = document.getElementById('btnDarkMode');
    if (!lightBtn || !darkBtn) return;

    if (mode === 'light') {
        lightBtn.classList.remove('btn-secondary');
        lightBtn.classList.add('btn-primary');
        darkBtn.classList.remove('btn-primary');
        darkBtn.classList.add('btn-secondary');
    } else {
        darkBtn.classList.remove('btn-secondary');
        darkBtn.classList.add('btn-primary');
        lightBtn.classList.remove('btn-primary');
        lightBtn.classList.add('btn-secondary');
    }
}

// Load saved theme
var savedTheme = localStorage.getItem('crm_theme_mode') || 'dark';
setThemeMode(savedTheme);

document.getElementById('btnLightMode').addEventListener('click', function () {
    setThemeMode('light');
    showToast('Kunduzgi holat yoqildi!', 'info');
});

document.getElementById('btnDarkMode').addEventListener('click', function () {
    setThemeMode('dark');
    showToast('Tungi holat yoqildi!', 'info');
});

// ==========================================
// === SETTINGS: USER MANAGEMENT ===
// ==========================================
document.getElementById('addUserBtn').addEventListener('click', function () {
    document.getElementById('userForm').reset();
    document.getElementById('editUserId').value = '';
    document.getElementById('newUserEmail').disabled = false;
    document.getElementById('newUserPassword').required = true;
    document.getElementById('passGroup').style.display = 'block';
    initSelectPicker('newUserRolePicker');
    setSelectValue('newUserRolePicker', 'manager', 'Manager (Cheklangan)');
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Yangi xodim qo\'shish';
    openModal('userModal');
});

function editUser(id) {
    var u = usersArr.find(function (x) { return x.id === id; });
    if (!u) return;
    document.getElementById('userForm').reset();
    document.getElementById('editUserId').value = u.id;
    document.getElementById('newUserName').value = u.name;
    document.getElementById('newUserEmail').value = u.email;
    initSelectPicker('newUserRolePicker');
    var roleVal = u.role || 'manager';
    var roleLab = roleVal === 'admin' ? 'Admin (To\'liq huquq)' : 'Manager (Cheklangan)';
    setSelectValue('newUserRolePicker', roleVal, roleLab);
    
    // Ruxsatnomalarni to'ldirish
    var perms = u.permissions || { sales: true, customers: true, finance: true, products: true, staff: false, settings: false };
    document.getElementById('perm_sales').checked = perms.sales !== false;
    document.getElementById('perm_customers').checked = perms.customers !== false;
    document.getElementById('perm_finance').checked = perms.finance !== false;
    document.getElementById('perm_products').checked = perms.products !== false;
    document.getElementById('perm_staff').checked = !!perms.staff;
    document.getElementById('perm_settings').checked = !!perms.settings;

    document.getElementById('newUserEmail').disabled = true;
    document.getElementById('newUserPassword').required = false;
    document.getElementById('newUserPassword').placeholder = "O'zgartirish uchun yangi parol kiriting (ixtiyoriy)";
    document.getElementById('passGroup').style.display = 'block';
    document.getElementById('userModalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Xodimni tahrirlash';
    openModal('userModal');
}

document.getElementById('userForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('editUserId').value;
    var name = document.getElementById('newUserName').value.trim();
    var email = document.getElementById('newUserEmail').value.trim().toLowerCase();
    var password = document.getElementById('newUserPassword').value;

    var btn = document.getElementById('createUserBtn');
    btn.disabled = true;
    btn.textContent = 'Saqlanmoqda...';

    var permissions = {
        sales: document.getElementById('perm_sales').checked,
        customers: document.getElementById('perm_customers').checked,
        finance: document.getElementById('perm_finance').checked,
        products: document.getElementById('perm_products').checked,
        staff: document.getElementById('perm_staff').checked,
        settings: document.getElementById('perm_settings').checked
    };

    if (id) {
        var updateData = {
            name: name,
            role: document.getElementById('newUserRole').value,
            permissions: permissions
        };
        if (password) {
            updateData.password = password;
        }

        db.collection("users").doc(id).update(updateData).then(function () {
            showToast("Xodim ma'lumotlari yangilandi!");
            closeModal('userModal');
            btn.disabled = false;
            btn.textContent = 'Saqlash';
        }).catch(function (err) {
            btn.disabled = false;
            btn.textContent = 'Saqlash';
            showToast('Xatolik: ' + err.message, 'error');
        });
    } else {
        var secondaryApp;
        try {
            secondaryApp = firebase.app('Secondary');
        } catch (e) {
            secondaryApp = firebase.initializeApp(firebase.app().options, 'Secondary');
        }
        var secondaryAuth = secondaryApp.auth();

        secondaryAuth.createUserWithEmailAndPassword(email, password).then(function (cred) {
            return db.collection("users").doc(cred.user.uid).set({
                name: name,
                email: email,
                role: document.getElementById('newUserRole').value,
                permissions: permissions,
                password: password,
                createdAt: new Date().toISOString()
            });
        }).then(function () {
            secondaryAuth.signOut();
            showToast("Yangi xodim qo'shildi va paroli bazaga saqlandi!");
            closeModal('userModal');
            btn.disabled = false;
            btn.textContent = 'Saqlash';
        }).catch(function (err) {
            btn.disabled = false;
            btn.textContent = 'Saqlash';
            if (err.code === 'auth/email-already-in-use') {
                showToast('Bu email allaqachon ro\'yxatdan o\'tgan!', 'error');
            } else {
                showToast('Xatolik: ' + err.message, 'error');
            }
        });
    }
});

// Load users list
db.collection("users").onSnapshot(function (snapshot) {
    usersArr = [];
    snapshot.forEach(function (doc) { usersArr.push(Object.assign({ id: doc.id }, doc.data())); });
    renderUsers();
});

function renderUsers(searchTerm) {
    searchTerm = searchTerm || '';
    var tbody = document.getElementById('usersBody');
    var empty = document.getElementById('usersEmpty');
    var filtered = usersArr.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });

    if (searchTerm) {
        var q = searchTerm.toLowerCase();
        filtered = filtered.filter(function (u) {
            return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
        });
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    tbody.innerHTML = filtered.map(function (u, i) {
        var uRole = (u.role && String(u.role).trim().toLowerCase() === 'admin');
        var roleBadge = uRole ? '<span class="status-badge active">Admin</span>' : '<span class="status-badge info">Manager</span>';
        var realPassword = u.password || u.parol || u.pass || u.userPassword;
        var hasPassword = !!realPassword;
        var pwdToShow = hasPassword ? realPassword : "Parol topilmadi";

        var passwordHtml = '<div class="password-cell-inner' + (hasPassword ? '' : ' no-password') + '">' +
            '<span class="password-text" data-original="' + escapeHtml(pwdToShow) + '" data-has-pwd="' + hasPassword + '">••••••••</span>' +
            '<button type="button" class="password-eye-btn" data-visible="false" title="Ko\'rsatish/Yashirish"><i class="fas fa-eye"></i></button>' +
            '</div>';

        return '<tr class="user-data-row"><td>' + (i + 1) + '</td><td><span class="user-name-link">' + escapeHtml(u.name) + '</span></td><td>' + escapeHtml(u.email) + '</td><td>' + passwordHtml + '</td><td>' + roleBadge + '</td><td>' + formatDate(u.createdAt) + '</td>' +
            '<td><button class="btn-icon edit user-edit-btn" data-id="' + u.id + '" title="Tahrirlash"><i class="fas fa-pen"></i></button>' +
            '<button class="btn-icon delete user-delete-btn" data-id="' + u.id + '" data-name="' + escapeHtml(u.name) + '" title="O\'chirish"><i class="fas fa-trash"></i></button></td></tr>';
    }).join('');
}

// User edit/delete delegatsiya
document.addEventListener('click', function (e) {
    var btn;

    btn = e.target.closest('.user-edit-btn');
    if (btn) {
        var uid = btn.getAttribute('data-id');
        if (uid) editUser(uid);
        return;
    }

    btn = e.target.closest('.user-delete-btn');
    if (btn) {
        var udelId = btn.getAttribute('data-id');
        var udelName = btn.getAttribute('data-name') || '';
        deleteItem('users', udelId, udelName);
        return;
    }

    // Password Toggle Visibility
    var eyeBtn = e.target.closest('.password-eye-btn');
    if (eyeBtn) {
        var wrap = eyeBtn.closest('.password-cell-inner');
        var txt = wrap.querySelector('.password-text');
        var icon = eyeBtn.querySelector('i');
        var original = txt.getAttribute('data-original');
        var isVisible = eyeBtn.getAttribute('data-visible') === 'true';

        if (!isVisible) {
            txt.textContent = original;
            icon.classList.replace('fa-eye', 'fa-eye-slash');
            eyeBtn.classList.add('active');
            eyeBtn.setAttribute('data-visible', 'true');
        } else {
            txt.textContent = '••••••••';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
            eyeBtn.classList.remove('active');
            eyeBtn.setAttribute('data-visible', 'false');
        }
    }

    // Staff row click navigation
    var userRow = e.target.closest('.user-data-row');
    if (userRow && !e.target.closest('.btn-icon') && !e.target.closest('.password-eye-btn') && !e.target.closest('.user-edit-btn') && !e.target.closest('.user-delete-btn')) {
        navigateTo('profile');
    }
});

// ==========================================
// === SEARCH ===
// ==========================================
document.getElementById('salesSearch').addEventListener('input', function (e) { renderSales(e.target.value); });
document.getElementById('financeSearch').addEventListener('input', function (e) { renderFinance(e.target.value); });
document.getElementById('productsSearch').addEventListener('input', function (e) { renderProducts(e.target.value); });
document.getElementById('staffSearch').addEventListener('input', function (e) { renderUsers(e.target.value); });


// ==========================================
// === INIT ===
// ==========================================
function formatTashkentDateTime() {
    var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Tashkent',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(new Date());

    function getPart(type) {
        var part = parts.find(function (p) { return p.type === type; });
        return part ? part.value : '';
    }

    return getPart('day') + '.' + getPart('month') + '.' + getPart('year') + ' ' + getPart('hour') + ':' + getPart('minute') + ':' + getPart('second');
}

function startTopbarClock() {
    var el = document.getElementById('currentDate');
    if (!el) return;

    function tick() {
        el.textContent = formatTashkentDateTime() + ' (Toshkent)';
    }

    tick();
    setInterval(tick, 1000);
}

startTopbarClock();
navigateTo('dashboard');

// ==========================================
// === FIREBASE STORAGE - RASM YUKLASH ===
// Stub: rasm yuklash endi ishlatilmaydi
function uploadProductImage(file, callback) {
    if (typeof callback === 'function') callback('', '');
}


// Mahsulot ma'lumotlarini Firestore ga saqlash
function saveProductData(id, data) {
    if (id) {
        db.collection('products').doc(id).update(data)
            .then(function () { showToast('Mahsulot yangilandi!'); closeModal('productModal'); })
            .catch(function (err) { showToast('Xatolik: ' + err.message, 'error'); });
    } else {
        data.createdAt = new Date().toISOString();
        db.collection('products').add(data)
            .then(function () { showToast("Yangi mahsulot qo'shildi!"); closeModal('productModal'); })
            .catch(function (err) { showToast('Xatolik: ' + err.message, 'error'); });
    }
}

// Rasm input ni reset qilish yordamchi funksiyasi
function resetImageUpload() {
    document.getElementById('productImage').value = '';
    document.getElementById('imagePreview').src = '';
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('imageUploadPlaceholder').style.display = 'flex';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
}

// Rasm yuklash maydoni вЂ” click bilan fayl tanlash
var imageUploadArea = document.getElementById('imageUploadArea');
var productImageInput = document.getElementById('productImage');

imageUploadArea.addEventListener('click', function (e) {
    if (e.target.closest('#removeImageBtn')) return;
    productImageInput.click();
});

// Rasm tanlanganda preview ko'rsatish
productImageInput.addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;

    // Hajm tekshirish (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Rasm hajmi 5MB dan oshmasligi kerak!', 'error');
        this.value = '';
        return;
    }

    var reader = new FileReader();
    reader.onload = function (ev) {
        document.getElementById('imagePreview').src = ev.target.result;
        document.getElementById('imagePreviewContainer').style.display = 'block';
        document.getElementById('imageUploadPlaceholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
});

// Rasmni o'chirish (faqat previewdan, Storage dan emas)
document.getElementById('removeImageBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    resetImageUpload();
});

// Drag & drop qo'llab-quvvatlash
imageUploadArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    this.style.borderColor = 'var(--accent)';
    this.style.background = 'var(--accent-glow)';
});

imageUploadArea.addEventListener('dragleave', function () {
    this.style.borderColor = '';
    this.style.background = '';
});

imageUploadArea.addEventListener('drop', function (e) {
    e.preventDefault();
    this.style.borderColor = '';
    this.style.background = '';
    var file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
        showToast('Faqat rasm fayllarini yuklang!', 'error');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showToast('Rasm hajmi 5MB dan oshmasligi kerak!', 'error');
        return;
    }
    // Faylni input ga o'rnatish
    var dt = new DataTransfer();
    dt.items.add(file);
    productImageInput.files = dt.files;
    productImageInput.dispatchEvent(new Event('change'));
});


// ==========================================
// === CUSTOMERS MANAGEMENT ===
// ==========================================

// Mijozlar ro'yxatini yuklash va ko'rsatish
function renderCustomers(searchQuery) {
    var customersBody = document.getElementById('customersBody');
    var customersEmpty = document.getElementById('customersEmpty');
    if (!customersBody) return;

    db.collection('customers').orderBy('createdAt', 'desc').onSnapshot(function (snapshot) {
        var customers = [];
        snapshot.forEach(function (doc) {
            var data = doc.data();
            data.id = doc.id;
            if (!searchQuery ||
                data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                data.phone.includes(searchQuery)) {
                customers.push(data);
            }
        });

        if (customers.length === 0) {
            customersBody.innerHTML = '';
            customersEmpty.style.display = 'block';
        } else {
            customersEmpty.style.display = 'none';
            customersBody.innerHTML = customers.map(function (c, i) {
                var totalSpent = c.totalSpent || 0;
                var vipBadge = totalSpent > 5000000 ? '<span class="status-badge active" style="background: linear-gradient(45deg, #ffd700, #ffa500); color: #000; border: none;"><i class="fas fa-crown"></i> VIP</span>' :
                    totalSpent > 1000000 ? '<span class="status-badge info">Doimiy</span>' :
                        '<span class="status-badge">Yangi</span>';

                var phoneDisplay = '<div>' + escapeHtml(c.phone) + '</div>';
                if (c.telegram) {
                    var tgLink = c.telegram.startsWith('@') ? c.telegram.substring(1) : c.telegram;
                    phoneDisplay += '<a href="https://t.me/' + tgLink + '" target="_blank" style="color: #0088cc; font-size: 0.85rem;"><i class="fab fa-telegram"></i> ' + escapeHtml(c.telegram) + '</a>';
                }

                var debt = c.debt || 0;
                var debtClass = debt > 0 ? 'amount-negative' : '';

                return '' +
                    '<tr>' +
                    '<td data-label="#">' + (i + 1) + '</td>' +
                    '<td data-label="Mijoz ismi"><div style="font-weight:600">' + escapeHtml(c.name) + '</div>' + (c.birthday ? '<div style="font-size:0.75rem; color:var(--text-muted)"><i class="fas fa-birthday-cake"></i> ' + c.birthday + '</div>' : '') + '</td>' +
                    '<td data-label="Telefon / Telegram">' + phoneDisplay + '</td>' +
                    '<td data-label="Viloyat">' + escapeHtml(c.region || '-') + '</td>' +
                    '<td data-label="Sotuvlar soni">' + (c.salesCount || 0) + '</td>' +
                    '<td data-label="Umumiy savdo">' + formatMoney(totalSpent) + '</td>' +
                    '<td data-label="Qarz" class="' + debtClass + '">' + formatMoney(debt) + '</td>' +
                    '<td data-label="Status">' + vipBadge + '</td>' +
                    '<td data-label="Amallar">' +
                    '<button class="btn-icon info customer-history-btn" data-id="' + c.id + '" data-name="' + escapeHtml(c.name) + '" title="Xaridlar tarixi"><i class="fas fa-history"></i></button>' +
                    '<button class="btn-icon edit customer-edit-btn" data-id="' + c.id + '" title="Tahrirlash"><i class="fas fa-pen"></i></button>' +
                    '<button class="btn-icon delete customer-delete-btn" data-id="' + c.id + '" data-name="' + escapeHtml(c.name) + '" title="O\'chirish"><i class="fas fa-trash"></i></button>' +
                    '</td>' +
                    '</tr>';
            }).join('');
        }
    });
}

// Mijoz qo'shish tugmasi
document.getElementById('addCustomerBtn').addEventListener('click', function () {
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    document.getElementById('customerModalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Yangi Mijoz';
    setSelectValue('customerRegionPicker', '', 'Tanlang...');
    openModal('customerModal');
});

// Mijozni saqlash
document.getElementById('customerForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('customerId').value;
    var data = {
        name: document.getElementById('customerName').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        telegram: document.getElementById('customerTelegram').value.trim(),
        birthday: document.getElementById('customerBirthday').value,
        region: document.getElementById('customerRegion').value,
        address: document.getElementById('customerAddress').value.trim(),
        note: document.getElementById('customerNote').value.trim(),
        updatedAt: new Date().toISOString()
    };

    if (id) {
        db.collection('customers').doc(id).update(data)
            .then(function () { showToast('Mijoz ma\'lumotlari yangilandi'); closeModal('customerModal'); })
            .catch(function (err) { showToast('Xatolik: ' + err.message, 'error'); });
    } else {
        data.createdAt = new Date().toISOString();
        data.salesCount = 0;
        data.totalSpent = 0;
        data.debt = 0;
        db.collection('customers').add(data)
            .then(function () { showToast('Yangi mijoz qo\'shildi'); closeModal('customerModal'); })
            .catch(function (err) { showToast('Xatolik: ' + err.message, 'error'); });
    }
});

// Mijozni tahrirlash va o'chirish delegatsiyasi
document.addEventListener('click', function (e) {
    var btn = e.target.closest('.customer-edit-btn');
    if (btn) {
        var id = btn.dataset.id;
        db.collection('customers').doc(id).get().then(function (doc) {
            if (doc.exists) {
                var c = doc.data();
                document.getElementById('customerId').value = id;
                document.getElementById('customerName').value = c.name;
                document.getElementById('customerPhone').value = c.phone;
                document.getElementById('customerTelegram').value = c.telegram || '';
                document.getElementById('customerBirthday').value = c.birthday || '';
                document.getElementById('customerAddress').value = c.address || '';
                document.getElementById('customerNote').value = c.note || '';
                setSelectValue('customerRegionPicker', c.region, c.region);
                document.getElementById('customerModalTitle').innerHTML = '<i class="fas fa-pen"></i> Mijozni tahrirlash';
                openModal('customerModal');
            }
        });
        return;
    }

    btn = e.target.closest('.customer-history-btn');
    if (btn) {
        var id = btn.dataset.id;
        var name = btn.dataset.name;
        showCustomerHistory(id, name);
        return;
    }

    btn = e.target.closest('.customer-delete-btn');
    if (btn) {
        deleteItem('customers', btn.dataset.id, btn.dataset.name);
    }
});

function showCustomerHistory(customerId, customerName) {
    document.getElementById('historyCustomerName').textContent = customerName;
    var historyBody = document.getElementById('customerHistoryBody');
    historyBody.innerHTML = '<tr><td colspan="4" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...</td></tr>';

    // Mijoz ma'lumotlarini olish
    db.collection('customers').doc(customerId).get().then(function (doc) {
        if (doc.exists) {
            var c = doc.data();
            document.getElementById('historyTotalSales').textContent = c.salesCount || 0;
            document.getElementById('historyTotalSpent').textContent = formatMoney(c.totalSpent || 0);
            document.getElementById('historyTotalDebt').textContent = formatMoney(c.debt || 0);
        }
    });

    // Sotuvlar tarixini olish (Mijoz ismi bo'yicha)
    db.collection('sales').where('name', '==', customerName).orderBy('date', 'desc').get().then(function (snapshot) {
        if (snapshot.empty) {
            historyBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Xaridlar mavjud emas</td></tr>';
        } else {
            var html = '';
            snapshot.forEach(function (doc) {
                var s = doc.data();
                var itemsStr = s.items ? s.items.map(function (it) {
                    var p = productsArr.find(function (px) { return px.id === it.productId; });
                    return (p ? p.name : 'Mahsulot') + ' (x' + it.quantity + ')';
                }).join(', ') : '—';

                html += '<tr>' +
                    '<td>' + formatDate(s.date) + '</td>' +
                    '<td style="font-size:0.85rem">' + escapeHtml(itemsStr) + '</td>' +
                    '<td>' + formatMoney(s.totalAmount) + '</td>' +
                    '<td><span class="status-badge active">Sotilgan</span></td>' +
                    '</tr>';
            });
            historyBody.innerHTML = html;
        }
        openModal('customerHistoryModal');
    }).catch(function (err) {
        console.error("History error:", err);
        historyBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--danger)">Yuklashda xatolik yuz berdi</td></tr>';
    });
}

// Qidiruv
document.getElementById('customersSearch').addEventListener('input', function (e) {
    renderCustomers(e.target.value);
});

// Profile Tabs Handler
document.addEventListener('click', function (e) {
    var tabBtn = e.target.closest('.profile-tab-btn');
    if (tabBtn) {
        var tabId = tabBtn.dataset.tabId;

        // Update Buttons
        document.querySelectorAll('.profile-tab-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn === tabBtn);
        });

        // Update Content
        document.querySelectorAll('.tab-content').forEach(function (content) {
            content.classList.toggle('active', content.id === tabId);
        });
    }
});
