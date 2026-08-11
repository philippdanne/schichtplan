import { Platform, useWindowDimensions } from 'react-native';

const TABLET_BREAKPOINT = 768;

/**
 * Drag & drop (dnd-kit) only makes sense on the web build — it's a DOM
 * pointer-events library, react-native-web is what makes it work at all —
 * and only above a tablet-sized viewport, per the design brief. Native
 * builds and narrow web viewports get the tap-to-assign fallback instead.
 */
export function useDragDropEnabled(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= TABLET_BREAKPOINT;
}
