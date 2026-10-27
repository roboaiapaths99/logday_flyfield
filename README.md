# LogDay FlyField Mobile App 🚀

**LogDay FlyField** is an enterprise-grade mobile application designed for field sales, client relationship managers, and mobile workforce operations. It provides real-time location-assisted shift check-in, on-the-fly client visit tracking, photo & audio documentation, automated travel expense tracking, and full HRMS service management.

---

## 📱 Features

- **Field Attendance & Shift Management**:
  - Secure selfie check-in with GPS location confirmation.
  - One-time face registration with re-enrollment support from profile.
  - Automated shift summary with total distance and completed client visits.

- **Dynamic Client Visits**:
  - Start visits on-the-go with auto-detected client site coordinates and reverse-geocoded address.
  - Categorize client visits (Retailer, Distributor, Corporate Client, Site Visit, Lead Prospect).
  - Capture client photos and record voice notes for meeting summaries.
  - Instant checkout with total meeting duration tracking.

- **Automated Expense Management**:
  - Auto-calculated travel distance (KM) from verified client stop coordinates.
  - Claim fuel, meal, lodging, or transport expenses with receipt/bill snapshots.
  - Real-time claim status tracking (Pending, Approved, Rejected).

- **Daily Field Timeline**:
  - Visual activity sequence with map pin checkpoints, photo lightbox viewer, and audio note playback.

- **HRMS Self-Service**:
  - Onboarding task completion and identity document uploads.
  - Exit clearance workflow tracking across HR, Finance, and IT departments.
  - CTC breakdown and monthly payslip downloads.

---

## 🛠️ Tech Stack

- **Framework**: React Native with Expo SDK 57
- **Language**: JavaScript (ES6+)
- **Navigation**: React Navigation (Stack)
- **Networking**: Axios with secure token interceptors
- **Location**: `expo-location` (High-accuracy GPS & reverse-geocoding)
- **Camera & Media**: `expo-camera`, `expo-image-manipulator`, `expo-audio`
- **Secure Storage**: `expo-secure-store` & `@react-native-async-storage/async-storage`

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo Go app on your physical device (Android or iOS)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/roboaiapaths99/logday_flyfield.git
   cd logday_flyfield
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Configuration:
   The application uses `.env` for the production backend URL:
   ```ini
   EXPO_PUBLIC_API_URL=https://logday-api.duckdns.org
   ```

4. Start the development server:
   ```bash
   npx expo start
   ```

5. Scan the QR code with **Expo Go** (Android) or the Camera app (iOS) to launch the app on your mobile device.

---

## 📦 Production Builds (Google Play Store)

To build a standalone production Android App Bundle (`.aab`) for Google Play Store:

```bash
# Using Expo Application Services (EAS)
npm install -g eas-cli
eas login
eas build -p android --profile production
```

Package Details:
- **Package Name**: `com.logday.flyfield`
- **Version**: `1.0.0`
- **Version Code**: `1`
