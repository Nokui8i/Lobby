import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text, View } from 'react-native';
import type { MainTab } from '../navigation/types';
import { appStyles } from '../styles/appStyles';

const TAB_ICON_SIZE = 24;
const TAB_ICON_ACTIVE = '#009DE0';
const TAB_ICON_MUTED = '#64748B';

export function MainTabIonicons({ tab, active }: { tab: MainTab; active: boolean }) {
  const color = active ? TAB_ICON_ACTIVE : TAB_ICON_MUTED;
  switch (tab) {
    case 'messages':
      return (
        <Ionicons name={active ? 'chatbubbles' : 'chatbubbles-outline'} size={TAB_ICON_SIZE} color={color} />
      );
    case 'home':
      return <Ionicons name={active ? 'grid' : 'grid-outline'} size={TAB_ICON_SIZE} color={color} />;
    case 'search':
      return <Ionicons name={active ? 'search' : 'search-outline'} size={TAB_ICON_SIZE} color={color} />;
    case 'upload':
      return (
        <MaterialCommunityIcons
          name={active ? 'home-plus' : 'home-plus-outline'}
          size={TAB_ICON_SIZE}
          color={color}
        />
      );
    default:
      return null;
  }
}

export function FloatingMainTabBar({
  activeTab,
  messagesBadgeCount = 0,
  onTabPress,
}: {
  activeTab: MainTab;
  messagesBadgeCount?: number;
  onTabPress: (tab: MainTab) => void;
}) {
  const badgeLabel =
    messagesBadgeCount > 99 ? '99+' : messagesBadgeCount > 0 ? String(messagesBadgeCount) : '';

  return (
    <View style={appStyles.floatingTabBarWrap} pointerEvents="box-none">
      <View style={appStyles.floatingTabBar} accessibilityRole="tablist">
        <View style={appStyles.tabBarMessagesSlot}>
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel="הודעות"
            accessibilityState={{ selected: activeTab === 'messages' }}
            onPress={() => onTabPress('messages')}
            style={[appStyles.tabBarItem, activeTab === 'messages' && appStyles.tabBarItemActive]}
          >
            <MainTabIonicons tab="messages" active={activeTab === 'messages'} />
          </Pressable>
          {messagesBadgeCount > 0 ? (
            <View style={appStyles.tabBarBadge} pointerEvents="none" accessibilityElementsHidden>
              <Text style={appStyles.tabBarBadgeText}>{badgeLabel}</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="פיד דירות"
          accessibilityState={{ selected: activeTab === 'home' }}
          onPress={() => onTabPress('home')}
          style={[appStyles.tabBarItem, activeTab === 'home' && appStyles.tabBarItemActive]}
        >
          <MainTabIonicons tab="home" active={activeTab === 'home'} />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="חיפוש וסינון"
          accessibilityState={{ selected: activeTab === 'search' }}
          onPress={() => onTabPress('search')}
          style={[appStyles.tabBarItem, activeTab === 'search' && appStyles.tabBarItemActive]}
        >
          <MainTabIonicons tab="search" active={activeTab === 'search'} />
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="פרסום דירה"
          accessibilityState={{ selected: activeTab === 'upload' }}
          onPress={() => onTabPress('upload')}
          style={[
            appStyles.tabBarItem,
            appStyles.tabBarItemPublish,
            activeTab === 'upload' ? appStyles.tabBarItemActivePublish : null,
          ]}
        >
          <MainTabIonicons tab="upload" active={activeTab === 'upload'} />
        </Pressable>
      </View>
    </View>
  );
}
