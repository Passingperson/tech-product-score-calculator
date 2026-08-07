const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 提供静态文件
app.use(express.static(path.join(__dirname, 'public')));

// API：获取产品数据
app.get('/api/products', (req, res) => {
  const dataPath = path.join(__dirname, 'data', 'products.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).json({ error: '无法读取产品数据' });
      return;
    }
    res.json(JSON.parse(data));
  });
});

// 所有其他请求返回首页（支持前端路由）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});