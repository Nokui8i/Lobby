import { Text, View } from 'react-native';
import { footerLinks } from '../constants/homeFeed';
import { appStyles } from '../styles/appStyles';

export function AppFooter() {
  return (
    <View style={appStyles.legalFooter}>
      <Text style={appStyles.footerBrandText}>LOBBY</Text>
      <Text style={appStyles.footerBrandDescription}>
        לובי היא פלטפורמת פרסום ותקשורת למציאת דירות להשכרה ישירות מול מפרסמים, עם
        דגש על אפס דמי תיווך לשוכר.
      </Text>

      <View style={appStyles.footerSection}>
        <Text style={appStyles.legalFooterTitle}>הבהרה חשובה</Text>
        <Text style={appStyles.legalFooterText}>
          Lobby אינה מתווך, אינה צד לעסקה, אינה מייצגת שוכר או משכיר, אינה מנהלת
          משא ומתן ואינה גובה משוכרים דמי תיווך, דמי הצלחה או אחוזים.
        </Text>
      </View>

      <View style={appStyles.footerReportNotice}>
        <Text style={appStyles.legalFooterTitle}>דיווח ובטיחות</Text>
        <Text style={appStyles.legalFooterText}>
          אם ביקשו ממך עמלה, תשלום צדדי, פרטי תשלום חשודים, או שהמודעה נראית
          מזויפת/לא מדויקת, צריך לדווח דרך כפתור הדיווח בעמוד המודעה.
        </Text>
      </View>

      <Text style={appStyles.legalFooterTitle}>תנאים ומידע</Text>
      <View style={appStyles.footerLinks}>
        {footerLinks.map((item) => (
          <Text key={item} style={appStyles.footerLinkPill}>
            {item}
          </Text>
        ))}
      </View>

      <Text style={appStyles.footerFinePrint}>
        המידע במודעות נמסר על ידי המפרסמים ובאחריותם. לפני חתימה או תשלום יש לבדוק
        את פרטי הדירה, זהות המפרסם ותנאי ההתקשרות. © 2026 Lobby.
      </Text>
    </View>
  );
}
