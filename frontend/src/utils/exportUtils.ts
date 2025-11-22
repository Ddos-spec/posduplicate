import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface SalesDataPoint {
  date: string;
  sales: number;
}

interface Statistics {
  totalSales: number;
  totalTransactions: number;
  avgPerTransaction: number;
}

interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  modifiers?: { id: number; name: string; price: number }[];
  notes?: string;
}

interface ReceiptPayment {
  method: string;
  amount: number;
  changeAmount?: number;
}

interface ReceiptData {
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

interface TenantPrintSettings {
  businessName?: string;
  address?: string;
  phone?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  printerWidth?: string;
  logo?: string;
  showLogoOnReceipt?: boolean;
  taxName?: string;
}

// Format currency for export
const formatCurrency = (value: number) => {
  return `Rp ${value.toLocaleString('id-ID')}`;
};

// Export Sales Report to PDF
export const exportSalesPDF = (salesData: SalesDataPoint[], stats: Statistics) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text('Sales Report', 14, 20);

  // Summary Stats
  doc.setFontSize(12);
  doc.text(`Total Sales: ${formatCurrency(stats.totalSales)}`, 14, 35);
  doc.text(`Total Transactions: ${stats.totalTransactions}`, 14, 42);
  doc.text(`Average/Transaction: ${formatCurrency(stats.avgPerTransaction)}`, 14, 49);

