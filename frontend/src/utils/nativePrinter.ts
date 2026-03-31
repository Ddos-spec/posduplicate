import {
  DEFAULT_PRINTER_ADDRESS_KEY,
  NativeBluetoothPrinter,
  type PrinterSlot,
  getSavedPrinterSelection,
  isNativeAndroidApp,
} from '../plugins/nativeBluetoothPrinter';

interface ReceiptItem {
  itemId?: number;
  name: string;
  quantity: number;
  price: number;
  categoryId?: number | null;
  categoryName?: string | null;
  modifiers?: { id: number; name: string; price: number }[];
  notes?: string;
}

interface ReceiptPayment {
  method: string;
  amount: number;
  changeAmount?: number;
}

export interface NativeReceiptData {
  transactionNumber?: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  serviceCharge?: number;
  total: number;
  payments: ReceiptPayment[];
  cashierName?: string;
  outletName?: string;
}

export interface NativeReceiptSettings {
  businessName?: string;
  address?: string;
  phone?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  printerWidth?: string;
  taxName?: string;
}

const sanitizeLine = (value: string) =>
  value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatCurrency = (value: number) => `Rp ${Math.round(value).toLocaleString('id-ID')}`;

const getPrinterProfile = (printerWidth?: string) => {
  if (printerWidth === '58mm') {
    return {
      printerWidthMm: 48,
      printerNbrCharactersPerLine: 32,
    };
  }

  return {
    printerWidthMm: 72,
    printerNbrCharactersPerLine: 48,
  };
};

