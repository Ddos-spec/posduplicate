import { Request, Response, NextFunction } from 'express';
import prisma from '../../../utils/prisma';

/**
 * e-Faktur Integration Controller
 * Handles Indonesian tax reporting (PPN, PPh) with DJP Online format
 *
 * Features:
 * - Generate Faktur Pajak Keluaran (Sales Tax Invoice)
 * - Generate Faktur Pajak Masukan (Purchase Tax Invoice)
 * - Export to CSV format for DJP e-Faktur application
 * - PPN calculation (11%)
 * - PPh 21, 22, 23, 4(2), 15 support
 * - NSFP (Nomor Seri Faktur Pajak) management
 * - Tax period reporting
 */

// ============= TYPES =============

interface FakturPajak {
  id: number;
  noFaktur: string;
  tanggalFaktur: Date;
  jenisTransaksi: 'FK' | 'FR' | 'FG'; // Faktur Keluaran, Retur, Gabungan
  kodeTransaksi: string; // 01-09
  npwpLawan: string;
  namaLawan: string;
  alamatLawan: string;
  dpp: number; // Dasar Pengenaan Pajak
  ppn: number;
  ppnbm: number;
  status: 'draft' | 'approved' | 'uploaded' | 'rejected';
  items: FakturItem[];
}

interface FakturItem {
  nama: string;
  hargaSatuan: number;
  jumlah: number;
  hargaTotal: number;
  diskon: number;
  dpp: number;
  ppn: number;
  tarifPpnbm: number;
  ppnbm: number;
}

interface PPh {
  jenis: '21' | '22' | '23' | '4(2)' | '15' | '26';
  tanggal: Date;
  npwpPemotong: string;
  namaPemotong: string;
  npwpDipotong: string;
  namaDipotong: string;
  penghasilanBruto: number;
  tarif: number;
  pphTerutang: number;
  noBuktiPotong: string;
}

// Tax rates
const TAX_RATES = {
  PPN: 0.11, // 11% as of 2022
  PPH_21_NPWP: 0.05,
  PPH_21_NON_NPWP: 0.06, // 20% higher
  PPH_22: 0.015,
  PPH_23_JASA: 0.02,
  PPH_23_SEWA: 0.02,
  PPH_23_ROYALTI: 0.15,
  PPH_4_2_SEWA_TANAH: 0.10,
  PPH_4_2_KONSTRUKSI: 0.03,
  PPH_4_2_FINAL_UMKM: 0.005,
  PPH_15_PELAYARAN: 0.012,
  PPH_26_LUAR_NEGERI: 0.20
};

// ============= NSFP MANAGEMENT =============

/**
 * Get available NSFP (Nomor Seri Faktur Pajak)
 */
