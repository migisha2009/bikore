# 🌱 BIKORE - Digital Ikimina Platform

A full-stack mobile application for digital Ikimina (group savings circles) in Rwanda, built with React Native + Expo and Node.js + PostgreSQL.

## 📱 Features

- **User Authentication**: Secure registration and login with JWT tokens
- **Group Management**: Create and join Ikimina groups with invite codes
- **Contribution Tracking**: Monitor contributions and payout cycles
- **Mobile Money Integration**: Mock MTN MoMo and Airtel Money payment flows
- **Real-time Updates**: Live status updates for contributions and group activities
- **Beautiful UI**: Organic-luxury design with Rwandan cultural elements

## 🛠 Tech Stack

### Frontend
- **React Native** with Expo (SDK 51+)
- **Expo Router** for file-based navigation
- **TypeScript** for type safety
- **Fraunces** + **DM Sans** fonts for premium typography
- **Expo Secure Store** for token storage

### Backend
- **Node.js** + Express.js
- **PostgreSQL** with `pg` driver
- **JWT** for authentication
- **bcrypt** for password hashing
- **CORS** for cross-origin requests

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- Expo CLI (`npm install -g @expo/cli`)
- Mobile device or emulator (Expo Go app)

### Database Setup

1. **Create Database**
   ```bash
   createdb bikore
   ```

2. **Run Schema**
   ```bash
   cd backend
   psql bikore < schema.sql
   ```

3. **Seed Demo Data** (optional)
   ```bash
   cd backend
   node seed.js
   ```

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start Server**
   ```bash
   npm run dev
   # Server runs on http://localhost:4000
   ```

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start Expo**
   ```bash
   npx expo start
   # Scan QR code with Expo Go app
   ```

## 📱 Demo Credentials

| Name | Phone | Password |
|------|-------|----------|
| Amina Uwimana | +250788100001 | password123 |
| Jean Niyonzima | +250788100002 | password123 |
| Grace Mukamana | +250788100003 | password123 |

## 🎨 Design System

### Colors
- **Cream**: `#F5F0E8` (primary background)
- **Forest Green**: `#2C4A2E` (primary actions)
- **Mustard**: `#C9922A` (highlights & money)
- **Beige**: `#EDE8DC` (cards & secondary elements)

### Typography
- **Fraunces Bold**: Headings & display text
- **DM Sans**: Body text and UI elements

## 📁 Project Structure

```
bikore/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express app entry
│   │   ├── db.js             # PostgreSQL pool
│   │   ├── middleware/       # Auth middleware
│   │   └── routes/           # API routes
│   ├── schema.sql            # Database schema
│   ├── seed.js              # Demo data seeder
│   └── package.json
└── frontend/
    ├── app/
    │   ├── (auth)/          # Authentication screens
    │   ├── (app)/           # Main app screens
    │   └── _layout.tsx      # Root layout
    ├── components/
    │   └── ui/              # Reusable UI components
    ├── context/             # React contexts
    ├── utils/               # Helper functions
    └── package.json
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Groups
- `GET /api/groups` - Get user's groups
- `GET /api/groups/:id` - Get group details
- `POST /api/groups` - Create new group
- `POST /api/groups/join` - Join group by invite code

### Contributions
- `GET /api/contributions/my-summary` - Get user's contribution summary
- `POST /api/contributions/pay` - Make a contribution
- `GET /api/contributions` - Get contributions list

## 🌱 Cultural Context

Bikore is designed specifically for the Rwandan market and the traditional Ikimina savings circle system:

- **Kinyarwanda labels** where contextually appropriate
- **Rwandan Francs (Rwf)** as the primary currency
- **Mobile Money** integration for MTN MoMo and Airtel Money
- **Community-focused** design reflecting Rwandan values of collective saving

## 🔒 Security Features

- JWT-based authentication with secure token storage
- Password hashing with bcrypt
- **Input validation and sanitization**
- CORS protection
- SQL injection prevention with parameterized queries

## 📱 Mobile Features

- **Responsive Design**: Optimized for various screen sizes
- **Offline Support**: Basic caching for poor connectivity
- **Push Notifications**: Contribution reminders (future enhancement)
- **Biometric Auth**: Fingerprint/Face ID (future enhancement)

## 🚀 Deployment

### Backend (Production)
```bash
# Set production environment
export NODE_ENV=production
export PORT=4000
export DATABASE_URL=postgresql://user:pass@host:5432/bikore

# Start with PM2
pm2 start src/index.js --name bikore-api
```

### Frontend (Production)
```bash
# Build for production
npx expo build:android
npx expo build:ios

# Or use EAS Build
eas build --platform all
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🇷🇼 Made for Rwanda

Built with ❤️ for the Rwandan community to digitize and modernize the traditional Ikimina savings system.

---

*Save Together, Grow Together* 🌱
