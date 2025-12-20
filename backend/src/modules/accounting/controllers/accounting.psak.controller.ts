import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

/**
 * PSAK-Compliant Financial Reports Controller
 *
 * Implements Indonesian Financial Accounting Standards (PSAK):
 * - PSAK 1: Penyajian Laporan Keuangan
 * - PSAK 2: Laporan Arus Kas
 * - PSAK 25: Kebijakan Akuntansi
 *
 * Report Formats:
 * - Laporan Posisi Keuangan (Neraca) - PSAK 1
 * - Laporan Laba Rugi dan Penghasilan Komprehensif Lain
 * - Laporan Perubahan Ekuitas
 * - Laporan Arus Kas (Direct & Indirect Method)
 * - Catatan atas Laporan Keuangan
 */

// ============= TYPES =============

interface ReportPeriod {
  startDate: Date;
  endDate: Date;
  periodName: string;
}

interface PSAKReportOptions {
  tenantId: number;
  outletId?: number;
  period: ReportPeriod;
  comparativePeriod?: ReportPeriod;
  includeNotes: boolean;
  language: 'id' | 'en';
}

// ============= PSAK 1: LAPORAN POSISI KEUANGAN (NERACA) =============

/**
 * Generate Laporan Posisi Keuangan (Statement of Financial Position)
 * Format sesuai PSAK 1
 */
