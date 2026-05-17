import { View } from 'react-native';
import { appStyles } from '../styles/appStyles';

export function FilterIcon() {
  return (
    <View style={appStyles.filterIcon}>
      <View style={appStyles.filterLine}>
        <View style={[appStyles.filterKnob, appStyles.filterKnobRight]} />
      </View>
      <View style={appStyles.filterLine}>
        <View style={[appStyles.filterKnob, appStyles.filterKnobLeft]} />
      </View>
      <View style={appStyles.filterLine}>
        <View style={[appStyles.filterKnob, appStyles.filterKnobCenter]} />
      </View>
    </View>
  );
}
