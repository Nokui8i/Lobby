import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { saveExpoPushToken } from "../lib/firebase/notifications";

export async function registerForPushNotificationsAsync(uid: string): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "לובי",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#08b8c8",
    });
  }

  await saveExpoPushToken(uid, token.data);
  return token.data;
}
