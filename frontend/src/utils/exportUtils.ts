import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Format currency for export
const formatCurrency = (value: number) => {
  return `Rp ${value.toLocaleString('id-ID')}`;
};

// Export Sales Report to PDF
export const exportSalesPDF = (salesData: any[], stats: any) => {
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
export const exportProductsPDF = (products: any[]) => {
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
export const exportSalesExcel = (salesData: any[], stats: any, products: any[], categories: any[]) => {
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
export const exportProductsExcel = (products: any[]) => {
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
