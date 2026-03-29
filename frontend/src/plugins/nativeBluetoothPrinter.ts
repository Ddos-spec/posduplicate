import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativePrinterPermissionStatus {
  bluetooth?: string;
}

export interface BondedPrinterDevice {
  name: string;
  address: string;
  bondState?: number;
  majorClass?: number;
}

interface EnsurePermissionsResult {
  granted: boolean;
}

interface BondedPrintersResult {
  available: boolean;
  enabled: boolean;
  printers: BondedPrinterDevice[];
}

interface BluetoothStateResult {
  available: boolean;
  enabled: boolean;
}

interface OpenSettingsResult {
  opened: boolean;
}

interface PrintFormattedTextOptions {
  address: string;
  text: string;
  printerDpi?: number;
  printerWidthMm?: number;
  printerNbrCharactersPerLine?: number;
  feedPaperMm?: number;
  cutPaper?: boolean;
}

interface PrintFormattedTextResult {
  success: boolean;
}

export interface NativeBluetoothPrinterPlugin {
  ensurePermissions(): Promise<EnsurePermissionsResult>;
  getBondedPrinters(): Promise<BondedPrintersResult>;
  getBluetoothState(): Promise<BluetoothStateResult>;
  openBluetoothSettings(): Promise<OpenSettingsResult>;
  printFormattedText(options: PrintFormattedTextOptions): Promise<PrintFormattedTextResult>;
}

export const NativeBluetoothPrinter = registerPlugin<NativeBluetoothPrinterPlugin>('NativeBluetoothPrinter');

export const isNativeAndroidApp = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const DEFAULT_PRINTER_ADDRESS_KEY = 'defaultBluetoothPrinterAddress';
export const DEFAULT_PRINTER_NAME_KEY = 'defaultBluetoothPrinterName';

export const getSavedPrinterSelection = () => ({
  address: localStorage.getItem(DEFAULT_PRINTER_ADDRESS_KEY) || '',
  name: localStorage.getItem(DEFAULT_PRINTER_NAME_KEY) || '',
});

export const savePrinterSelection = (printer: { address: string; name: string }) => {
  localStorage.setItem(DEFAULT_PRINTER_ADDRESS_KEY, printer.address);
  localStorage.setItem(DEFAULT_PRINTER_NAME_KEY, printer.name);
};

export const clearPrinterSelection = () => {
  localStorage.removeItem(DEFAULT_PRINTER_ADDRESS_KEY);
  localStorage.removeItem(DEFAULT_PRINTER_NAME_KEY);
};