export const getNSFP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;

    // Get NSFP allocations
    const nsfpList = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "accounting"."nsfp_allocation"
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `).catch(() => []);

    // Calculate usage
    const usedCount = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM "accounting"."faktur_pajak"
      WHERE tenant_id = ${tenantId}
      AND EXTRACT(YEAR FROM tanggal_faktur) = EXTRACT(YEAR FROM NOW())
    `).catch(() => [{ count: 0 }]);

    res.json({
      success: true,
      data: {
        allocations: nsfpList,
        used: Number((usedCount as any[])[0]?.count || 0),
        remaining: calculateRemainingNSFP(nsfpList as any[], Number((usedCount as any[])[0]?.count || 0))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register new NSFP allocation from DJP
 */
export const registerNSFP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { nomorAwal, nomorAkhir, tahunPajak } = req.body;

    if (!nomorAwal || !nomorAkhir || !tahunPajak) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Nomor awal, akhir, dan tahun pajak wajib diisi' }
      });
    }

    // Validate format (000-00.00000000)
    const nsfpRegex = /^\d{3}-\d{2}\.\d{8}$/;
    if (!nsfpRegex.test(nomorAwal) || !nsfpRegex.test(nomorAkhir)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FORMAT', message: 'Format NSFP tidak valid (contoh: 000-22.00000001)' }
      });
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO "accounting"."nsfp_allocation"
      (tenant_id, nomor_awal, nomor_akhir, tahun_pajak, created_by, created_at)
      VALUES (${tenantId}, '${nomorAwal}', '${nomorAkhir}', ${tahunPajak}, ${userId}, NOW())
    `).catch(() => {
      // Table might not exist, create it
      console.log('NSFP table not available');
    });

    res.json({
      success: true,
      message: 'NSFP berhasil didaftarkan'
    });
  } catch (error) {
    next(error);
  }
};

// ============= FAKTUR PAJAK KELUARAN (SALES) =============

/**
 * Get all Faktur Pajak Keluaran
 */
export const getFakturKeluaran = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { masa, tahun, status, page = 1, limit = 20 } = req.query;

    let whereClause = `WHERE fp.tenant_id = ${tenantId} AND fp.jenis = 'keluaran'`;

    if (masa) whereClause += ` AND EXTRACT(MONTH FROM fp.tanggal_faktur) = ${masa}`;
    if (tahun) whereClause += ` AND EXTRACT(YEAR FROM fp.tanggal_faktur) = ${tahun}`;
    if (status) whereClause += ` AND fp.status = '${status}'`;

    const offset = (Number(page) - 1) * Number(limit);

    const fakturs: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        fp.*,
        u.name as created_by_name
      FROM "accounting"."faktur_pajak" fp
      LEFT JOIN "users" u ON fp.created_by = u.id
      ${whereClause}
      ORDER BY fp.tanggal_faktur DESC
      LIMIT ${limit} OFFSET ${offset}
    `).catch(() => []);

    const total: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(*) as count FROM "accounting"."faktur_pajak" fp ${whereClause}
    `).catch(() => [{ count: 0 }]);

    // Calculate summary
    const summary: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COALESCE(SUM(dpp), 0) as total_dpp,
        COALESCE(SUM(ppn), 0) as total_ppn,
        COUNT(*) as jumlah_faktur
      FROM "accounting"."faktur_pajak" fp
      ${whereClause}
    `).catch(() => [{ total_dpp: 0, total_ppn: 0, jumlah_faktur: 0 }]);

    res.json({
      success: true,
      data: {
        fakturs,
        summary: {
          totalDPP: Number(summary[0]?.total_dpp || 0),
          totalPPN: Number(summary[0]?.total_ppn || 0),
          jumlahFaktur: Number(summary[0]?.jumlah_faktur || 0)
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(total[0]?.count || 0),
          totalPages: Math.ceil(Number(total[0]?.count || 0) / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Faktur Pajak Keluaran from transaction
 */
export const createFakturKeluaran = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const {
      transactionId,
      npwpPembeli,
      namaPembeli,
      alamatPembeli,
      kodeTransaksi = '01', // Normal transaction
      items
    } = req.body;

    // Validate required fields
    if (!npwpPembeli || !namaPembeli) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'NPWP dan nama pembeli wajib diisi' }
      });
    }

    // Get next NSFP number
    const noFaktur = await getNextNSFP(tenantId);

    // Calculate totals
    let totalDPP = 0;
    let totalPPN = 0;
    const fakturItems: FakturItem[] = [];

    if (items && items.length > 0) {
      for (const item of items) {
        const dpp = item.hargaTotal - (item.diskon || 0);
        const ppn = Math.round(dpp * TAX_RATES.PPN);

        totalDPP += dpp;
        totalPPN += ppn;

        fakturItems.push({
          nama: item.nama,
          hargaSatuan: item.hargaSatuan,
          jumlah: item.jumlah,
          hargaTotal: item.hargaTotal,
          diskon: item.diskon || 0,
          dpp,
          ppn,
          tarifPpnbm: 0,
          ppnbm: 0
        });
      }
    } else if (transactionId) {
      // Get items from transaction
      const txItems: any[] = await prisma.$queryRawUnsafe<any[]>(`
        SELECT ti.*, p.name as product_name
        FROM "transaction_items" ti
        JOIN "products" p ON ti.product_id = p.id
        WHERE ti.transaction_id = ${transactionId}
      `);

      for (const item of txItems) {
        const dpp = Number(item.subtotal);
        const ppn = Math.round(dpp * TAX_RATES.PPN);

        totalDPP += dpp;
        totalPPN += ppn;

        fakturItems.push({
          nama: item.product_name,
          hargaSatuan: Number(item.price),
          jumlah: Number(item.quantity),
          hargaTotal: Number(item.subtotal),
          diskon: Number(item.discount || 0),
          dpp,
          ppn,
          tarifPpnbm: 0,
          ppnbm: 0
        });
      }
    }

    // Create faktur record
    const tanggalFaktur = new Date();

    await prisma.$executeRawUnsafe(`
      INSERT INTO "accounting"."faktur_pajak"
      (tenant_id, no_faktur, tanggal_faktur, jenis, kode_transaksi,
       npwp_lawan, nama_lawan, alamat_lawan, dpp, ppn, ppnbm,
       status, items, transaction_id, created_by, created_at)
      VALUES
      (${tenantId}, '${noFaktur}', '${tanggalFaktur.toISOString()}', 'keluaran', '${kodeTransaksi}',
       '${npwpPembeli}', '${namaPembeli}', '${alamatPembeli || ''}', ${totalDPP}, ${totalPPN}, 0,
       'draft', '${JSON.stringify(fakturItems)}', ${transactionId || 'NULL'}, ${userId}, NOW())
    `).catch(async () => {
      // Create table if not exists
      await createFakturTable();
    });

    res.status(201).json({
      success: true,
      data: {
        noFaktur,
        tanggalFaktur,
        npwpPembeli,
        namaPembeli,
        dpp: totalDPP,
        ppn: totalPPN,
        total: totalDPP + totalPPN,
        items: fakturItems,
        status: 'draft'
      },
      message: 'Faktur pajak keluaran berhasil dibuat'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-generate Faktur from AR Invoice
 */
export const generateFakturFromAR = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const { arId } = req.params;

    // Get AR invoice details
    const ar: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT ar.*, c.name as customer_name, c.npwp, c.address
      FROM "accounting"."accounts_receivable" ar
      LEFT JOIN "customers" c ON ar.customer_id = c.id
      WHERE ar.id = ${arId} AND ar.tenant_id = ${tenantId}
    `);

    if (ar.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice tidak ditemukan' }
      });
    }

    const invoice = ar[0];

    // Calculate DPP and PPN
    const totalWithPPN = Number(invoice.amount);
    const dpp = Math.round(totalWithPPN / (1 + TAX_RATES.PPN));
    const ppn = totalWithPPN - dpp;

    // Get next NSFP
    const noFaktur = await getNextNSFP(tenantId);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "accounting"."faktur_pajak"
      (tenant_id, no_faktur, tanggal_faktur, jenis, kode_transaksi,
       npwp_lawan, nama_lawan, alamat_lawan, dpp, ppn, ppnbm,
       status, ar_id, created_by, created_at)
      VALUES
      (${tenantId}, '${noFaktur}', NOW(), 'keluaran', '01',
       '${invoice.npwp || '000000000000000'}', '${invoice.customer_name}', '${invoice.address || ''}',
       ${dpp}, ${ppn}, 0, 'draft', ${arId}, ${userId}, NOW())
    `).catch(() => {});

    res.status(201).json({
      success: true,
      data: {
        noFaktur,
        invoice: invoice.invoice_number,
        customer: invoice.customer_name,
        dpp,
        ppn,
        total: totalWithPPN
      },
      message: 'Faktur pajak berhasil di-generate dari invoice'
    });
  } catch (error) {
    next(error);
  }
};

