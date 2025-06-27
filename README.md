# Avatar AI

## Overview

This project is a React-based web application that integrates 3D models and animations using `@react-three/fiber` and `three.js`. The application features an interactive AI assistant named "Roger" that performs animations and lip-syncing based on audio input. It also includes a landing page with scrollable sections and animated cards.

### Key Features
- **Landing Page**: A visually appealing landing page with scrollable sections and animated cards.
- **Interactive Animations**: The avatar reacts to user interactions, such as scrolling or button 
clicks.
- **3D Avatar**: A 3D model of an avatar that performs animations such as walking, greeting, and lip-syncing.
- **Lip-Syncing**: The avatar's mouth movements are synchronized with audio playback using viseme-to-phoneme mapping.
---

## Getting Started

### Prerequisites
- Node.js (v20 or later)
- npm (comes with Node.js)

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd avatar-ai
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to:
   ```bash
   http://localhost:5173
   ```

---


## Running Via Docker

### Prerequisites
Docker installed on your system.

### Steps
1. Run via Dev Container:
   - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
   - Select “Dev Containers: Reopen in Container”.
2. Alternatively, run the following command to start the container manually:
      - `docker-compose up --build`
---



## Building for Production

To build the application for production:
```bash
npm run build
```

The production-ready files will be available in the `dist` directory.

### Previewing the Production Build
To preview the production build:
```bash
npm run preview
```

---

## Project Structure

```
src/
├── App.jsx                # Main application component
├── App.css                # Global styles
├── main.jsx               # Entry point for React
├── index.css              # Base styles
├── components/            # Reusable components
│   ├── avatar.jsx         # Avatar scene with lip-syncing
│   ├── avatarmodel.jsx    # Lip-syncing logic for the avatar
│   ├── character.jsx      # 3D character animations
├── pages/                 # Page components
│   ├── landingpage.jsx    # Landing page with scrollable sections
public/
├── avatars/               # 3D model files (FBX format)
├── basis/                 # Basis transcoder files for texture compression
```

---

## Key Components

### Landing Page
- **Location**: `src/pages/landingpage.jsx`
- **Features**:
  - Contains scrollable sections with animated cards.
  - Includes a 3D avatar that reacts to user interactions.

### 3D Avatar
- **Location**: `src/components/avatar.jsx` and `src/components/avatarmodel.jsx`
- **Features**:
  - Uses `@react-three/fiber` for rendering and `three.js` for animations.
  - Supports lip-syncing based on audio input.

### Animations
- The avatar performs animations like walking and greeting.
- Animations are triggered by user actions, such as scrolling or button clicks.

---

## Development Notes

- **3D Models**: The application uses FBX files for animations. These are located in the `public/avatars` directory.
- **Audio Sync**: Lip-syncing is achieved by mapping phonemes to visemes and adjusting morph target influences on the 3D model.
- **Styling**: The application uses CSS for global and component-specific styles.

---

## Troubleshooting

- If the application doesn't start, ensure all dependencies are installed by running:
  ```bash
  npm install
  ```
- If 3D models or textures fail to load, verify that the files in the `public/avatars` and `public/basis` directories are accessible.

---

## License
This project is licensed under the MIT License.
