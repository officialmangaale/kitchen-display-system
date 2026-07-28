import AppShell from './components/AppShell';
import LobbyDisplay from './display/LobbyDisplay';

export default function App() {
  if (window.location.pathname === '/display' || window.location.pathname.startsWith('/display/')) {
    return <LobbyDisplay />;
  }
  return <AppShell />;
}
