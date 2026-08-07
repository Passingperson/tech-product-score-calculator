const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');

// 模拟服务器（为了避免端口占用，直接导入 app）
const app = express();
app.use(express.static(path.join(__dirname, '../public')));
app.get('/api/products', (req, res) => {
  const dataPath = path.join(__dirname, '../data/products.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: '无法读取产品数据' });
      return;
    }
    res.json(JSON.parse(data));
  });
});

describe('GET /api/products', () => {
  it('应该返回产品列表且每个产品包含必需字段', async () => {
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const first = res.body[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('name');
    expect(first).toHaveProperty('category');
    expect(first).toHaveProperty('techScore');
    expect(first).toHaveProperty('costScore');
    expect(first).toHaveProperty('portabilityScore');
    expect(first).toHaveProperty('priceScore');
  });
});