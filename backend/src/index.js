const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/auth',          require('./routes/password'));
app.use('/api/groups',        require('./routes/groups'));
app.use('/api/groups',        require('./routes/joining'));
app.use('/api/payouts',        require('./routes/payouts'));
app.use('/api/admin',          require('./routes/admin'));
const { router: chatRouter } = require('./routes/chat');
app.use('/api/groups', chatRouter);
app.use('/api/cycles',        require('./routes/cycles'));
app.use('/api/goals',         require('./routes/goals'));
app.use('/api/analytics',      require('./routes/analytics'));
app.use('/api/referrals',      require('./routes/referrals'));
app.use('/api/contributions', require('./routes/contributions'));
app.use('/api/users',         require('./routes/users'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'Bikore API' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🌱 Bikore API → http://localhost:${PORT}`));
