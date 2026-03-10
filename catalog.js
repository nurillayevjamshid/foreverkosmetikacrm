const searchInput = document.getElementById('searchInput');
const categorySelect = document.getElementById('categorySelect');
const grid = document.getElementById('productsGrid');
const emptyState = document.getElementById('emptyState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const resultsCount = document.getElementById('resultsCount');
const lastUpdated = document.getElementById('lastUpdated');

const db = firebase.firestore();

const state = {
  products: []
};

function formatMoney(amount) {
  return new Intl.NumberFormat('uz-UZ').format(amount || 0) + " so'm";
}

function normalize(value) {
  return (value || '').toString().toLowerCase();
}

function updateCategories(products) {
  const unique = new Set();
  products.forEach((p) => {
    unique.add(p.category || 'Boshqa');
  });
  const categories = Array.from(unique).sort((a, b) => a.localeCompare(b, 'uz'));

  const current = categorySelect.value;
  categorySelect.innerHTML = '<option value="all">Barcha</option>';
  categories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });

  if (categories.includes(current)) {
    categorySelect.value = current;
  } else {
    categorySelect.value = 'all';
  }
}

function renderProducts() {
  const query = normalize(searchInput.value);
  const selectedCategory = categorySelect.value || 'all';

  let list = state.products.filter((p) => (p.status || 'active') !== 'inactive');

  if (selectedCategory !== 'all') {
    list = list.filter((p) => (p.category || 'Boshqa') === selectedCategory);
  }

  if (query) {
    list = list.filter((p) => {
      const name = normalize(p.name);
      const desc = normalize(p.description);
      return name.includes(query) || desc.includes(query);
    });
  }

  list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uz'));

  resultsCount.textContent = `${list.length} ta mahsulot`;
  lastUpdated.textContent = 'Oxirgi yangilanish: ' + new Date().toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit'
  });

  grid.innerHTML = '';
  errorState.classList.remove('show');

  if (list.length === 0) {
    emptyState.classList.add('show');
    return;
  }

  emptyState.classList.remove('show');

  list.forEach((p, idx) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.style.animationDelay = `${Math.min(idx, 12) * 70}ms`;

    const media = document.createElement('div');
    media.className = 'product-media';

    if (p.imageUrl) {
      const img = document.createElement('img');
      img.src = p.imageUrl;
      img.alt = p.name || 'Mahsulot';
      media.appendChild(img);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'product-fallback';
      fallback.textContent = (p.name || 'M').trim().charAt(0).toUpperCase();
      media.appendChild(fallback);
    }

    const body = document.createElement('div');
    body.className = 'product-body';

    const top = document.createElement('div');
    top.className = 'product-top';

    const name = document.createElement('h3');
    name.textContent = p.name || "Noma'lum mahsulot";

    const price = document.createElement('div');
    price.className = 'product-price';
    price.textContent = formatMoney(p.price);

    top.appendChild(name);
    top.appendChild(price);

    const meta = document.createElement('div');
    meta.className = 'product-meta';

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = p.category || 'Boshqa';

    meta.appendChild(badge);

    const desc = document.createElement('p');
    desc.className = 'product-desc';
    desc.textContent = p.description || 'Qisqacha tavsif mavjud emas.';

    body.appendChild(top);
    body.appendChild(meta);
    body.appendChild(desc);

    card.appendChild(media);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

function showError(message) {
  errorMessage.textContent = message || "Noma'lum xatolik";
  errorState.classList.add('show');
  emptyState.classList.remove('show');
  grid.innerHTML = '';
}

function startRealtime() {
  if (window.__productsUnsub) {
    window.__productsUnsub();
  }

  window.__productsUnsub = db.collection('products').onSnapshot(
    (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      state.products = list;
      updateCategories(list);
      renderProducts();
    },
    (err) => {
      console.error(err);
      if (err && err.code === 'permission-denied') {
        showError("Ruxsat yo'q. Firestore rules yoki anonim kirish sozlamalarini tekshiring.");
      } else {
        showError("Mahsulotlarni yuklab bo'lmadi. Keyinroq qayta urinib ko'ring.");
      }
    }
  );
}

function init() {
  searchInput.addEventListener('input', renderProducts);
  categorySelect.addEventListener('change', renderProducts);

  if (firebase.auth && typeof firebase.auth === 'function') {
    firebase.auth().signInAnonymously().then(startRealtime).catch((err) => {
      console.warn('Anonymous auth failed:', err);
      startRealtime();
    });
  } else {
    startRealtime();
  }
}

init();
