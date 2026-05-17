import { registerRootComponent } from 'expo';
import * as WebBrowser from 'expo-web-browser';

import { LobbyAuthModal } from './components/LobbyAuthModal';

WebBrowser.maybeCompleteAuthSession();
import App from './App';
import { LobbyAuthProvider } from './lib/LobbyAuthContext';
import { SavedListingsProvider } from './lib/SavedListingsContext';

function Root() {
  return (
    <LobbyAuthProvider>
      <SavedListingsProvider>
        <App />
        <LobbyAuthModal />
      </SavedListingsProvider>
    </LobbyAuthProvider>
  );
}

registerRootComponent(Root);
