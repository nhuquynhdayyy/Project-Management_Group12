import { Alert, Linking, Platform } from 'react-native';

async function openFirstAvailable(urls: string[]) {
  for (const url of urls) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported || url.startsWith('https://')) {
        await Linking.openURL(url);
        return true;
      }
    } catch {
      // Try the next URL.
    }
  }

  return false;
}

export async function openDirections(latitude: number, longitude: number, label: string) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    Alert.alert('Loi', 'Vi tri cay khong hop le');
    return;
  }

  const encodedLabel = encodeURIComponent(label);
  const webMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
  const urls = Platform.select({
    ios: [
      `maps://?daddr=${latitude},${longitude}&q=${encodedLabel}`,
      `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`,
      webMapsUrl,
    ],
    android: [
      `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`,
      `google.navigation:q=${latitude},${longitude}`,
      webMapsUrl,
    ],
    default: [webMapsUrl],
  }) ?? [webMapsUrl];

  const opened = await openFirstAvailable(urls);
  if (!opened) {
    Alert.alert('Loi', 'Khong the mo ung dung ban do');
  }
}
