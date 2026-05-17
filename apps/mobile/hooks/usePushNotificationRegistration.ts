import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useLobbyAuth } from "../lib/LobbyAuthContext";
import { isFirebaseConfigured } from "../lib/firebase/isConfigured";
import { fetchPushNotificationsEnabled } from "../lib/firebase/notifications";
import { registerForPushNotificationsAsync } from "./pushRegistration";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotificationRegistration(reregisterTick = 0) {
  const { user } = useLobbyAuth();
  const busyRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !isFirebaseConfigured() || busyRef.current) {
      return;
    }

    busyRef.current = true;
    void (async () => {
      try {
        const enabled = await fetchPushNotificationsEnabled(user.uid);
        if (!enabled) {
          return;
        }
        const token = await registerForPushNotificationsAsync(user.uid);
        if (!token || lastTokenRef.current === token) {
          return;
        }
        lastTokenRef.current = token;
      } catch {
        /* silent */
      } finally {
        busyRef.current = false;
      }
    })();
  }, [user, reregisterTick]);
}
