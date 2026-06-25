import express from 'express';

const app = express();
const PORT = 3000;

app.get('/api', (req, res) => {
    res.json({ message: "Hello World!" });
});

    app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});