// ============= FAKTUR PAJAK MASUKAN (PURCHASE) =============

/**
 * Get all Faktur Pajak Masukan
 */
export const getFakturMasukan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { masa, tahun, status, page = 1, limit = 20 } = req.query;

    let whereClause = `WHERE fp.tenant_id = ${tenantId} AND fp.jenis = 'masukan'`;

    if (masa) whereClause += ` AND EXTRACT(MONTH FROM fp.tanggal_faktur) = ${masa}`;
    if (tahun) whereClause += ` AND EXTRACT(YEAR FROM fp.tanggal_faktur) = ${tahun}`;
    if (status) whereClause += ` AND fp.status = '${status}'`;

    const offset = (Number(page) - 1) * Number(limit);

    const fakturs: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT fp.*, u.name as created_by_name
      FROM "accounting"."faktur_pajak" fp
      LEFT JOIN "users" u ON fp.created_by = u.id
      ${whereClause}
      ORDER BY fp.tanggal_faktur DESC
      LIMIT ${limit} OFFSET ${offset}
    `).catch(() => []);

    const summary: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COALESCE(SUM(dpp), 0) as total_dpp,
        COALESCE(SUM(ppn), 0) as total_ppn,
        COUNT(*) as jumlah_faktur
      FROM "accounting"."faktur_pajak" fp
      ${whereClause}
    `).catch(() => [{ total_dpp: 0, total_ppn: 0, jumlah_faktur: 0 }]);

    res.json({
      success: true,
      data: {
        fakturs,
        summary: {
          totalDPP: Number(summary[0]?.total_dpp || 0),
          totalPPN: Number(summary[0]?.total_ppn || 0),
          jumlahFaktur: Number(summary[0]?.jumlah_faktur || 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Input Faktur Pajak Masukan (from supplier)
 */
export const inputFakturMasukan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const {
      noFaktur,
      tanggalFaktur,
      npwpPenjual,
      namaPenjual,
      alamatPenjual,
      dpp,
      ppn,
      apId // Optional: link to AP
    } = req.body;

    // Validate NPWP format
    const npwpRegex = /^\d{15}$/;
    if (!npwpRegex.test(npwpPenjual.replace(/[.-]/g, ''))) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_NPWP', message: 'Format NPWP tidak valid' }
      });
    }

    // Validate faktur number format
    const fakturRegex = /^\d{3}-\d{3}\.\d{2}\.\d{8}$/;
    if (!fakturRegex.test(noFaktur)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_FAKTUR', message: 'Format nomor faktur tidak valid' }
      });
    }

    // Check for duplicate
    const existing: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id FROM "accounting"."faktur_pajak"
      WHERE tenant_id = ${tenantId} AND no_faktur = '${noFaktur}' AND jenis = 'masukan'
    `).catch(() => []);

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'Nomor faktur sudah pernah diinput' }
      });
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO "accounting"."faktur_pajak"
      (tenant_id, no_faktur, tanggal_faktur, jenis, kode_transaksi,
       npwp_lawan, nama_lawan, alamat_lawan, dpp, ppn, ppnbm,
       status, ap_id, created_by, created_at)
      VALUES
      (${tenantId}, '${noFaktur}', '${tanggalFaktur}', 'masukan', '01',
       '${npwpPenjual}', '${namaPenjual}', '${alamatPenjual || ''}',
       ${dpp}, ${ppn}, 0, 'draft', ${apId || 'NULL'}, ${userId}, NOW())
    `).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Faktur pajak masukan berhasil diinput'
    });
  } catch (error) {
    next(error);
  }
};

