const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 8080;

// 原生 CORS 設定
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

const db = new sqlite3.Database(process.env.DB_PATH || './inflation.db');

// 解析 JSON body
app.use(express.json());

// 靜態檔案設定
app.use(express.static('public'));

// 1. 查詢物價紀錄
app.get('/api/prices', (req, res) => {
    const search = req.query.search || '';
    const query = search 
        ? "SELECT * FROM prices WHERE name LIKE ? ORDER BY date DESC"
        : "SELECT * FROM prices ORDER BY date DESC";
    const params = search ? [`%${search}%`] : [];

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. 新增物價紀錄
app.post('/api/prices', (req, res) => {
    const { name, price, date, remarks } = req.body;
    if (!name || !price || !date) return res.status(400).json({ error: '欄位不完整' });

    db.run("INSERT INTO prices (name, price, date, remarks) VALUES (?, ?, ?, ?)",
        [name, price, date, remarks], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID, message: '新增成功' });
        });
});

// 3. 修改物價紀錄
app.put('/api/prices/:id', (req, res) => {
    const { id } = req.params;
    const { name, price, date, remarks } = req.body;
    db.run("UPDATE prices SET name = ?, price = ?, date = ?, remarks = ? WHERE id = ?",
        [name, price, date, remarks, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: '找不到該筆紀錄' });
            res.json({ message: '修改成功' });
        });
});

// 4. 刪除物價紀錄
app.delete('/api/prices/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM prices WHERE id = ?", id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: '找不到該筆紀錄' });
        res.json({ message: '刪除成功' });
    });
});

// 爬蟲範例路由
app.get('/api/scrape', async (req, res) => {
    try {
        const response = await fetch('你的目標網址');
        const data = await response.text();
        const $ = cheerio.load(data);
        // 在這裡加入你的解析邏輯...
        res.json({ message: "爬取成功" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/crawl', (req, res) => {
    const date = new Date().toISOString().split('T')[0];
    const name = '衛生紙';
    const price = 129;
    const remarks = '爬蟲測試資料';
    db.run(
        "INSERT INTO prices (name, price, date, remarks) VALUES (?, ?, ?, ?)",
        [name, price, date, remarks],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                message: '爬蟲測試成功，已新增一筆測試資料',
                data: {
                    id: this.lastID,
                    name,
                    price,
                    date,
                    remarks
                }
            });
        }
    );
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on ${PORT}`));