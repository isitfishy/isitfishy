import { StyleSheet, View } from 'react-native';

type Corner = 'topLeft' | 'topRight' | 'bottomLeft';

/**
 * One QR finder pattern (the square in a square from the logo's eye), pinned to a corner of
 * the input. Three of them, like a QR code, turn the input into a viewfinder. Decorative only.
 */
export function Finder({ color, corner, size = 21 }: { color: string; corner: Corner; size?: number }) {
  const module = size / 7;
  const place = {
    topLeft: { top: 8, left: 8 },
    topRight: { top: 8, right: 8 },
    bottomLeft: { bottom: 8, left: 8 },
  }[corner];
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[styles.ring, place, { width: size, height: size, borderWidth: module, borderColor: color }]}
    >
      <View style={{ width: module * 3, height: module * 3, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
