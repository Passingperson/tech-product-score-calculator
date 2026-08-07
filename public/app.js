const grid = document.getElementById('productGrid');
const sortSelect = document.getElementById('sortSelect');

let products = [];

// 从 API 获取数据
async function fetchProducts() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error('网络响应错误');
    products = await res.json();
    renderProducts();
  } catch (err) {
    grid.innerHTML = `<p style="color: #b91c1c;">⚠️ 加载数据失败，请检查网络或稍后重试。</p>`;
    console.error(err);
  }
}

// 计算每个产品的总分（等权平均）
function computeTotal(p) {
  return (p.techScore + p.costScore + p.portabilityScore + p.priceScore) / 4;
}

// 渲染卡片
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
    const detailsId = `details-${p.id}`;
    return `
      <div class="card" data-id="${p.id}">
        <div class="card-header">
          <span class="card-name">${p.name}</span>
          <span class="card-total">${total.toFixed(1)}</span>
        </div>
        <div class="card-category">${p.category}</div>
        <div class="details" id="${detailsId}">
          <div class="detail-item"><span class="label">技术复杂度</span><span class="value">${p.techScore}</span></div>
          <div class="detail-item"><span class="label">生产成本</span><span class="value">${p.costScore}</span></div>
          <div class="detail-item"><span class="label">便携性</span><span class="value">${p.portabilityScore}</span></div>
          <div class="detail-item"><span class="label">市场均价</span><span class="value">${p.priceScore}</span></div>
        </div>
      </div>
    `;
  }).join('');

  // 点击卡片切换详情显示
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', function(e) {
      // 防止点击内部链接或按钮冒泡（这里没有）
      const details = this.querySelector('.details');
      details.classList.toggle('show');
    });
  });
}

// 监听排序变化
sortSelect.addEventListener('change', renderProducts);

// 启动
fetchProducts();