# Calcount - Calorie Tracker Web App

A comprehensive web-based calorie and macro tracker with AI-powered food recognition, barcode scanning, and personalized nutrition goals.

## Features

### 🍽️ Food Tracking
- **Manual Food Entry** - Add foods with detailed macro information (calories, protein, carbs, fats)
- **Image Recognition** - Upload food photos and get automatic macro calculations using AI
- **Barcode Scanning** - Scan product barcodes with your device camera for instant nutritional data
- **Meal Time Categorization** - Organize entries by meal time (Morning, Noon, Evening, Late Night)
- **Edit & Delete** - Modify or remove food entries anytime

### 📊 Dashboard & Tracking
- **Real-Time Macro Tracking** - See remaining macros for each category throughout the day
- **Daily Goals** - Set personalized daily calorie and macro targets
- **Progress Visualization** - Visual progress bars showing consumption vs. goals
- **Meal-Time Breakdown** - View macro distribution across different meal times
- **History Tab** - Review previous days' logs and nutrition data

### 🧮 BMI Calculator & Goals
- **BMI Calculation** - Calculate BMI from height and weight
- **TDEE Estimation** - Get daily calorie needs using Mifflin-St Jeor formula
- **Goal-Based Recommendations** - Get macro suggestions based on fitness goals (maintain/lose/gain)
- **Customizable Sliders** - Adjust daily goals with easy-to-use sliders
- **Apply Goals** - Set BMI-calculated goals as your daily targets

### 📱 Mobile Optimized
- Fully responsive design for mobile, tablet, and desktop
- Touch-friendly interface for easy food logging on the go
- Camera access for barcode and image scanning

## Tech Stack

- **Frontend:** React 19 + Tailwind CSS 4
- **Backend:** Express.js + tRPC
- **Database:** MySQL with Drizzle ORM
- **Authentication:** Manus OAuth
- **AI Integration:** LLM-powered food recognition and macro calculation
- **Storage:** S3 for food images

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm package manager
- MySQL database

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
# Create a .env file with required variables (see .env.example)

# Generate database migrations
pnpm drizzle-kit generate

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
calcount-web/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components (Dashboard, etc.)
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # Utilities and helpers
│   │   └── App.tsx        # Main app component
│   └── public/            # Static assets
├── server/                # Express backend
│   ├── routers/           # tRPC procedure definitions
│   ├── db.ts              # Database query helpers
│   └── _core/             # Core server infrastructure
├── drizzle/               # Database schema and migrations
├── shared/                # Shared types and constants
└── storage/               # S3 storage helpers
```

## Key Components

### Dashboard (`client/src/pages/Dashboard.tsx`)
Main tracking interface showing daily macro totals, meal entries, and action buttons.

### BMI Calculator (`client/src/components/BMICalculator.tsx`)
Calculates BMI, BMR, TDEE, and suggests macros based on fitness goals.

### Barcode Scanner (`client/src/components/BarcodeModal.tsx`)
Real-time camera preview with barcode detection and manual entry fallback.

### Image Upload (`client/src/components/ImageUploadModal.tsx`)
Upload food images for AI-powered macro extraction.

### Food Entry (`client/src/components/AddFoodModal.tsx`)
Manual food entry with auto-calculated macros based on food name and serving size.

## Database Schema

### Users
- id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn

### Food Entries
- id, userId, foodName, calories, protein, carbs, fats, servingSize, mealTime, date, imageUrl, source

### Custom Foods
- id, userId, foodName, calories, protein, carbs, fats, servingSize

### User Goals
- id, userId, dailyCalories, dailyProtein, dailyCarbs, dailyFats, goal (maintain/lose/gain), height, weight, age, sex, activityLevel

## API Procedures (tRPC)

### Food Management
- `food.addFood` - Add a new food entry
- `food.editFood` - Update existing food entry
- `food.deleteFood` - Remove food entry
- `food.getFoodsByDate` - Get foods for a specific date
- `food.calculateMacros` - Calculate macros from food name and serving size
- `food.analyzeImage` - Extract macros from food image
- `food.analyzeBarcode` - Get product info from barcode

### Goals Management
- `food.getGoals` - Retrieve user's daily goals
- `food.updateGoals` - Update daily calorie and macro targets

### History
- `food.getFoodsByDateRange` - Get foods for a date range

## Testing

Run the test suite:

```bash
pnpm test
```

Tests include:
- Food entry CRUD operations
- Macro calculations
- Goal management
- Authentication flows

## Deployment

The app is built for deployment on Manus platform:

1. Create a checkpoint: `webdev_save_checkpoint`
2. Click "Publish" in the Management UI
3. App will be live at `https://[subdomain].manus.space`

For custom domains, configure in Settings → Domains.

## Future Enhancements

- Weekly nutrition analytics and trend charts
- Favorite foods quick-add system
- Meal plan templates and presets
- Social sharing and accountability features
- Offline mode with sync capability
- Push notifications for meal reminders
- Integration with fitness trackers

## Contributing

This is a personal project. Feel free to fork and customize for your own use.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ using Manus Platform**
