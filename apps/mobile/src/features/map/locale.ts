import type { Language } from '../../ui/i18n';

const englishLocale: Record<string, string> = {
  'AttributionControl.ToggleAttribution': 'Toggle attribution',
  'AttributionControl.MapFeedback': 'Map feedback',
  'FullscreenControl.Enter': 'Enter fullscreen',
  'FullscreenControl.Exit': 'Exit fullscreen',
  'GeolocateControl.FindMyLocation': 'Find my location',
  'GeolocateControl.LocationNotAvailable': 'Location not available',
  'LogoControl.Title': 'MapLibre logo',
  'Map.Title': 'Map',
  'Marker.Title': 'Map marker',
  'NavigationControl.ResetBearing': 'Drag to rotate map, click to reset north',
  'NavigationControl.ZoomIn': 'Zoom in',
  'NavigationControl.ZoomOut': 'Zoom out',
  'Popup.Close': 'Close popup',
  'ScaleControl.Feet': 'ft',
  'ScaleControl.Meters': 'm',
  'ScaleControl.Kilometers': 'km',
  'ScaleControl.Miles': 'mi',
  'ScaleControl.NauticalMiles': 'nm',
  'GlobeControl.Enable': 'Enable globe',
  'GlobeControl.Disable': 'Disable globe',
  'TerrainControl.Enable': 'Enable terrain',
  'TerrainControl.Disable': 'Disable terrain',
  'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + scroll to zoom the map',
  'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + scroll to zoom the map',
  'CooperativeGesturesHandler.MobileHelpText': 'Use two fingers to move the map',
};

const vietnameseLocale: Record<string, string> = {
  'AttributionControl.ToggleAttribution': 'Bật/tắt thông tin nguồn',
  'AttributionControl.MapFeedback': 'Phản hồi về bản đồ',
  'FullscreenControl.Enter': 'Mở toàn màn hình',
  'FullscreenControl.Exit': 'Thoát toàn màn hình',
  'GeolocateControl.FindMyLocation': 'Tìm vị trí của tôi',
  'GeolocateControl.LocationNotAvailable': 'Không xác định được vị trí',
  'LogoControl.Title': 'Logo MapLibre',
  'Map.Title': 'Bản đồ',
  'Marker.Title': 'Điểm đánh dấu trên bản đồ',
  'NavigationControl.ResetBearing': 'Kéo để xoay bản đồ, nhấn để hướng lên phía bắc',
  'NavigationControl.ZoomIn': 'Phóng to',
  'NavigationControl.ZoomOut': 'Thu nhỏ',
  'Popup.Close': 'Đóng cửa sổ bật lên',
  'ScaleControl.Feet': 'ft',
  'ScaleControl.Meters': 'm',
  'ScaleControl.Kilometers': 'km',
  'ScaleControl.Miles': 'mi',
  'ScaleControl.NauticalMiles': 'nm',
  'GlobeControl.Enable': 'Bật quả địa cầu',
  'GlobeControl.Disable': 'Tắt quả địa cầu',
  'TerrainControl.Enable': 'Bật địa hình',
  'TerrainControl.Disable': 'Tắt địa hình',
  'CooperativeGesturesHandler.WindowsHelpText': 'Nhấn Ctrl và cuộn để phóng to bản đồ',
  'CooperativeGesturesHandler.MacHelpText': 'Nhấn ⌘ và cuộn để phóng to bản đồ',
  'CooperativeGesturesHandler.MobileHelpText': 'Dùng hai ngón tay để di chuyển bản đồ',
};

export function getMapLibreLocale(language: Language): Record<string, string> {
  return language === 'vi' ? vietnameseLocale : englishLocale;
}

/** Update existing MapLibre controls without rebuilding their map or view state. */
export function applyMapLibreControlLocale(root: HTMLElement, language: Language): void {
  const locale = getMapLibreLocale(language);
  const keyByLabel = new Map<string, string>();
  for (const [key, english] of Object.entries(englishLocale)) {
    keyByLabel.set(english, key);
    keyByLabel.set(vietnameseLocale[key]!, key);
  }

  for (const button of root.querySelectorAll<HTMLElement>('button[title], [role="button"][title]')) {
    const key = keyByLabel.get(button.title);
    if (!key) continue;
    const label = locale[key];
    if (!label) continue;
    button.title = label;
    button.setAttribute('aria-label', label);
  }
}
