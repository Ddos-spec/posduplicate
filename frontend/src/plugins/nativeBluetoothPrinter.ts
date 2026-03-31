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

export type PrinterSlot = 'cashier' | 'kitchen';

export const DEFAULT_PRINTER_ADDRESS_KEY = 'defaultBluetoothPrinterAddress';
export const DEFAULT_PRINTER_NAME_KEY = 'defaultBluetoothPrinterName';
export const KITCHEN_PRINTER_ADDRESS_KEY = 'kitchenBluetoothPrinterAddress';
export const KITCHEN_PRINTER_NAME_KEY = 'kitchenBluetoothPrinterName';

const getSlotKeys = (slot: PrinterSlot) => slot === 'kitchen'
  ? {
      address: KITCHEN_PRINTER_ADDRESS_KEY,
      name: KITCHEN_PRINTER_NAME_KEY
    }
  : {
      address: DEFAULT_PRINTER_ADDRESS_KEY,
      name: DEFAULT_PRINTER_NAME_KEY
    };

export const getSavedPrinterSelection = (slot: PrinterSlot = 'cashier') => {
  const keys = getSlotKeys(slot);

  return {
    address: localStorage.getItem(keys.address) || '',
    name: localStorage.getItem(keys.name) || '',
  };
};

export const savePrinterSelection = (
  printer: { address: string; name: string },
  slot: PrinterSlot = 'cashier'
) => {
  const keys = getSlotKeys(slot);
  localStorage.setItem(keys.address, printer.address);
  localStorage.setItem(keys.name, printer.name);
};

export const clearPrinterSelection = (slot: PrinterSlot = 'cashier') => {
  const keys = getSlotKeys(slot);
  localStorage.removeItem(keys.address);
  localStorage.removeItem(keys.name);
};
