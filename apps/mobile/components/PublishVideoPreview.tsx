import { useVideoPlayer, VideoView } from "expo-video";
import { StyleSheet, View } from "react-native";

export function PublishVideoPreview({ sourceUri }: { sourceUri: string }) {
  const player = useVideoPlayer(sourceUri, (p) => {
    p.loop = false;
  });

  return (
    <View style={styles.frame}>
      <VideoView style={styles.video} player={player} nativeControls contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#202125",
    borderWidth: 1,
    borderColor: "rgba(16,24,32,0.1)",
    marginBottom: 8,
  },
  video: {
    width: "100%",
    height: 220,
  },
});
