import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Results from './pages/Results';
import SoundToggle from './components/SoundToggle';

function App() {
  return (
    <Router>
      <SoundToggle />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:roomId" element={<Lobby />} />
        <Route path="/game/:roomId" element={<Game />} />
        <Route path="/results/:roomId" element={<Results />} />
      </Routes>
    </Router>
  );
}

export default App;