  // Sales Data Table
  autoTable(doc, {
    startY: 60,
    head: [['Date', 'Sales']],
    body: salesData.map(item => [
      item.date,
      formatCurrency(item.sales)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }
  });

  doc.save(`sales-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

// Export Products Report to PDF
export const exportProductsPDF = (products: TopProduct[]) => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Top Products Report', 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [['Product Name', 'Quantity Sold', 'Revenue']],
    body: products.map(item => [
      item.name,
      item.qty.toString(),
      formatCurrency(item.revenue)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }
  });

  doc.save(`products-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

// Export Sales Report to Excel
export const exportSalesExcel = (salesData: SalesDataPoint[], stats: Statistics, products: TopProduct[], categories: CategoryData[]) => {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sales Summary Sheet
  const summaryData = [
    ['Sales Report'],
    ['Generated:', new Date().toLocaleString('id-ID')],
    [],
    ['Summary Statistics'],
    ['Total Sales', formatCurrency(stats.totalSales)],
    ['Total Transactions', stats.totalTransactions],
    ['Average per Transaction', formatCurrency(stats.avgPerTransaction)],
    [],
    ['Sales Data'],
    ['Date', 'Sales'],
    ...salesData.map(item => [item.date, item.sales])
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Sales Summary');

  // Top Products Sheet
  const productsData = [
    ['Top Products'],
    [],
    ['Product Name', 'Quantity Sold', 'Revenue'],
    ...products.map(item => [item.name, item.qty, item.revenue])
  ];

  const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
  XLSX.utils.book_append_sheet(wb, productsSheet, 'Top Products');

  // Category Distribution Sheet
  const categoriesData = [
    ['Sales by Category'],
    [],
    ['Category', 'Total Sales'],
    ...categories.map(item => [item.name, item.value])
  ];

  const categoriesSheet = XLSX.utils.aoa_to_sheet(categoriesData);
  XLSX.utils.book_append_sheet(wb, categoriesSheet, 'Categories');

  // Save file
  XLSX.writeFile(wb, `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Export Products to Excel (simple version)
export const exportProductsExcel = (products: TopProduct[]) => {
  const wb = XLSX.utils.book_new();

  const data = [
    ['Top Products Report'],
    ['Generated:', new Date().toLocaleString('id-ID')],
    [],
    ['Product Name', 'Quantity Sold', 'Revenue'],
    ...products.map(item => [item.name, item.qty, item.revenue])
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Products');

  XLSX.writeFile(wb, `products-report-${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Print Receipt/Struk for Transaction
export const printReceipt = (
  transactionData: ReceiptData,
  settings?: TenantPrintSettings
) => {
  // Get printer width from settings or default to 80mm
  const printerWidth = settings?.printerWidth === '58mm' ? 58 : 80;
  const is58mm = printerWidth === 58;

  const doc = new jsPDF({
    format: [printerWidth, 200],
    unit: 'mm'
  });

  let yPos = 10;
  const pageWidth = printerWidth;
  const margin = 5;

  // Logo (if enabled and available)
  if (settings?.logo && settings?.showLogoOnReceipt) {
    try {
      // Add logo image
      const logoSize = is58mm ? 15 : 20;
      const logoX = (pageWidth - logoSize) / 2;
      doc.addImage(settings.logo, 'PNG', logoX, yPos, logoSize, logoSize);
      yPos += logoSize + 3;
      // Add spacing between logo and header
      yPos += 4;
    } catch (error) {
      console.error('Failed to add logo to receipt:', error);
      // Continue without logo if error
    }
  }

  // Header - Store Name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const storeName = settings?.businessName || transactionData.outletName || 'TOKO SAYA';
  doc.text(storeName, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  // Store Info
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  if (settings?.address) {
    doc.text(settings.address, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }
  if (settings?.phone) {
    doc.text(`Telp: ${settings.phone}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 4;
  }
  yPos += 2;

  // Custom Header Message (optional)
  if (settings?.receiptHeader) {
    doc.setFontSize(7);
    const headerLines = doc.splitTextToSize(settings.receiptHeader, pageWidth - (margin * 2));
    headerLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 3;
    });
    yPos += 2;
  }

  // Divider
  doc.text('='.repeat(40), margin, yPos);
  yPos += 5;

  // Transaction Info
  doc.setFontSize(8);
  const date = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`No: ${transactionData.transactionNumber || 'TRX' + Date.now()}`, margin, yPos);
  yPos += 4;
  doc.text(`Tanggal: ${date}`, margin, yPos);
  yPos += 4;
  if (transactionData.cashierName) {
    doc.text(`Kasir: ${transactionData.cashierName}`, margin, yPos);
    yPos += 4;
  }
  yPos += 2;

  // Divider
  doc.text('-'.repeat(40), margin, yPos);
  yPos += 5;

  // Define responsive column positions based on printer width
  const colQty = is58mm ? 28 : 35;
  const colPrice = is58mm ? 35 : 45;
  const colTotal = pageWidth - margin;

  // Items Header
  doc.setFont('helvetica', 'bold');
  doc.text('Item', margin, yPos);
  doc.text('Qty', colQty, yPos);
  doc.text('Harga', colPrice, yPos);
  doc.text('Total', colTotal, yPos, { align: 'right' });
  yPos += 4;
  doc.setFont('helvetica', 'normal');

  // Items
  transactionData.items.forEach(item => {
    // Calculate base price + modifiers
    const modifiersTotal = (item.modifiers || []).reduce((sum, m) => sum + Number(m.price), 0);
    const itemPriceWithModifiers = Number(item.price) + modifiersTotal;
    const itemTotal = item.quantity * itemPriceWithModifiers;

    // Item name - truncate if too long based on printer width
    const maxNameLength = is58mm ? 12 : 18;
    const itemName = item.name.length > maxNameLength ? item.name.substring(0, maxNameLength) + '...' : item.name;

    // All in one line: Name, Qty, Price, Total
    doc.text(itemName, margin, yPos);
    doc.text(item.quantity.toString(), colQty, yPos);
    doc.text(itemPriceWithModifiers.toLocaleString('id-ID'), colPrice, yPos);
    doc.text(itemTotal.toLocaleString('id-ID'), colTotal, yPos, { align: 'right' });
    yPos += 4;

    // Modifiers if any (in separate lines with smaller font)
    if (item.modifiers && item.modifiers.length > 0) {
      doc.setFontSize(7);
      item.modifiers.forEach(modifier => {
        const modText = modifier.price > 0
          ? `  + ${modifier.name} (+${Number(modifier.price).toLocaleString('id-ID')})`
          : `  + ${modifier.name}`;
        doc.text(modText, margin, yPos);
        yPos += 3;
      });
      doc.setFontSize(8);
      yPos += 0.5;
    }

    // Notes if any (in separate line with smaller font)
    if (item.notes) {
      doc.setFontSize(7);
      doc.text(`  * ${item.notes}`, margin, yPos);
      doc.setFontSize(8);
      yPos += 3.5;
    }
  });

  yPos += 2;
  // Divider
  doc.text('-'.repeat(40), margin, yPos);
  yPos += 5;

  // Totals
  doc.text('Subtotal:', margin, yPos);
  doc.text(formatCurrency(transactionData.subtotal), colTotal, yPos, { align: 'right' });
  yPos += 4;

  if (transactionData.discountAmount && transactionData.discountAmount > 0) {
    doc.text('Diskon:', margin, yPos);
    doc.text(`-${formatCurrency(transactionData.discountAmount)}`, colTotal, yPos, { align: 'right' });
    yPos += 4;
  }

  if (transactionData.taxAmount && transactionData.taxAmount > 0) {
    const taxLabel = settings?.taxName || 'Pajak';
    doc.text(`${taxLabel}:`, margin, yPos);
    doc.text(formatCurrency(transactionData.taxAmount), colTotal, yPos, { align: 'right' });
    yPos += 4;
  }

  if (transactionData.serviceCharge && transactionData.serviceCharge > 0) {
    doc.text('Service:', margin, yPos);
    doc.text(formatCurrency(transactionData.serviceCharge), colTotal, yPos, { align: 'right' });
    yPos += 4;
  }

  yPos += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', margin, yPos);
  doc.text(formatCurrency(transactionData.total), colTotal, yPos, { align: 'right' });
  yPos += 6;

  // Payment Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('='.repeat(40), margin, yPos);
  yPos += 5;

  transactionData.payments.forEach(payment => {
    const methodName = payment.method.charAt(0).toUpperCase() + payment.method.slice(1);
    doc.text(`Bayar (${methodName}):`, margin, yPos);
    doc.text(formatCurrency(payment.amount), colTotal, yPos, { align: 'right' });
    yPos += 4;

    if (payment.method === 'cash' && payment.changeAmount && payment.changeAmount > 0) {
      doc.text('Kembali:', margin, yPos);
      doc.text(formatCurrency(payment.changeAmount), colTotal, yPos, { align: 'right' });
      yPos += 4;
    }
  });

  yPos += 4;
  // Footer
  doc.text('='.repeat(40), margin, yPos);
  yPos += 5;

  // Custom Footer or Default
  if (settings?.receiptFooter) {
    doc.setFontSize(7);
    const footerLines = doc.splitTextToSize(settings.receiptFooter, pageWidth - (margin * 2));
    footerLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 3;
    });
    yPos += 2;
  }

  // Default thank you message
  doc.setFontSize(8);
  doc.text('Terima kasih atas kunjungan Anda!', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text('Barang yang sudah dibeli', pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text('tidak dapat ditukar/dikembalikan', pageWidth / 2, yPos, { align: 'center' });

  // Auto print or save
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
