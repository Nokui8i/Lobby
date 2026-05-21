import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { GoogleAuthMobileResult } from "../lib/LobbyAuthContext";
import { useLobbyAuth } from "../lib/LobbyAuthContext";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

type GoogleSignInButtonProps = {
  intent: "signin" | "signup";
  /** חובה כש־intent הוא signup — השם לפני OAuth */
  signupDisplayName: string;
  /** אופציונלי — אם מוזן, משמש כ־login_hint לבחירת חשבון Google */
  emailHint?: string;
  onError: (message: string) => void;
  /** כשמשתמש חדש בכניסה — צריך שלב שם במודל */
  onNeedsDisplayName: () => void;
  busy: boolean;
};

/**
 * דורש `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — מזהה לקוח OAuth מסוג Web מפרויקט Google Cloud של Firebase
 */
export function GoogleSignInButton(props: GoogleSignInButtonProps) {
  if (!GOOGLE_WEB_CLIENT_ID) {
    return null;
  }

  return <GoogleSignInButtonLoaded {...props} clientId={GOOGLE_WEB_CLIENT_ID} />;
}

function GoogleSignInButtonLoaded({
  onError,
  busy,
  clientId,
  intent,
  signupDisplayName,
  emailHint,
  onNeedsDisplayName,
}: GoogleSignInButtonProps & { clientId: string }) {
  const { signInWithGoogleIdToken } = useLobbyAuth();
  const handledResponse = useRef<string | null>(null);
  const [prompting, setPrompting] = useState(false);

  const hint = emailHint?.trim();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId,
    webClientId: clientId,
    selectAccount: true,
    ...(hint ? { loginHint: hint } : {}),
  });

  useEffect(() => {
    if (!response) {
      return;
    }

    if (response.type === "dismiss" || response.type === "cancel" || response.type === "opened" || response.type === "locked") {
      return;
    }

    if (response.type === "error") {
      const key = `error-${JSON.stringify(response.params)}`;
      if (handledResponse.current !== key) {
        handledResponse.current = key;
        onError("כניסה עם Google נכשלה.");
      }
      return;
    }

    if (response.type !== "success") {
      return;
    }

    const key = `success-${JSON.stringify(response.params)}`;
    if (handledResponse.current === key) {
      return;
    }

    const idToken = response.params.id_token;
    if (!idToken || typeof idToken !== "string") {
      handledResponse.current = key;
      onError("לא התקבל אסימון מגוגל.");
      return;
    }

    handledResponse.current = key;
    void (async () => {
      try {
        const r: GoogleAuthMobileResult = await signInWithGoogleIdToken(idToken, {
          intent,
          signupDisplayName: intent === "signup" ? signupDisplayName : undefined,
        });
        if (r === "already_registered") {
          onError("החשבון כבר קיים — עברו ל־״יש לי חשבון״.");
          return;
        }
        if (r === "needs_display_name") {
          onNeedsDisplayName();
        }
      } catch (err: unknown) {
        const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
        if (code === "lobby/display-name-required") {
          onError("נא למלא שם להצגה לפני Google.");
          return;
        }
        if (code === "lobby/google-use-email-first") {
          onError("המייל הזה כבר רשום עם סיסמה. התחברו עם אימייל וסיסמה.");
          return;
        }
        if (code === "lobby/google-require-email") {
          onError("נא להזין אימייל לפני Google.");
          return;
        }
        if (code === "lobby/google-blocked-password-only") {
          onError("האימייל רשום עם סיסמה — התחברו עם אימייל וסיסמה, לא עם Google.");
          return;
        }
        if (code === "lobby/google-email-mismatch") {
          onError("האימייל ב-Google לא תואם לשדה האימייל.");
          return;
        }
        onError("לא הצלחנו לחבר את חשבון Google ללובי.");
      }
    })();
  }, [response, onError, onNeedsDisplayName, signInWithGoogleIdToken, intent, signupDisplayName]);

  const showSpinner = busy || prompting;

  const label = intent === "signin" ? "התחברות עם Google" : "הרשמה עם Google";

  return (
    <Pressable
      style={[styles.googleBtn, (showSpinner || !request) && styles.googleBtnDisabled]}
      disabled={showSpinner || !request}
      onPress={() => {
        if (intent === "signup" && !signupDisplayName.trim()) {
          onError("לפני Google: נא למלא איך תרצו להופיע בלובי.");
          return;
        }
        setPrompting(true);
        void promptAsync().finally(() => {
          setPrompting(false);
        });
      }}
    >
      <View style={styles.googleInner}>
        {showSpinner ? <ActivityIndicator color="#202125" /> : <Text style={styles.googleText}>{label}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  googleBtn: {
    marginTop: 4,
    paddingVertical: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.14)",
    backgroundColor: "#fff",
  },
  googleBtnDisabled: {
    opacity: 0.5,
  },
  googleInner: {
    minHeight: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  googleText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#202125",
  },
});
