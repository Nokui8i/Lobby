import { Pressable, Text, View } from 'react-native';
import { appStyles } from '../styles/appStyles';
import { SavedListingsHeaderButton } from './SavedListingsHeaderButton';

/** כותרת בית — מקבילה ל־LobbyNavbar באתר (Lovable glass + לוגו L) */
export function LobbyHomeHeader({
  showServerHint,
  authLoading,
  user,
  showSaved,
  onSignOut,
  onSignIn,
  onAccount,
  onSaved,
}: {
  showServerHint: boolean;
  authLoading: boolean;
  user: { uid: string } | null;
  showSaved: boolean;
  onSignOut: () => void;
  onSignIn: () => void;
  onAccount: () => void;
  onSaved: () => void;
}) {
  return (
    <View style={appStyles.headerGlass}>
      <View style={appStyles.headerGlassRow}>
        <View style={appStyles.headerSideSlot}>
          {showServerHint ? (
            <Text style={appStyles.headerMuted}>ללא שרת</Text>
          ) : authLoading ? (
            <Text style={appStyles.headerMuted}>…</Text>
          ) : user ? (
            <Pressable accessibilityRole="button" accessibilityLabel="יציאה" onPress={onSignOut}>
              <Text style={appStyles.headerTextButton}>יציאה</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={appStyles.logoRow}>
          <View style={appStyles.brandLogoMark}>
            <Text style={appStyles.brandLogoMarkText}>L</Text>
          </View>
          <Text style={appStyles.brandLogoWord}>LOBBY</Text>
        </View>

        <View style={[appStyles.headerSideSlot, appStyles.headerSideSlotEnd]}>
          {showSaved ? <SavedListingsHeaderButton onPress={onSaved} /> : null}
          {!authLoading && user && !showServerHint ? (
            <Pressable accessibilityRole="button" accessibilityLabel="אזור אישי" onPress={onAccount}>
              <Text style={appStyles.headerTextButton}>אזור אישי</Text>
            </Pressable>
          ) : !authLoading && !user && !showServerHint ? (
            <Pressable accessibilityRole="button" accessibilityLabel="כניסה" onPress={onSignIn}>
              <Text style={appStyles.headerTextButton}>כניסה</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