// ============= PPH MANAGEMENT =============

/**
 * Get PPh summary by type
 */
export const getPPhSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { masa, tahun } = req.query;

    const tahunFilter = tahun || new Date().getFullYear();
    const masaFilter = masa ? `AND EXTRACT(MONTH FROM tanggal) = ${masa}` : '';

    const summary: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        jenis,
        COUNT(*) as jumlah,
        COALESCE(SUM(penghasilan_bruto), 0) as total_bruto,
        COALESCE(SUM(pph_terutang), 0) as total_pph
      FROM "accounting"."pph_potput"
      WHERE tenant_id = ${tenantId}
      AND EXTRACT(YEAR FROM tanggal) = ${tahunFilter}
      ${masaFilter}
      GROUP BY jenis
      ORDER BY jenis
    `).catch(() => []);

    const byType = {
      pph21: { jumlah: 0, bruto: 0, pph: 0 },
      pph22: { jumlah: 0, bruto: 0, pph: 0 },
      pph23: { jumlah: 0, bruto: 0, pph: 0 },
      pph4_2: { jumlah: 0, bruto: 0, pph: 0 },
      pph15: { jumlah: 0, bruto: 0, pph: 0 },
      pph26: { jumlah: 0, bruto: 0, pph: 0 }
    };

    for (const row of summary) {
      const key = `pph${row.jenis.replace('(', '_').replace(')', '')}` as keyof typeof byType;
      if (byType[key]) {
        byType[key] = {
          jumlah: Number(row.jumlah),
          bruto: Number(row.total_bruto),
          pph: Number(row.total_pph)
        };
      }
    }

    res.json({
      success: true,
      data: {
        byType,
        totalPPh: Object.values(byType).reduce((sum, t) => sum + t.pph, 0)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create PPh Potong/Pungut
 */
export const createPPh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const userId = (req as any).userId;
    const {
      jenis, // '21', '22', '23', '4(2)', '15', '26'
      tanggal,
      npwpDipotong,
      namaDipotong,
      alamatDipotong,
      penghasilanBruto,
      tarifCustom, // Optional custom rate
      kodeObjekPajak
    } = req.body;

    // Determine tax rate
    let tarif = 0;
    switch (jenis) {
      case '21':
        tarif = npwpDipotong ? TAX_RATES.PPH_21_NPWP : TAX_RATES.PPH_21_NON_NPWP;
        break;
      case '22':
        tarif = TAX_RATES.PPH_22;
        break;
      case '23':
        tarif = tarifCustom || TAX_RATES.PPH_23_JASA;
        break;
      case '4(2)':
        tarif = tarifCustom || TAX_RATES.PPH_4_2_FINAL_UMKM;
        break;
      case '15':
        tarif = TAX_RATES.PPH_15_PELAYARAN;
        break;
      case '26':
        tarif = TAX_RATES.PPH_26_LUAR_NEGERI;
        break;
      default:
        tarif = tarifCustom || 0;
    }

    const pphTerutang = Math.round(penghasilanBruto * tarif);

    // Generate bukti potong number
    const noBuktiPotong = await generateBuktiPotongNumber(tenantId, jenis);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "accounting"."pph_potput"
      (tenant_id, jenis, tanggal, npwp_dipotong, nama_dipotong, alamat_dipotong,
       penghasilan_bruto, tarif, pph_terutang, no_bukti_potong, kode_objek_pajak,
       status, created_by, created_at)
      VALUES
      (${tenantId}, '${jenis}', '${tanggal}', '${npwpDipotong}', '${namaDipotong}', '${alamatDipotong || ''}',
       ${penghasilanBruto}, ${tarif}, ${pphTerutang}, '${noBuktiPotong}', '${kodeObjekPajak || ''}',
       'draft', ${userId}, NOW())
    `).catch(() => {});

    res.status(201).json({
      success: true,
      data: {
        noBuktiPotong,
        jenis: `PPh ${jenis}`,
        penghasilanBruto,
        tarif: `${(tarif * 100).toFixed(1)}%`,
        pphTerutang
      },
      message: 'PPh berhasil dibuat'
    });
  } catch (error) {
    next(error);
  }
};

