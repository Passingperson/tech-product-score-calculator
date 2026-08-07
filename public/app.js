const grid = document.getElementById('productGrid');
const frontLabels = document.getElementById('frontLabels');
const backpackList = document.getElementById('backpackList');
const totalScoreValue = document.getElementById('totalScoreValue');

let products = [];
let quantities = {};

// ----- 部位坐标映射 -----
const positionMap = {
  head:   { left: '50%', top: '12%' },
  wrist:  { left: '75%', top: '38%' },
  hand:   { left: '80%', top: '48%' },
  pocket: { left: '68%', top: '58%' },
};

// ----- 排序函数：先按品类顺序，再按总分降序 -----
const categoryOrder = {
  '随身佩戴': 1,
  '手持设备': 2,
  '携带背包': 3
};

function sortProducts(list) {
  return [...list].sort((a, b) => {
    const orderA = categoryOrder[a.category] || 99;
    const orderB = categoryOrder[b.category] || 99;
    if (orderA !== orderB) return orderA - orderB;
    const scoreA = computeTotal(a);
    const scoreB = computeTotal(b);
    return scoreB - scoreA;
  });
}

// ----- 获取数据 -----
async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('网络响应错误');
    products = await res.json();
    products.forEach(p => { quantities[p.id] = 0; });
    refresh();
  } catch (err) {
    grid.innerHTML = `<p style="color: #b91c1c;">⚠️ 加载数据失败，请检查网络或稍后重试。</p>`;
    console.error(err);
  }
}

// ----- 计算单个产品总分 -----
function computeTotal(p) {
  return (p.techScore + p.costScore + p.portabilityScore + p.priceScore) / 4;
}

// ----- 计算所有选中产品的总分合计 -----
function computeTotalScoreSum() {
  let sum = 0;
  products.forEach(p => {
    const qty = quantities[p.id] || 0;
    if (qty > 0) {
      sum += computeTotal(p) * qty;
    }
  });
  return sum;
}

// ----- 渲染卡片（按品类分组，每行一个品类） -----
function renderProducts() {
  const sorted = sortProducts(products);

  // 按品类分组
  const groups = {};
  sorted.forEach(p => {
    if (!groups[p.category]) groups[p.category] = [];
    groups[p.category].push(p);
  });

  // 按定义顺序排列品类
  const categoryKeys = Object.keys(groups).sort((a, b) => {
    return (categoryOrder[a] || 99) - (categoryOrder[b] || 99);
  });

  let html = '';
  categoryKeys.forEach(cat => {
    const items = groups[cat];
    html += `<div class="category-row">`;
    html += `<div class="category-row-header">${cat}</div>`;
    html += `<div class="category-row-cards">`;
    items.forEach(p => {
      const total = computeTotal(p);
      const qty = quantities[p.id] || 0;
      const isActive = qty > 0 ? 'active' : '';
      html += `
        <div class="card ${isActive}" data-id="${p.id}">
          <div class="card-header">
            <span class="card-name">${p.name}</span>
            <span class="card-total">${total.toFixed(1)}</span>
          </div>
          <div class="card-category">${p.category}</div>
          <div class="quantity-control">
            <button class="qty-btn" data-action="decrement" data-id="${p.id}">−</button>
            <span class="qty-number" data-id="${p.id}">${qty}</span>
            <button class="qty-btn" data-action="increment" data-id="${p.id}">+</button>
          </div>
          <div class="details">
            <div class="detail-item"><span class="label">技术复杂度</span><span class="value">${p.techScore}</span></div>
            <div class="detail-item"><span class="label">生产成本</span><span class="value">${p.costScore}</span></div>
            <div class="detail-item"><span class="label">便携性</span><span class="value">${p.portabilityScore}</span></div>
            <div class="detail-item"><span class="label">市场均价</span><span class="value">${p.priceScore}</span></div>
          </div>
        </div>
      `;
    });
    html += `</div></div>`;
  });

  grid.innerHTML = html;

  // 绑定卡片点击
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.closest('.qty-btn')) return;
      const id = parseInt(this.dataset.id);
      const current = quantities[id] || 0;
      quantities[id] = current > 0 ? 0 : 1;
      refresh();
    });
  });

  // 绑定加减按钮
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = parseInt(this.dataset.id);
      const action = this.dataset.action;
      const current = quantities[id] || 0;
      if (action === 'increment') {
        quantities[id] = current + 1;
      } else if (action === 'decrement') {
        quantities[id] = Math.max(0, current - 1);
      }
      refresh();
    });
  });
}

// ----- 更新人体视图 -----
function updateBodyView() {
  frontLabels.innerHTML = '';

  const selected = products.filter(p => (quantities[p.id] || 0) > 0);
  const groups = { head: [], wrist: [], hand: [], pocket: [], backpack: [] };
  selected.forEach(p => {
    const part = p.bodyPart || 'backpack';
    if (groups[part]) groups[part].push(p);
    else groups.backpack.push(p);
  });

  const frontParts = ['head', 'wrist', 'hand', 'pocket'];
  frontParts.forEach(part => {
    const items = groups[part] || [];
    if (items.length === 0) return;
    const totalQty = items.reduce((sum, p) => sum + (quantities[p.id] || 0), 0);
    const first = items[0];
    const pos = positionMap[part];
    if (!pos) return;

    const label = document.createElement('div');
    label.className = 'product-label';
    label.style.left = pos.left;
    label.style.top = pos.top;
    let text = first.name;
    if (items.length > 1) {
      text += ` 等${items.length}种`;
    }
    text += ` ×${totalQty}`;
    label.textContent = text;
    frontLabels.appendChild(label);
  });

  const backpackItems = groups.backpack || [];
  if (backpackItems.length === 0) {
    backpackList.innerHTML = `<span class="empty-hint">未选中大型产品</span>`;
  } else {
    backpackList.innerHTML = backpackItems.map(p => {
      const qty = quantities[p.id] || 0;
      return `<span class="backpack-item">${p.name} ×${qty}</span>`;
    }).join('');
  }

  const totalSum = computeTotalScoreSum();
  totalScoreValue.textContent = totalSum.toFixed(1);
}

// ----- 刷新 -----
function refresh() {
  renderProducts();
  updateBodyView();
}

// ----- 启动 -----
fetchProducts();