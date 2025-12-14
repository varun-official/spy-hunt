# Spy Hunt

**Spy Hunt** (formerly Suspect) is a local multiplayer party game of social deduction, deception, and detective work. Best played with 3+ players in the same room.

## 🕵️ Game Rules

1.  **The Setup**: All players join a lobby. One player is secretly assigned as the **Spy**. Everyone else is an **Agent**.
2.  **The Secret**: Agents receive a **Secret Word** (e.g., "Pizza"). The Spy sees nothing but their role.
3.  **The Clues**: Players take turns saying **one word** related to the Secret Word.
    *   *Agents* want to prove they know the word without giving it away entirely.
    *   *The Spy* must bluff and blend in, trying to guess the context from others' clues.
4.  **The Vote**: After the round, players vote on who they think the Spy is.
    *   If the **Spy** is voted out, **Agents Win**.
    *   If an **Agent** is voted out, **Spy Wins**.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v20.19+ or v22.12+ recommended)
*   A Firebase project (see below)

### Environment Setup

Create a `.env` file in the root directory and add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/spy-hunt.git
    cd spy-hunt
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open the game in your browser (usually `http://localhost:5173`). To play with friends on the same Wi-Fi, use the Network URL provided by Vite (e.g., `http://192.168.1.x:5173`).

## 🛠️ Tech Stack

*   **Frontend**: React (Vite)
*   **Styling**: Tailwind CSS, Framer Motion
*   **Icons**: Lucide React
*   **Backend**: Firebase (Authentication, Firestore Real-time Database)

## 📱 Mobile First
The UI is optimized for mobile devices, making it perfect for passing a phone around or playing on individual devices during a party.
