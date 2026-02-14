# Calcount Web App - Implementation TODO

## Core Features
- [x] Database schema for foods, meals, and user data
- [x] Backend API procedures for CRUD operations
- [x] Manual food entry with macro inputs
- [x] Image upload and LLM-based macro detection
- [x] Barcode scanning functionality
- [x] Daily dashboard with macro tracking
- [x] Food history with edit/delete capabilities
- [x] Meal time categorization (morning, noon, evening, late night)
- [x] Daily totals and progress visualization
- [x] Food search and nutritional database integration

## UI Components
- [x] Home/Dashboard page with daily summary
- [x] Food entry form (manual)
- [x] Image upload interface
- [x] Barcode scanner interface
- [x] Food history list
- [x] Meal breakdown by time category
- [x] Edit/delete food entry modals
- [x] Navigation and layout

## Testing & Deployment
- [x] Unit tests for backend procedures
- [x] Integration testing
- [ ] Performance optimization
- [x] Final deployment preparation

## New Features - BMI Calculator & Custom Goals
- [x] Add user_goals table to database schema
- [x] Create backend API procedures for user goals (get, update)
- [x] Build BMI calculator component with height/weight inputs
- [x] Create goals settings modal with sliders
- [x] Integrate custom goals into dashboard display
- [x] Update progress bars to use custom goals instead of hardcoded values
- [x] Add settings button to dashboard navigation
- [x] Test BMI calculations and goal updates


## Phase 2 Enhancements - User Requested Features
- [x] Make meal cards editable with edit modal
- [x] Add delete confirmation dialog for food entries
- [x] Create History tab to view previous days logs
- [x] Enhance BMI calculator with goal selection (maintain/lose/gain)
- [x] Add macro suggestions based on goal in BMI calculator
- [x] Add "Apply as Daily Goal" button in BMI calculator
- [x] Auto-calculate macros when adding food entries
- [x] Update AddFoodModal to show calculated macros
- [x] Implement real-time macro tracking with remaining amounts
- [x] Show meal-time breakdown of macros consumed
- [x] Display remaining macros for each category (cal, protein, carbs, fats)
- [x] Test all new features


## Phase 3 - Bug Fixes & Mobile Optimization
- [x] Fix mobile responsiveness for date navigation buttons (cramped/overlapping)
- [x] Implement working barcode scanner with actual camera access
- [x] Optimize button layout for mobile screens
- [x] Test barcode scanning on mobile devices


## Phase 4 - Barcode Scanner Camera Preview Enhancement
- [x] Improve camera preview display size and quality
- [x] Add better visual guide overlay for barcode positioning
- [x] Add real-time barcode detection feedback
- [x] Improve camera stream initialization and display