const fitText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3)}...`;
};

const buildPriceRow = (label: string, value: string, lineWidth: number) => {
  const left = fitText(label, Math.max(8, lineWidth - value.length - 1));
  return `[L]${left}[R]${value}\n`;
};

export const hasSavedNativePrinter = (slot: PrinterSlot = 'cashier') =>
  Boolean(getSavedPrinterSelection(slot).address || (slot === 'cashier' && localStorage.getItem(DEFAULT_PRINTER_ADDRESS_KEY)));

export const printNativeReceipt = async (
  transactionData: NativeReceiptData,
  settings?: NativeReceiptSettings,
) => {
  if (!isNativeAndroidApp()) {
    return false;
  }

  const { address } = getSavedPrinterSelection();
  if (!address) {
    return false;
  }

  const permissionResult = await NativeBluetoothPrinter.ensurePermissions();
  if (!permissionResult.granted) {
    throw new Error('Izin Bluetooth belum diberikan');
  }

  const profile = getPrinterProfile(settings?.printerWidth);
  const lineWidth = profile.printerNbrCharactersPerLine;
  const divider = '='.repeat(lineWidth);
  const dashedDivider = '-'.repeat(lineWidth);

  const lines: string[] = [];
  const storeName = sanitizeLine(settings?.businessName || transactionData.outletName || 'MyPOS');

  lines.push(`[C]<b>${storeName}</b>\n`);

  if (settings?.address) {
    lines.push(`[C]${sanitizeLine(settings.address)}\n`);
  }

  if (settings?.phone) {
    lines.push(`[C]Telp ${sanitizeLine(settings.phone)}\n`);
  }

  if (settings?.receiptHeader) {
    lines.push(`[C]${sanitizeLine(settings.receiptHeader)}\n`);
  }

  lines.push(`[C]${divider}\n`);
  lines.push(`[L]No: ${sanitizeLine(transactionData.transactionNumber || `TRX-${Date.now()}`)}\n`);
  lines.push(`[L]Kasir: ${sanitizeLine(transactionData.cashierName || '-')}\n`);
  lines.push(`[L]Tgl: ${new Date().toLocaleString('id-ID')}\n`);
  lines.push(`[C]${dashedDivider}\n`);

  for (const item of transactionData.items) {
    const modifiersTotal = item.modifiers?.reduce((sum, modifier) => sum + modifier.price, 0) || 0;
    const itemTotal = (item.price + modifiersTotal) * item.quantity;
    const itemLabel = `${item.quantity}x ${sanitizeLine(item.name)}`;

    lines.push(buildPriceRow(itemLabel, formatCurrency(itemTotal), lineWidth));

    for (const modifier of item.modifiers || []) {
      lines.push(`[L]  + ${sanitizeLine(modifier.name)}\n`);
    }

    if (item.notes) {
      lines.push(`[L]  * ${sanitizeLine(item.notes)}\n`);
    }
  }

  lines.push(`[C]${dashedDivider}\n`);
  lines.push(buildPriceRow('Subtotal', formatCurrency(transactionData.subtotal), lineWidth));

  if (transactionData.taxAmount) {
    lines.push(
      buildPriceRow(settings?.taxName || 'Pajak', formatCurrency(transactionData.taxAmount), lineWidth),
    );
  }

  if (transactionData.serviceCharge) {
    lines.push(buildPriceRow('Service', formatCurrency(transactionData.serviceCharge), lineWidth));
  }

  if (transactionData.discountAmount) {
    lines.push(buildPriceRow('Diskon', `-${formatCurrency(transactionData.discountAmount)}`, lineWidth));
  }

  lines.push(`[C]${divider}\n`);
  lines.push(buildPriceRow('TOTAL', formatCurrency(transactionData.total), lineWidth));
  lines.push(`[C]${divider}\n`);

  for (const payment of transactionData.payments) {
    lines.push(
      buildPriceRow(
        `Bayar ${sanitizeLine(payment.method.toUpperCase())}`,
        formatCurrency(payment.amount),
        lineWidth,
      ),
    );

    if (payment.changeAmount && payment.changeAmount > 0) {
      lines.push(buildPriceRow('Kembali', formatCurrency(payment.changeAmount), lineWidth));
    }
  }

  lines.push('[L]\n');

  if (settings?.receiptFooter) {
    for (const footerLine of settings.receiptFooter.split('\n')) {
      if (footerLine.trim()) {
        lines.push(`[C]${sanitizeLine(footerLine)}\n`);
      }
    }
  } else {
    lines.push('[C]Terima kasih atas kunjungan Anda!\n');
    lines.push('[C]Barang yang sudah dibeli tidak dapat ditukar\n');
  }

  await NativeBluetoothPrinter.printFormattedText({
    address,
    text: lines.join(''),
    printerDpi: 203,
    printerWidthMm: profile.printerWidthMm,
    printerNbrCharactersPerLine: profile.printerNbrCharactersPerLine,
    feedPaperMm: 18,
    cutPaper: false,
  });

  return true;
};

interface NativeKitchenTicketData {
  transactionNumber?: string;
  orderType?: string;
  cashierName?: string;
  outletName?: string;
  kitchenCategoryIds: number[];
  items: ReceiptItem[];
}

export const printNativeKitchenTicket = async (
  ticketData: NativeKitchenTicketData,
  settings?: NativeReceiptSettings,
) => {
  if (!isNativeAndroidApp()) {
    return false;
  }

  const { address } = getSavedPrinterSelection('kitchen');
  if (!address) {
    return false;
  }

  const matchedItems = ticketData.items.filter((item) =>
    item.categoryId != null && ticketData.kitchenCategoryIds.includes(Number(item.categoryId))
  );

  if (matchedItems.length === 0) {
    return false;
  }

  const permissionResult = await NativeBluetoothPrinter.ensurePermissions();
  if (!permissionResult.granted) {
    throw new Error('Izin Bluetooth belum diberikan');
  }

  const profile = getPrinterProfile(settings?.printerWidth);
  const lineWidth = profile.printerNbrCharactersPerLine;
  const divider = '='.repeat(lineWidth);
  const dashedDivider = '-'.repeat(lineWidth);
  const lines: string[] = [];

  lines.push(`[C]<b>${sanitizeLine(ticketData.outletName || settings?.businessName || 'MyPOS')}</b>\n`);
  lines.push('[C]<b>TIKET DAPUR</b>\n');
  lines.push(`[C]${divider}\n`);
  lines.push(`[L]No: ${sanitizeLine(ticketData.transactionNumber || `TRX-${Date.now()}`)}\n`);
  lines.push(`[L]Kasir: ${sanitizeLine(ticketData.cashierName || '-')}\n`);
  lines.push(`[L]Order: ${sanitizeLine(ticketData.orderType || '-')}\n`);
  lines.push(`[L]Tgl: ${new Date().toLocaleString('id-ID')}\n`);
  lines.push(`[C]${dashedDivider}\n`);

  for (const item of matchedItems) {
    lines.push(`[L]<b>${item.quantity}x ${sanitizeLine(item.name)}</b>\n`);

    if (item.categoryName) {
      lines.push(`[L]  Kategori: ${sanitizeLine(item.categoryName)}\n`);
    }

    for (const modifier of item.modifiers || []) {
      lines.push(`[L]  + ${sanitizeLine(modifier.name)}\n`);
    }

    if (item.notes) {
      lines.push(`[L]  * ${sanitizeLine(item.notes)}\n`);
    }

    lines.push('[L]\n');
  }

  lines.push(`[C]${divider}\n`);
  lines.push('[C]Cetak otomatis untuk dapur\n');

  await NativeBluetoothPrinter.printFormattedText({
    address,
    text: lines.join(''),
    printerDpi: 203,
    printerWidthMm: profile.printerWidthMm,
    printerNbrCharactersPerLine: profile.printerNbrCharactersPerLine,
    feedPaperMm: 18,
    cutPaper: false,
  });

  return true;
};
