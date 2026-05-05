# Bikore - Digital Ikimina Platform

Bikore is a modern digital platform that brings traditional Rwandan Ikimina savings groups to the digital age. It enables communities to create, manage, and participate in savings circles with transparency, security, and convenience.

## 🌟 Features

- **Digital Savings Groups**: Create and join Ikimina-style savings groups
- **Automated Contributions**: Schedule and track regular contributions
- **Secure Payments**: Mobile money integration with Rwanda's leading providers
- **Trust Score System**: Build and maintain trust within the community
- **Referral Program**: Earn rewards by inviting friends
- **Real-time Analytics**: Track savings progress and group performance
- **Multi-language Support**: English and Kinyarwanda
- **Biometric Security**: Face ID and fingerprint authentication

## 🏗️ Architecture

### Frontend (React Native)
- **Framework**: Expo Router with React Native
- **Styling**: StyleSheet with custom design system
- **State Management**: React Context API
- **Navigation**: Expo Router (file-based routing)
- **Fonts**: Fraunces (headings) & DM Sans (body)

### Backend (Node.js)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt password hashing
- **Rate Limiting**: Express-rate-limit
- **SMS Integration**: Africa Talking API
- **Validation**: Custom input sanitization and validation

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- PostgreSQL 12+
- Expo CLI (for mobile development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/bikore.git
   cd bikore
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install
   
   # Backend
   cd ../backend
   npm install
   ```

3. **Set up environment variables**
   
   **Backend (.env)**
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=bikore
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   
   # JWT
   JWT_SECRET=your_super_secret_jwt_key_here
   
   # Africa Talking
   AT_API_KEY=your_africatalking_api_key
   AT_USERNAME=your_africatalking_username
   AT_SENDER_ID=Bikore
   
   # Server
   PORT=3000
   NODE_ENV=development
   ```
   
   **Frontend (app.config.js or .env)**
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
   ```

4. **Set up database**
   ```bash
   # Create database
   createdb bikore
   
   # Run migrations (if available)
   cd backend
   npm run migrate
   ```

5. **Start the development servers**
   ```bash
   # Backend (Terminal 1)
   cd backend
   npm run dev
   
   # Frontend (Terminal 2)
   cd frontend
   npm start
   ```

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js
```

### Test Coverage

The test suite covers:
- ✅ Authentication (register, login, JWT validation)
- ✅ Groups (creation, validation, join logic)
- ✅ Payments (phone validation, initiation, confirmation)
- ✅ Input validation and rate limiting
- ✅ Security (SQL injection, XSS prevention)

### Demo Credentials

For testing purposes, use these demo credentials:

**Admin User**
- Phone: `+250788123456`
- Password: `Demo123!`

**Regular User**
- Phone: `+250723456789`
- Password: `User123!`

**Test Group**
- Group Code: `DEMO2024`
- Contribution Amount: Rwf 50,000
- Cycle: Monthly

**Additional Test Users**
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