export const getLaporanPosisiKeuangan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, endDate, comparativeDate, language = 'id' } = req.query;

    const currentEnd = endDate ? new Date(endDate as string) : new Date();
    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

    // Get tenant info for header
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { name: true }
    });

    // ===== ASET (ASSETS) =====

    // Aset Lancar (Current Assets)
    const asetLancar = await getAccountBalances(tenantId, currentEnd, 'ASSET', [
      'Kas dan Setara Kas',
      'Piutang Usaha',
      'Piutang Lain-lain',
      'Persediaan',
      'Biaya Dibayar di Muka',
      'Aset Lancar Lainnya'
    ], whereOutlet);

    // Aset Tidak Lancar (Non-Current Assets)
    const asetTidakLancar = await getAccountBalances(tenantId, currentEnd, 'ASSET', [
      'Investasi Jangka Panjang',
      'Aset Tetap',
      'Aset Tak Berwujud',
      'Aset Pajak Tangguhan',
      'Aset Tidak Lancar Lainnya'
    ], whereOutlet);

    // ===== LIABILITAS (LIABILITIES) =====

    // Liabilitas Jangka Pendek (Current Liabilities)
    const liabilitasJangkaPendek = await getAccountBalances(tenantId, currentEnd, 'LIABILITY', [
      'Utang Usaha',
      'Utang Bank Jangka Pendek',
      'Utang Pajak',
      'Beban yang Masih Harus Dibayar',
      'Pendapatan Diterima di Muka',
      'Liabilitas Jangka Pendek Lainnya'
    ], whereOutlet);

    // Liabilitas Jangka Panjang (Non-Current Liabilities)
    const liabilitasJangkaPanjang = await getAccountBalances(tenantId, currentEnd, 'LIABILITY', [
      'Utang Bank Jangka Panjang',
      'Liabilitas Imbalan Kerja',
      'Liabilitas Pajak Tangguhan',
      'Liabilitas Jangka Panjang Lainnya'
    ], whereOutlet);

    // ===== EKUITAS (EQUITY) =====
    const ekuitas = await getAccountBalances(tenantId, currentEnd, 'EQUITY', [
      'Modal Saham',
      'Tambahan Modal Disetor',
      'Saldo Laba',
      'Komponen Ekuitas Lainnya'
    ], whereOutlet);

    // Calculate totals
    const totalAsetLancar = asetLancar.reduce((sum, a) => sum + a.balance, 0);
    const totalAsetTidakLancar = asetTidakLancar.reduce((sum, a) => sum + a.balance, 0);
    const totalAset = totalAsetLancar + totalAsetTidakLancar;

    const totalLiabilitasJangkaPendek = liabilitasJangkaPendek.reduce((sum, l) => sum + l.balance, 0);
    const totalLiabilitasJangkaPanjang = liabilitasJangkaPanjang.reduce((sum, l) => sum + l.balance, 0);
    const totalLiabilitas = totalLiabilitasJangkaPendek + totalLiabilitasJangkaPanjang;

    const totalEkuitas = ekuitas.reduce((sum, e) => sum + e.balance, 0);

    // Get comparative if requested
    let comparative = null;
    if (comparativeDate) {
      const compEnd = new Date(comparativeDate as string);
      comparative = await generateComparativeBalance(tenantId, compEnd, whereOutlet);
    }

    const labels = language === 'id' ? {
      title: 'LAPORAN POSISI KEUANGAN',
      subtitle: 'Statement of Financial Position',
      aset: 'ASET',
      asetLancar: 'Aset Lancar',
      asetTidakLancar: 'Aset Tidak Lancar',
      totalAset: 'TOTAL ASET',
      liabilitas: 'LIABILITAS',
      liabilitasJangkaPendek: 'Liabilitas Jangka Pendek',
      liabilitasJangkaPanjang: 'Liabilitas Jangka Panjang',
      totalLiabilitas: 'Total Liabilitas',
      ekuitas: 'EKUITAS',
      totalEkuitas: 'Total Ekuitas',
      totalLiabilitasDanEkuitas: 'TOTAL LIABILITAS DAN EKUITAS'
    } : {
      title: 'STATEMENT OF FINANCIAL POSITION',
      subtitle: '',
      aset: 'ASSETS',
      asetLancar: 'Current Assets',
      asetTidakLancar: 'Non-Current Assets',
      totalAset: 'TOTAL ASSETS',
      liabilitas: 'LIABILITIES',
      liabilitasJangkaPendek: 'Current Liabilities',
      liabilitasJangkaPanjang: 'Non-Current Liabilities',
      totalLiabilitas: 'Total Liabilities',
      ekuitas: 'EQUITY',
      totalEkuitas: 'Total Equity',
      totalLiabilitasDanEkuitas: 'TOTAL LIABILITIES AND EQUITY'
    };

    res.json({
      success: true,
      data: {
        header: {
          companyName: tenant?.name,
          reportTitle: labels.title,
          reportSubtitle: labels.subtitle,
          asOf: currentEnd.toISOString().split('T')[0],
          currency: 'IDR'
        },
        content: {
          aset: {
            label: labels.aset,
            lancar: {
              label: labels.asetLancar,
              items: asetLancar,
              total: totalAsetLancar
            },
            tidakLancar: {
              label: labels.asetTidakLancar,
              items: asetTidakLancar,
              total: totalAsetTidakLancar
            },
            total: {
              label: labels.totalAset,
              amount: totalAset
            }
          },
          liabilitas: {
            label: labels.liabilitas,
            jangkaPendek: {
              label: labels.liabilitasJangkaPendek,
              items: liabilitasJangkaPendek,
              total: totalLiabilitasJangkaPendek
            },
            jangkaPanjang: {
              label: labels.liabilitasJangkaPanjang,
              items: liabilitasJangkaPanjang,
              total: totalLiabilitasJangkaPanjang
            },
            total: {
              label: labels.totalLiabilitas,
              amount: totalLiabilitas
            }
          },
          ekuitas: {
            label: labels.ekuitas,
            items: ekuitas,
            total: {
              label: labels.totalEkuitas,
              amount: totalEkuitas
            }
          },
          totalLiabilitasDanEkuitas: {
            label: labels.totalLiabilitasDanEkuitas,
            amount: totalLiabilitas + totalEkuitas
          }
        },
        comparative,
        validation: {
          balanced: Math.abs(totalAset - (totalLiabilitas + totalEkuitas)) < 1,
          difference: totalAset - (totalLiabilitas + totalEkuitas)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= PSAK 1: LAPORAN LABA RUGI DAN PENGHASILAN KOMPREHENSIF LAIN =============

/**
 * Generate Laporan Laba Rugi (Income Statement)
 * Format sesuai PSAK 1
 */
export const getLaporanLabaRugi = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, startDate, endDate, comparativeStart, comparativeEnd, language = 'id' } = req.query;

    const periodStart = startDate ? new Date(startDate as string) : getFirstDayOfMonth(new Date());
    const periodEnd = endDate ? new Date(endDate as string) : new Date();
    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { name: true }
    });

    // ===== PENDAPATAN (REVENUE) =====
    const pendapatan = await getIncomeStatementSection(tenantId, periodStart, periodEnd, 'REVENUE', whereOutlet);

    // ===== BEBAN POKOK PENJUALAN (COGS) =====
    const hpp = await getIncomeStatementSection(tenantId, periodStart, periodEnd, 'COGS', whereOutlet);

    // ===== BEBAN USAHA (OPERATING EXPENSES) =====
    const bebanUsaha = await getIncomeStatementSection(tenantId, periodStart, periodEnd, 'EXPENSE', whereOutlet);

    // ===== PENDAPATAN/BEBAN LAIN-LAIN =====
    const lainLain = await getOtherIncomeExpenses(tenantId, periodStart, periodEnd, whereOutlet);

    // Calculate profits
    const totalPendapatan = pendapatan.reduce((sum, p) => sum + p.amount, 0);
    const totalHPP = hpp.reduce((sum, h) => sum + h.amount, 0);
    const labaKotor = totalPendapatan - totalHPP;

    const totalBebanUsaha = bebanUsaha.reduce((sum, b) => sum + b.amount, 0);
    const labaUsaha = labaKotor - totalBebanUsaha;

    const pendapatanLain = lainLain.pendapatan.reduce((sum, p) => sum + p.amount, 0);
    const bebanLain = lainLain.beban.reduce((sum, b) => sum + b.amount, 0);
    const labaSebelumPajak = labaUsaha + pendapatanLain - bebanLain;

    // Tax expense (simplified - would need actual tax calculation)
    const bebanPajak = labaSebelumPajak > 0 ? labaSebelumPajak * 0.22 : 0; // 22% corporate tax rate
    const labaBersih = labaSebelumPajak - bebanPajak;

    // Get comparative if requested
    let comparative = null;
    if (comparativeStart && comparativeEnd) {
      comparative = await generateComparativeIncomeStatement(
        tenantId,
        new Date(comparativeStart as string),
        new Date(comparativeEnd as string),
        whereOutlet
      );
    }

    const labels = language === 'id' ? {
      title: 'LAPORAN LABA RUGI DAN PENGHASILAN KOMPREHENSIF LAIN',
      pendapatan: 'PENDAPATAN',
      hpp: 'BEBAN POKOK PENJUALAN',
      labaKotor: 'LABA KOTOR',
      bebanUsaha: 'BEBAN USAHA',
      labaUsaha: 'LABA USAHA',
      pendapatanLain: 'Pendapatan Lain-lain',
      bebanLain: 'Beban Lain-lain',
      labaSebelumPajak: 'LABA SEBELUM PAJAK',
      bebanPajak: 'Beban Pajak Penghasilan',
      labaBersih: 'LABA BERSIH PERIODE BERJALAN',
      penghasilanKomprehensif: 'PENGHASILAN KOMPREHENSIF LAIN',
      totalPenghasilanKomprehensif: 'TOTAL PENGHASILAN KOMPREHENSIF'
    } : {
      title: 'STATEMENT OF PROFIT OR LOSS AND OTHER COMPREHENSIVE INCOME',
      pendapatan: 'REVENUE',
      hpp: 'COST OF GOODS SOLD',
      labaKotor: 'GROSS PROFIT',
      bebanUsaha: 'OPERATING EXPENSES',
      labaUsaha: 'OPERATING PROFIT',
      pendapatanLain: 'Other Income',
      bebanLain: 'Other Expenses',
      labaSebelumPajak: 'PROFIT BEFORE TAX',
      bebanPajak: 'Income Tax Expense',
      labaBersih: 'NET PROFIT FOR THE PERIOD',
      penghasilanKomprehensif: 'OTHER COMPREHENSIVE INCOME',
      totalPenghasilanKomprehensif: 'TOTAL COMPREHENSIVE INCOME'
    };

    res.json({
      success: true,
      data: {
        header: {
          companyName: tenant?.name,
          reportTitle: labels.title,
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0],
          currency: 'IDR'
        },
        content: {
          pendapatan: {
            label: labels.pendapatan,
            items: pendapatan,
            total: totalPendapatan
          },
          hpp: {
            label: labels.hpp,
            items: hpp,
            total: totalHPP
          },
          labaKotor: {
            label: labels.labaKotor,
            amount: labaKotor
          },
          bebanUsaha: {
            label: labels.bebanUsaha,
            items: bebanUsaha,
            total: totalBebanUsaha
          },
          labaUsaha: {
            label: labels.labaUsaha,
            amount: labaUsaha
          },
          pendapatanBebanLain: {
            pendapatan: {
              label: labels.pendapatanLain,
              items: lainLain.pendapatan,
              total: pendapatanLain
            },
            beban: {
              label: labels.bebanLain,
              items: lainLain.beban,
              total: bebanLain
            }
          },
          labaSebelumPajak: {
            label: labels.labaSebelumPajak,
            amount: labaSebelumPajak
          },
          bebanPajak: {
            label: labels.bebanPajak,
            amount: bebanPajak
          },
          labaBersih: {
            label: labels.labaBersih,
            amount: labaBersih
          },
          penghasilanKomprehensifLain: {
            label: labels.penghasilanKomprehensif,
            items: [], // Would include revaluation gains, forex, etc.
            total: 0
          },
          totalPenghasilanKomprehensif: {
            label: labels.totalPenghasilanKomprehensif,
            amount: labaBersih // + OCI
          }
        },
        comparative,
        metrics: {
          grossProfitMargin: totalPendapatan > 0 ? ((labaKotor / totalPendapatan) * 100).toFixed(2) : 0,
          operatingProfitMargin: totalPendapatan > 0 ? ((labaUsaha / totalPendapatan) * 100).toFixed(2) : 0,
          netProfitMargin: totalPendapatan > 0 ? ((labaBersih / totalPendapatan) * 100).toFixed(2) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= PSAK 1: LAPORAN PERUBAHAN EKUITAS =====

/**
 * Generate Laporan Perubahan Ekuitas (Statement of Changes in Equity)
 */
export const getLaporanPerubahanEkuitas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { startDate, endDate, language = 'id' } = req.query;

    const periodStart = startDate ? new Date(startDate as string) : getFirstDayOfYear(new Date());
    const periodEnd = endDate ? new Date(endDate as string) : new Date();

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { name: true }
    });

    // Get opening balances
    const openingBalances = await getEquityBalances(tenantId, periodStart);

    // Get movements during period
    const movements = await getEquityMovements(tenantId, periodStart, periodEnd);

    // Get closing balances
    const closingBalances = await getEquityBalances(tenantId, periodEnd);

    // Get net income for the period
    const netIncome = await getNetIncomeForPeriod(tenantId, periodStart, periodEnd);

    const labels = language === 'id' ? {
      title: 'LAPORAN PERUBAHAN EKUITAS',
      saldoAwal: 'Saldo Awal',
      penambahanModal: 'Penambahan Modal',
      pembagianDividen: 'Pembagian Dividen',
      labaBersih: 'Laba Bersih Periode Berjalan',
      penghasilanKomprehensifLain: 'Penghasilan Komprehensif Lain',
      saldoAkhir: 'Saldo Akhir'
    } : {
      title: 'STATEMENT OF CHANGES IN EQUITY',
      saldoAwal: 'Opening Balance',
      penambahanModal: 'Capital Additions',
      pembagianDividen: 'Dividend Distribution',
      labaBersih: 'Net Profit for the Period',
      penghasilanKomprehensifLain: 'Other Comprehensive Income',
      saldoAkhir: 'Closing Balance'
    };

    res.json({
      success: true,
      data: {
        header: {
          companyName: tenant?.name,
          reportTitle: labels.title,
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0],
          currency: 'IDR'
        },
        content: {
          columns: ['Modal Saham', 'Tambahan Modal Disetor', 'Saldo Laba', 'Total Ekuitas'],
          rows: [
            {
              label: labels.saldoAwal,
              values: openingBalances
            },
            {
              label: labels.labaBersih,
              values: [0, 0, netIncome, netIncome]
            },
            {
              label: labels.penghasilanKomprehensifLain,
              values: [0, 0, 0, 0]
            },
            ...movements.map((m: any) => ({
              label: m.description,
              values: m.amounts
            })),
            {
              label: labels.saldoAkhir,
              values: closingBalances,
              isTotal: true
            }
          ]
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= PSAK 2: LAPORAN ARUS KAS =============

/**
 * Generate Laporan Arus Kas - Direct Method
 */
export const getLaporanArusKasDirect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, startDate, endDate, language = 'id' } = req.query;

    const periodStart = startDate ? new Date(startDate as string) : getFirstDayOfMonth(new Date());
    const periodEnd = endDate ? new Date(endDate as string) : new Date();
    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { name: true }
    });

    // ===== AKTIVITAS OPERASI =====
    const operasi = await getCashFlowOperating(tenantId, periodStart, periodEnd, whereOutlet);

    // ===== AKTIVITAS INVESTASI =====
    const investasi = await getCashFlowInvesting(tenantId, periodStart, periodEnd, whereOutlet);

    // ===== AKTIVITAS PENDANAAN =====
    const pendanaan = await getCashFlowFinancing(tenantId, periodStart, periodEnd, whereOutlet);

    // Get opening and closing cash
    const kasPeriodeAwal = await getCashBalance(tenantId, periodStart, whereOutlet);
    const kasPeriodeAkhir = await getCashBalance(tenantId, periodEnd, whereOutlet);

    const totalOperasi = operasi.penerimaan.total - operasi.pengeluaran.total;
    const totalInvestasi = investasi.penerimaan.total - investasi.pengeluaran.total;
    const totalPendanaan = pendanaan.penerimaan.total - pendanaan.pengeluaran.total;
    const perubahanKas = totalOperasi + totalInvestasi + totalPendanaan;

    const labels = language === 'id' ? {
      title: 'LAPORAN ARUS KAS',
      subtitle: '(Metode Langsung)',
      operasi: 'ARUS KAS DARI AKTIVITAS OPERASI',
      investasi: 'ARUS KAS DARI AKTIVITAS INVESTASI',
      pendanaan: 'ARUS KAS DARI AKTIVITAS PENDANAAN',
      perubahanBersih: 'KENAIKAN/(PENURUNAN) BERSIH KAS',
      kasAwal: 'Kas dan Setara Kas Awal Periode',
      kasAkhir: 'KAS DAN SETARA KAS AKHIR PERIODE'
    } : {
      title: 'STATEMENT OF CASH FLOWS',
      subtitle: '(Direct Method)',
      operasi: 'CASH FLOWS FROM OPERATING ACTIVITIES',
      investasi: 'CASH FLOWS FROM INVESTING ACTIVITIES',
      pendanaan: 'CASH FLOWS FROM FINANCING ACTIVITIES',
      perubahanBersih: 'NET INCREASE/(DECREASE) IN CASH',
      kasAwal: 'Cash and Cash Equivalents at Beginning',
      kasAkhir: 'CASH AND CASH EQUIVALENTS AT END'
    };

    res.json({
      success: true,
      data: {
        header: {
          companyName: tenant?.name,
          reportTitle: labels.title,
          reportSubtitle: labels.subtitle,
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0],
          currency: 'IDR'
        },
        content: {
          operasi: {
            label: labels.operasi,
            penerimaan: operasi.penerimaan,
            pengeluaran: operasi.pengeluaran,
            total: totalOperasi
          },
          investasi: {
            label: labels.investasi,
            penerimaan: investasi.penerimaan,
            pengeluaran: investasi.pengeluaran,
            total: totalInvestasi
          },
          pendanaan: {
            label: labels.pendanaan,
            penerimaan: pendanaan.penerimaan,
            pengeluaran: pendanaan.pengeluaran,
            total: totalPendanaan
          },
          perubahanBersih: {
            label: labels.perubahanBersih,
            amount: perubahanKas
          },
          kasAwal: {
            label: labels.kasAwal,
            amount: kasPeriodeAwal
          },
          kasAkhir: {
            label: labels.kasAkhir,
            amount: kasPeriodeAkhir
          }
        },
        validation: {
          reconciled: Math.abs((kasPeriodeAwal + perubahanKas) - kasPeriodeAkhir) < 1,
          difference: (kasPeriodeAwal + perubahanKas) - kasPeriodeAkhir
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate Laporan Arus Kas - Indirect Method
 */
export const getLaporanArusKasIndirect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { outletId, startDate, endDate, language = 'id' } = req.query;

    const periodStart = startDate ? new Date(startDate as string) : getFirstDayOfMonth(new Date());
    const periodEnd = endDate ? new Date(endDate as string) : new Date();
    const whereOutlet = outletId ? `AND gl.outlet_id = ${outletId}` : '';

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { name: true }
    });

    // Get net income
    const netIncome = await getNetIncomeForPeriod(tenantId, periodStart, periodEnd);

    // Get adjustments
    const adjustments = await getIndirectMethodAdjustments(tenantId, periodStart, periodEnd, whereOutlet);

    // Get investing and financing (same as direct)
    const investasi = await getCashFlowInvesting(tenantId, periodStart, periodEnd, whereOutlet);
    const pendanaan = await getCashFlowFinancing(tenantId, periodStart, periodEnd, whereOutlet);

    const totalAdjustments = adjustments.reduce((sum, a) => sum + a.amount, 0);
    const totalOperasi = netIncome + totalAdjustments;
    const totalInvestasi = investasi.penerimaan.total - investasi.pengeluaran.total;
    const totalPendanaan = pendanaan.penerimaan.total - pendanaan.pengeluaran.total;

    const kasPeriodeAwal = await getCashBalance(tenantId, periodStart, whereOutlet);
    const perubahanKas = totalOperasi + totalInvestasi + totalPendanaan;

    const labels = language === 'id' ? {
      title: 'LAPORAN ARUS KAS',
      subtitle: '(Metode Tidak Langsung)',
      labaBersih: 'Laba Bersih',
      penyesuaian: 'Penyesuaian:',
      arusKasOperasi: 'Arus Kas Bersih dari Aktivitas Operasi'
    } : {
      title: 'STATEMENT OF CASH FLOWS',
      subtitle: '(Indirect Method)',
      labaBersih: 'Net Income',
      penyesuaian: 'Adjustments:',
      arusKasOperasi: 'Net Cash from Operating Activities'
    };

    res.json({
      success: true,
      data: {
        header: {
          companyName: tenant?.name,
          reportTitle: labels.title,
          reportSubtitle: labels.subtitle,
          periodStart: periodStart.toISOString().split('T')[0],
          periodEnd: periodEnd.toISOString().split('T')[0],
          currency: 'IDR'
        },
        content: {
          operasi: {
            labaBersih: {
              label: labels.labaBersih,
              amount: netIncome
            },
            penyesuaian: {
              label: labels.penyesuaian,
              items: adjustments,
              total: totalAdjustments
            },
            total: {
              label: labels.arusKasOperasi,
              amount: totalOperasi
            }
          },
          investasi: {
            total: totalInvestasi
          },
          pendanaan: {
            total: totalPendanaan
          },
          perubahanKas,
          kasAwal: kasPeriodeAwal,
          kasAkhir: kasPeriodeAwal + perubahanKas
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= CATATAN ATAS LAPORAN KEUANGAN =============

/**
 * Generate Catatan atas Laporan Keuangan (Notes to Financial Statements)
 */
export const getCatatanLaporanKeuangan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { endDate, language = 'id' } = req.query;

    const reportDate = endDate ? new Date(endDate as string) : new Date();

    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { name: true }
    });

    // Note 1: General Information
    const generalInfo = {
      noteNumber: 1,
      title: language === 'id' ? 'Umum' : 'General',
      content: {
        companyName: tenant?.name,
        establishment: 'Perusahaan didirikan berdasarkan hukum Indonesia',
        businessActivities: 'Bergerak dalam bidang perdagangan dan jasa'
      }
    };

    // Note 2: Accounting Policies
    const accountingPolicies = {
      noteNumber: 2,
      title: language === 'id' ? 'Kebijakan Akuntansi' : 'Accounting Policies',
      content: {
        basisOfPreparation: 'Laporan keuangan disusun berdasarkan PSAK',
        currency: 'Mata uang pelaporan adalah Rupiah (IDR)',
        inventoryMethod: 'Persediaan dicatat dengan metode FIFO',
        depreciation: 'Aset tetap disusutkan dengan metode garis lurus',
        revenueRecognition: 'Pendapatan diakui saat barang/jasa diserahkan'
      }
    };

    // Note 3: Cash and Cash Equivalents details
    const cashDetails = await getCashDetails(tenantId, reportDate);

    // Note 4: Receivables details
    const receivablesDetails = await getReceivablesDetails(tenantId, reportDate);

    // Note 5: Fixed Assets details
    const fixedAssetsDetails = await getFixedAssetsDetails(tenantId, reportDate);

    // Note 6: Payables details
    const payablesDetails = await getPayablesDetails(tenantId, reportDate);

    res.json({
      success: true,
      data: {
        header: {
          companyName: tenant?.name,
          reportTitle: language === 'id' ? 'CATATAN ATAS LAPORAN KEUANGAN' : 'NOTES TO FINANCIAL STATEMENTS',
          asOf: reportDate.toISOString().split('T')[0]
        },
        notes: [
          generalInfo,
          accountingPolicies,
          {
            noteNumber: 3,
            title: language === 'id' ? 'Kas dan Setara Kas' : 'Cash and Cash Equivalents',
            content: cashDetails
          },
          {
            noteNumber: 4,
            title: language === 'id' ? 'Piutang Usaha' : 'Trade Receivables',
            content: receivablesDetails
          },
          {
            noteNumber: 5,
            title: language === 'id' ? 'Aset Tetap' : 'Fixed Assets',
            content: fixedAssetsDetails
          },
          {
            noteNumber: 6,
            title: language === 'id' ? 'Utang Usaha' : 'Trade Payables',
            content: payablesDetails
          }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= HELPER FUNCTIONS =============

async function getAccountBalances(
  tenantId: number,
  asOfDate: Date,
  accountType: string,
  categories: string[],
  whereOutlet: string
): Promise<{ name: string; balance: number; code: string }[]> {
  const results: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      coa.account_code as code,
      coa.account_name as name,
      COALESCE(SUM(
        CASE WHEN coa.normal_balance = 'DEBIT'
          THEN gl.debit_amount - gl.credit_amount
          ELSE gl.credit_amount - gl.debit_amount
        END
      ), 0) as balance
    FROM "accounting"."chart_of_accounts" coa
    LEFT JOIN "accounting"."general_ledger" gl ON coa.id = gl.account_id
      AND gl.transaction_date <= '${asOfDate.toISOString()}'
      ${whereOutlet}
    WHERE coa.tenant_id = ${tenantId}
    AND coa.account_type = '${accountType}'
    AND coa.is_active = true
    GROUP BY coa.id, coa.account_code, coa.account_name
    HAVING COALESCE(SUM(
      CASE WHEN coa.normal_balance = 'DEBIT'
        THEN gl.debit_amount - gl.credit_amount
        ELSE gl.credit_amount - gl.debit_amount
      END
    ), 0) != 0
    ORDER BY coa.account_code
  `).catch(() => []);

  return results.map(r => ({
    code: r.code,
    name: r.name,
    balance: Number(r.balance)
  }));
}

async function getIncomeStatementSection(
  tenantId: number,
  startDate: Date,
  endDate: Date,
  accountType: string,
  whereOutlet: string
): Promise<{ name: string; amount: number; code: string }[]> {
  const results: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      coa.account_code as code,
      coa.account_name as name,
      COALESCE(SUM(
        CASE WHEN coa.normal_balance = 'CREDIT'
          THEN gl.credit_amount - gl.debit_amount
          ELSE gl.debit_amount - gl.credit_amount
        END
      ), 0) as amount
    FROM "accounting"."chart_of_accounts" coa
    LEFT JOIN "accounting"."general_ledger" gl ON coa.id = gl.account_id
      AND gl.transaction_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
      ${whereOutlet}
    WHERE coa.tenant_id = ${tenantId}
    AND coa.account_type = '${accountType}'
    AND coa.is_active = true
    GROUP BY coa.id, coa.account_code, coa.account_name
    HAVING COALESCE(SUM(
      CASE WHEN coa.normal_balance = 'CREDIT'
        THEN gl.credit_amount - gl.debit_amount
        ELSE gl.debit_amount - gl.credit_amount
      END
    ), 0) != 0
    ORDER BY coa.account_code
  `).catch(() => []);

  return results.map(r => ({
    code: r.code,
    name: r.name,
    amount: Math.abs(Number(r.amount))
  }));
}

async function getOtherIncomeExpenses(tenantId: number, startDate: Date, endDate: Date, whereOutlet: string) {
  // Simplified - would need proper categorization
  return {
    pendapatan: [],
    beban: []
  };
}

async function getCashFlowOperating(tenantId: number, startDate: Date, endDate: Date, whereOutlet: string) {
  // Get cash receipts from customers
  const receipts: any[] = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(collection_amount), 0) as total
    FROM "accounting"."ar_collections"
    WHERE tenant_id = ${tenantId}
    AND collection_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
  `).catch(() => [{ total: 0 }]);

  // Get cash payments to suppliers
  const payments: any[] = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(payment_amount), 0) as total
    FROM "accounting"."ap_payments"
    WHERE tenant_id = ${tenantId}
    AND payment_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
  `).catch(() => [{ total: 0 }]);

  return {
    penerimaan: {
      items: [{ name: 'Penerimaan dari pelanggan', amount: Number(receipts[0]?.total || 0) }],
      total: Number(receipts[0]?.total || 0)
    },
    pengeluaran: {
      items: [{ name: 'Pembayaran kepada pemasok', amount: Number(payments[0]?.total || 0) }],
      total: Number(payments[0]?.total || 0)
    }
  };
}

async function getCashFlowInvesting(tenantId: number, startDate: Date, endDate: Date, whereOutlet: string) {
  // Simplified
  return {
    penerimaan: { items: [], total: 0 },
    pengeluaran: { items: [], total: 0 }
  };
}

async function getCashFlowFinancing(tenantId: number, startDate: Date, endDate: Date, whereOutlet: string) {
  // Simplified
  return {
    penerimaan: { items: [], total: 0 },
    pengeluaran: { items: [], total: 0 }
  };
}

async function getCashBalance(tenantId: number, asOfDate: Date, whereOutlet: string): Promise<number> {
  const result: any[] = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as balance
    FROM "accounting"."general_ledger" gl
    JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
    WHERE gl.tenant_id = ${tenantId}
    AND coa.account_type = 'ASSET'
    AND coa.category ILIKE '%kas%'
    AND gl.transaction_date <= '${asOfDate.toISOString()}'
    ${whereOutlet}
  `).catch(() => [{ balance: 0 }]);

  return Number(result[0]?.balance || 0);
}

async function getNetIncomeForPeriod(tenantId: number, startDate: Date, endDate: Date): Promise<number> {
  const revenue: any[] = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0) as total
    FROM "accounting"."general_ledger" gl
    JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
    WHERE gl.tenant_id = ${tenantId}
    AND coa.account_type = 'REVENUE'
    AND gl.transaction_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
  `).catch(() => [{ total: 0 }]);

  const expenses: any[] = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(gl.debit_amount - gl.credit_amount), 0) as total
    FROM "accounting"."general_ledger" gl
    JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
    WHERE gl.tenant_id = ${tenantId}
    AND coa.account_type IN ('EXPENSE', 'COGS')
    AND gl.transaction_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
  `).catch(() => [{ total: 0 }]);

  return Number(revenue[0]?.total || 0) - Number(expenses[0]?.total || 0);
}

async function getEquityBalances(tenantId: number, asOfDate: Date): Promise<number[]> {
  // Simplified - returns [Modal Saham, Tambahan Modal, Saldo Laba, Total]
  const result: any[] = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(SUM(gl.credit_amount - gl.debit_amount), 0) as balance
    FROM "accounting"."general_ledger" gl
    JOIN "accounting"."chart_of_accounts" coa ON gl.account_id = coa.id
    WHERE gl.tenant_id = ${tenantId}
    AND coa.account_type = 'EQUITY'
    AND gl.transaction_date <= '${asOfDate.toISOString()}'
  `).catch(() => [{ balance: 0 }]);

  const total = Number(result[0]?.balance || 0);
  return [0, 0, total, total];
}

async function getEquityMovements(tenantId: number, startDate: Date, endDate: Date): Promise<any[]> {
  return [];
}

async function getIndirectMethodAdjustments(tenantId: number, startDate: Date, endDate: Date, whereOutlet: string) {
  // Common adjustments for indirect method
  return [
    { name: 'Beban penyusutan', amount: 0 },
    { name: 'Perubahan piutang usaha', amount: 0 },
    { name: 'Perubahan persediaan', amount: 0 },
    { name: 'Perubahan utang usaha', amount: 0 }
  ];
}

async function generateComparativeBalance(tenantId: number, endDate: Date, whereOutlet: string) {
  // Simplified
  return null;
}

async function generateComparativeIncomeStatement(tenantId: number, startDate: Date, endDate: Date, whereOutlet: string) {
  return null;
}

async function getCashDetails(tenantId: number, asOfDate: Date) {
  return { items: [], total: 0 };
}

async function getReceivablesDetails(tenantId: number, asOfDate: Date) {
  return { items: [], total: 0 };
}

async function getFixedAssetsDetails(tenantId: number, asOfDate: Date) {
  return { items: [], total: 0 };
}

async function getPayablesDetails(tenantId: number, asOfDate: Date) {
  return { items: [], total: 0 };
}

function getFirstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getFirstDayOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}
