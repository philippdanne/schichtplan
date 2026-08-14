import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildScheduleHtml, type ScheduleExportInput } from './buildScheduleHtml';

/**
 * On web, expo-print's web implementation just calls window.print() on the
 * current page and ignores the html string entirely — no real cross-platform
 * unification there, so web gets its own path: render the schedule into a
 * hidden iframe (keeps the live app DOM out of the print) and print that.
 * Native gets a real PDF via expo-print's WebView renderer, handed off
 * through the share sheet via expo-sharing.
 */
export async function exportSchedulePdf(input: ScheduleExportInput): Promise<void> {
  const html = buildScheduleHtml(input);

  if (Platform.OS === 'web') {
    printHtmlInIframe(html);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Schichtplan – ${input.event.name}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

function printHtmlInIframe(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.srcdoc = html;
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  };
  document.body.appendChild(iframe);
  setTimeout(() => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  }, 1000);
}
