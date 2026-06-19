const express = require('express');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

const DATA_FILE = path.join(__dirname, 'data.json');

// 原生 CORS 設定
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    next();
});

// 解析 JSON body
app.use(express.json());

// 靜態檔案設定
app.use(express.static('public'));

// 讀取 data.json
function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, "[]", "utf8");
    }

    const rawData = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(rawData || "[]");
}

// 寫入 data.json
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// 1. 查詢物價紀錄
app.get('/api/prices', (req, res) => {
    const search = req.query.search || '';
    let data = readData();

    if (search) {
        data = data.filter(item =>
            item.name && item.name.includes(search)
        );
    }

    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json(data);
});

// 2. 新增物價紀錄
app.post('/api/prices', (req, res) => {
    const { name, price, date, remarks } = req.body;

    if (!name || !price || !date) {
        return res.status(400).json({ error: '欄位不完整' });
    }

    const data = readData();

    const newItem = {
        id: Date.now(),
        name,
        price: Number(price),
        date,
        remarks: remarks || ''
    };

    data.push(newItem);
    writeData(data);

    res.status(201).json({
        id: newItem.id,
        message: '新增成功'
    });
});

// 3. 修改物價紀錄
app.put('/api/prices/:id', (req, res) => {
    const id = Number(req.params.id);
    const { name, price, date, remarks } = req.body;

    const data = readData();
    const index = data.findIndex(item => Number(item.id) === id);

    if (index === -1) {
        return res.status(404).json({ error: '找不到該筆紀錄' });
    }

    data[index] = {
        ...data[index],
        name,
        price: Number(price),
        date,
        remarks: remarks || ''
    };

    writeData(data);

    res.json({ message: '修改成功' });
});

// 4. 刪除物價紀錄
app.delete('/api/prices/:id', (req, res) => {
    const id = Number(req.params.id);

    const data = readData();
    const newData = data.filter(item => Number(item.id) !== id);

    if (newData.length === data.length) {
        return res.status(404).json({ error: '找不到該筆紀錄' });
    }

    writeData(newData);

    res.json({ message: '刪除成功' });
});

// 5. 爬蟲範例路由
app.get('/api/scrape', async (req, res) => {
    try {
        res.json({
            message: "爬蟲功能示範：此路由保留 cheerio 解析架構，可後續替換目標網站"
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. 虛擬爬蟲測試資料
app.post('/api/crawl', (req, res) => {
    const date = new Date().toISOString().split('T')[0];
    const name = '衛生紙';
    const price = 129;
    const remarks = '爬蟲測試資料';

    const data = readData();

    const newItem = {
        id: Date.now(),
        name,
        price,
        date,
        remarks
    };

    data.push(newItem);
    writeData(data);

    res.json({
        message: '爬蟲測試成功，已新增一筆測試資料',
        data: newItem
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on ${PORT}`);
});