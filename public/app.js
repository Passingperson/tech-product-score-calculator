const grid = document.getElementById('productGrid');
const sortSelect = document.getElementById('sortSelect');
const frontLabels = document.getElementById('frontLabels');
const backpackList = document.getElementById('backpackList');

let products = [];
// 存储每个产品的数量 { id: count }
let quantities = {};

// ----- 部位坐标映射 -----
const positionMap = {
  head:   { left: '50%', top: '12%' },
  wrist:  { left: '75%', top: '38%' },
  hand:   { left: '80%', top: '48%' },
  pocket: { left: '68%', top: '58%' },
};

// ----- 获取数据 -----
async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('网络响应错误');
    products = await res.json();
    // 初始化数量为0
    products.forEach(p => { quantities[p.id] = 0; });
    renderProducts();
    updateBodyView();
  } catch (err) {
    grid.innerHTML = `<p style="color: #b91c1c;">⚠️ 加载数据失败，请检查网络或稍后重试。</p>`;
    console.error(err);
  }
}

// ----- 计算总分 -----
function computeTotal(p) {
  return (p.techScore + p.costScore + p.portabilityScore + p.priceScore) / 4;
}

// ----- 渲染卡片 -----
function renderProducts() {
  const sortBy = sortSelect.value;
  const sorted = [...products];

  if (sortBy === 'category') {
    sorted.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  } else if (sortBy === 'score') {
    sorted.sort((a, b) => computeTotal(b) - computeTotal(a) || a.name.localeCompare(b.name));
  }

  grid.innerHTML = sorted.map(p => {
    const total = computeTotal(p);
    const qty = quantities[p.id] || 0;
    const isActive = qty > 0 ? 'active' : '';
    return `
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
  }).join('');

  // 绑定卡片点击（切换选中）
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', function(e) {
      // 如果点击的是按钮，不触发卡片切换（由按钮事件单独处理）
      if (e.target.closest('.qty-btn')) return;
      const id = parseInt(this.dataset.id);
      const current = quantities[id] || 0;
      if (current > 0) {
        quantities[id] = 0;
      } else {
        quantities[id] = 1;
      }
      refresh();
    });
  });

  // 绑定加减按钮事件
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation(); // 防止触发卡片点击
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

// ----- 刷新视图（重新渲染卡片 + 更新人体） -----
function refresh() {
  renderProducts();  // 重新生成卡片（更新数量和激活样式）
  updateBodyView();  // 更新人体标签和背包
}

// ----- 更新人体视图 -----
function updateBodyView() {
  frontLabels.innerHTML = '';

  // 收集所有数量>0的产品
  const selected = products.filter(p => (quantities[p.id] || 0) > 0);

  // 按部位分组
  const groups = { head: [], wrist: [], hand: [], pocket: [], backpack: [] };
  selected.forEach(p => {
    const part = p.bodyPart || 'backpack';
    if (groups[part]) groups[part].push(p);
    else groups.backpack.push(p);
  });

  // 正面部位（每个部位只取第一个产品，并显示总数量）
  const frontParts = ['head', 'wrist', 'hand', 'pocket'];
  frontParts.forEach(part => {
    const items = groups[part] || [];
    if (items.length === 0) return;
    // 合并同部位所有产品的总数量
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

  // 背包
  const backpackItems = groups.backpack || [];
  if (backpackItems.length === 0) {
    backpackList.innerHTML = `<span class="empty-hint">未选中大型产品</span>`;
  } else {
    backpackList.innerHTML = backpackItems.map(p => {
      const qty = quantities[p.id] || 0;
      return `<span class="backpack-item">${p.name} ×${qty}</span>`;
    }).join('');
  }
}

// ----- 排序变化 -----
sortSelect.addEventListener('change', () => {
  renderProducts(); // 仅重新排序，数量不变
  // 注意：排序后需重新绑定事件，但 refresh 会调用 renderProducts 并绑定，但这里不更新人体
  // 但我们希望排序时人体不变，只需重新渲染卡片顺序即可，所以直接用 renderProducts
  // 但 renderProducts 会重新绑定事件，没问题。
  // 但此时人体可能已更新，我们不需要重复 updateBodyView，因为数量未变。
  // 为了保持事件绑定，我们调用 renderProducts 但不 updateBodyView
  // 然而 renderProducts 内部会调用 refresh？不，我们单独写 renderProducts 不调用 refresh
  // 因此，我们修改：排序时仅重新渲染卡片，但保留现有数量，并重新绑定事件。
  // 我们可拆分为两个函数：renderCard 只负责生成 DOM，refresh 负责整体刷新。
  // 为简化，我们直接调用 refresh，它会重新渲染卡片并更新人体，虽然人体没变化但也没坏处。
  refresh();
});

// ----- 启动 -----
fetchProducts();