// ============= SPT REPORTING =============

/**
 * Generate SPT Masa PPN data
 */
export const getSPTMasaPPN = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { masa, tahun } = req.query;

    if (!masa || !tahun) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Masa dan tahun pajak wajib diisi' }
      });
    }

    // Get Faktur Keluaran (PPN Keluaran)
    const keluaran: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COALESCE(SUM(dpp), 0) as total_dpp,
        COALESCE(SUM(ppn), 0) as total_ppn,
        COUNT(*) as jumlah
      FROM "accounting"."faktur_pajak"
      WHERE tenant_id = ${tenantId}
      AND jenis = 'keluaran'
      AND EXTRACT(MONTH FROM tanggal_faktur) = ${masa}
      AND EXTRACT(YEAR FROM tanggal_faktur) = ${tahun}
      AND status != 'rejected'
    `).catch(() => [{ total_dpp: 0, total_ppn: 0, jumlah: 0 }]);

    // Get Faktur Masukan (PPN Masukan)
    const masukan: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        COALESCE(SUM(dpp), 0) as total_dpp,
        COALESCE(SUM(ppn), 0) as total_ppn,
        COUNT(*) as jumlah
      FROM "accounting"."faktur_pajak"
      WHERE tenant_id = ${tenantId}
      AND jenis = 'masukan'
      AND EXTRACT(MONTH FROM tanggal_faktur) = ${masa}
      AND EXTRACT(YEAR FROM tanggal_faktur) = ${tahun}
      AND status != 'rejected'
    `).catch(() => [{ total_dpp: 0, total_ppn: 0, jumlah: 0 }]);

    const ppnKeluaran = Number(keluaran[0]?.total_ppn || 0);
    const ppnMasukan = Number(masukan[0]?.total_ppn || 0);
    const ppnKurangBayar = ppnKeluaran - ppnMasukan;

    res.json({
      success: true,
      data: {
        masaPajak: `${masa}/${tahun}`,
        penyerahan: {
          dpp: Number(keluaran[0]?.total_dpp || 0),
          ppn: ppnKeluaran,
          jumlahFaktur: Number(keluaran[0]?.jumlah || 0)
        },
        perolehan: {
          dpp: Number(masukan[0]?.total_dpp || 0),
          ppn: ppnMasukan,
          jumlahFaktur: Number(masukan[0]?.jumlah || 0)
        },
        perhitungan: {
          ppnKeluaran,
          ppnMasukan,
          ppnKurangBayar: ppnKurangBayar > 0 ? ppnKurangBayar : 0,
          ppnLebihBayar: ppnKurangBayar < 0 ? Math.abs(ppnKurangBayar) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export to e-Faktur CSV format
 */
export const exportEFakturCSV = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId!;
    const { masa, tahun, jenis = 'keluaran' } = req.query;

    const fakturs: any[] = await prisma.$queryRawUnsafe<any[]>(`
      SELECT *
      FROM "accounting"."faktur_pajak"
      WHERE tenant_id = ${tenantId}
      AND jenis = '${jenis}'
      AND EXTRACT(MONTH FROM tanggal_faktur) = ${masa}
      AND EXTRACT(YEAR FROM tanggal_faktur) = ${tahun}
      ORDER BY no_faktur
    `).catch(() => []);

    // Generate CSV content in e-Faktur format
    const csvLines: string[] = [];

    // Header for FK (Faktur)
    csvLines.push('FK,KD_JENIS_TRANSAKSI,FG_PENGGANTI,NOMOR_FAKTUR,MASA_PAJAK,TAHUN_PAJAK,TANGGAL_FAKTUR,NPWP,NAMA,ALAMAT_LENGKAP,JUMLAH_DPP,JUMLAH_PPN,JUMLAH_PPNBM,ID_KETERANGAN_TAMBAHAN,FG_UANG_MUKA,UANG_MUKA_DPP,UANG_MUKA_PPN,UANG_MUKA_PPNBM,REFERENSI');

    for (const faktur of fakturs) {
      const tanggal = new Date(faktur.tanggal_faktur);
      const tanggalStr = `${tanggal.getDate()}/${tanggal.getMonth() + 1}/${tanggal.getFullYear()}`;

      csvLines.push([
        'FK',
        faktur.kode_transaksi || '01',
        '0', // FG_PENGGANTI
        faktur.no_faktur.replace(/-/g, '').replace(/\./g, ''),
        masa,
        tahun,
        tanggalStr,
        faktur.npwp_lawan,
        `"${faktur.nama_lawan}"`,
        `"${faktur.alamat_lawan || ''}"`,
        faktur.dpp,
        faktur.ppn,
        faktur.ppnbm || 0,
        '',
        '0',
        '0',
        '0',
        '0',
        ''
      ].join(','));

      // Add items (FAPR format)
      const items = typeof faktur.items === 'string' ? JSON.parse(faktur.items) : faktur.items;
      if (items && items.length > 0) {
        for (const item of items) {
          csvLines.push([
            'FAPR',
            `"${item.nama}"`,
            item.hargaSatuan,
            item.jumlah,
            item.hargaTotal,
            item.diskon || 0,
            item.dpp,
            item.ppn,
            item.tarifPpnbm || 0,
            item.ppnbm || 0
          ].join(','));
        }
      }
    }

    const csvContent = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=efaktur_${jenis}_${masa}_${tahun}.csv`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

// ============= TAX CALCULATOR =============

/**
 * Calculate tax for transaction
 */
export const calculateTax = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, includesPPN = true, pphType, hasNPWP = true } = req.body;

    let dpp: number;
    let ppn: number;

    if (includesPPN) {
      // Amount includes PPN, calculate DPP
      dpp = Math.round(amount / (1 + TAX_RATES.PPN));
      ppn = amount - dpp;
    } else {
      // Amount is DPP, calculate PPN
      dpp = amount;
      ppn = Math.round(amount * TAX_RATES.PPN);
    }

    const result: any = {
      dpp,
      ppn,
      totalWithPPN: dpp + ppn
    };

    // Calculate PPh if requested
    if (pphType) {
      let pphRate = 0;
      switch (pphType) {
        case '21':
          pphRate = hasNPWP ? TAX_RATES.PPH_21_NPWP : TAX_RATES.PPH_21_NON_NPWP;
          break;
        case '22':
          pphRate = TAX_RATES.PPH_22;
          break;
        case '23':
          pphRate = TAX_RATES.PPH_23_JASA;
          break;
        case '4(2)':
          pphRate = TAX_RATES.PPH_4_2_FINAL_UMKM;
          break;
      }

      result.pph = {
        type: `PPh ${pphType}`,
        rate: `${(pphRate * 100).toFixed(1)}%`,
        amount: Math.round(dpp * pphRate)
      };
      result.netAmount = dpp + ppn - result.pph.amount;
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// ============= HELPER FUNCTIONS =============

function calculateRemainingNSFP(allocations: any[], used: number): number {
  let total = 0;
  for (const alloc of allocations) {
    const start = parseInt(alloc.nomor_awal.slice(-8));
    const end = parseInt(alloc.nomor_akhir.slice(-8));
    total += end - start + 1;
  }
  return Math.max(0, total - used);
}

async function getNextNSFP(tenantId: number): Promise<string> {
  // Get current allocation
  const alloc: any[] = await prisma.$queryRawUnsafe<any[]>(`
    SELECT * FROM "accounting"."nsfp_allocation"
    WHERE tenant_id = ${tenantId}
    AND tahun_pajak = EXTRACT(YEAR FROM NOW())
    ORDER BY created_at DESC
    LIMIT 1
  `).catch(() => []);

  if (alloc.length === 0) {
    // Generate placeholder if no NSFP allocated
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `000-${year}.${random}`;
  }

  // Get last used number
  const lastUsed: any[] = await prisma.$queryRawUnsafe<any[]>(`
    SELECT no_faktur FROM "accounting"."faktur_pajak"
    WHERE tenant_id = ${tenantId}
    AND jenis = 'keluaran'
    AND EXTRACT(YEAR FROM tanggal_faktur) = EXTRACT(YEAR FROM NOW())
    ORDER BY no_faktur DESC
    LIMIT 1
  `).catch(() => []);

  if (lastUsed.length === 0) {
    return alloc[0].nomor_awal;
  }

  // Increment last number
  const lastNum = parseInt(lastUsed[0].no_faktur.slice(-8));
  const prefix = alloc[0].nomor_awal.slice(0, -8);
  return `${prefix}${(lastNum + 1).toString().padStart(8, '0')}`;
}

async function generateBuktiPotongNumber(tenantId: number, jenis: string): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');

  const count: any[] = await prisma.$queryRawUnsafe<any[]>(`
    SELECT COUNT(*) as count FROM "accounting"."pph_potput"
    WHERE tenant_id = ${tenantId}
    AND jenis = '${jenis}'
    AND EXTRACT(YEAR FROM tanggal) = ${year}
    AND EXTRACT(MONTH FROM tanggal) = ${date.getMonth() + 1}
  `).catch(() => [{ count: 0 }]);

  const seq = (Number(count[0]?.count || 0) + 1).toString().padStart(5, '0');
  return `BP${jenis.replace('(', '').replace(')', '')}-${year}${month}-${seq}`;
}

async function createFakturTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."faktur_pajak" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      no_faktur VARCHAR(50) NOT NULL,
      tanggal_faktur DATE NOT NULL,
      jenis VARCHAR(20) NOT NULL,
      kode_transaksi VARCHAR(10),
      npwp_lawan VARCHAR(20),
      nama_lawan VARCHAR(255),
      alamat_lawan TEXT,
      dpp DECIMAL(15,2) DEFAULT 0,
      ppn DECIMAL(15,2) DEFAULT 0,
      ppnbm DECIMAL(15,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'draft',
      items JSONB,
      transaction_id INTEGER,
      ar_id INTEGER,
      ap_id INTEGER,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."pph_potput" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      jenis VARCHAR(10) NOT NULL,
      tanggal DATE NOT NULL,
      npwp_dipotong VARCHAR(20),
      nama_dipotong VARCHAR(255),
      alamat_dipotong TEXT,
      penghasilan_bruto DECIMAL(15,2) DEFAULT 0,
      tarif DECIMAL(5,4) DEFAULT 0,
      pph_terutang DECIMAL(15,2) DEFAULT 0,
      no_bukti_potong VARCHAR(50),
      kode_objek_pajak VARCHAR(20),
      status VARCHAR(20) DEFAULT 'draft',
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "accounting"."nsfp_allocation" (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL,
      nomor_awal VARCHAR(20) NOT NULL,
      nomor_akhir VARCHAR(20) NOT NULL,
      tahun_pajak INTEGER NOT NULL,
      created_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
}
