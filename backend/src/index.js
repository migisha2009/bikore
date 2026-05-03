const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/groups',        require('./routes/groups'));
app.use('/api/contributions', require('./routes/contributions'));
app.use('/api/users',         require('./routes/users'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'Bikore API' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🌱 Bikore API → http://localhost:${PORT}`));
