<!-- converted from SCM_Pilot_Top20_Template-1_filled.xlsx -->

## Sheet: README
| SCM AI Pilot – Data Template (Top 20 Core Items + Parameter Outlet) |
| --- |
| Cara pakai (ringkas): |
| 1) Isi sheet TOP20_ITEMS (minimal kolom wajib: Nama Item, Satuan, Days Cover, Sumber Supply). |
| 2) Isi sheet OUTLET_PARAMS (cut-off request, pola kirim DC, dan aturan weekend). |
| 3) Isi sheet STOCK_OPNAME (frekuensi SO dan reason code selisih). |
| 4) Pastikan nama item & satuan mengikuti yang ada di Accurate agar mapping tidak salah. |
| 5) Jika ada item perishable, isi Shelf Life (hari) untuk menghindari overstock & expired. |
| Catatan: |
| - Kolom berwarna kuning = wajib / prioritas. |
| - Teks biru = input (yang akan diisi user). |
| - Drop-down tersedia untuk kolom tertentu (Sumber Supply, Perishable, dll). |
## Sheet: TOP20_ITEMS
| No | Nama Item (sesuai Accurate) * | Kode Item (jika ada) | Kategori (opsional) | Satuan (UOM) * | Days Cover Target (hari) * | Min Stock (angka, opsional) | Max Stock (angka, opsional) | Sumber Supply * | Lead Time (hari) (jika supplier langsung) | Perishable? * | Shelf Life (hari) (jika perishable) | Catatan (opsional) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Beras (contoh) | BR-001 | Bahan Pokok | kg | 5 |  |  | DC |  | Tidak |  | Isi sesuai item Accurate |
| 2 | 7dates Jus Kurma | FGS-00007 |  | Dus |  |  |  | Supplier Langsung |  |  |  |  |
|  | 7dates Susu Kurma | FGS-00008 |  | Dus |  |  |  | Supplier Langsung |  |  |  |  |
|  | Dahagaku Lemon Sereh 250ml | FGS-00009 |  | Botol |  |  |  | Supplier Langsung |  |  |  |  |
|  | Samosa Beef Original (RM) | FGS-00012 |  | PCS |  |  |  | Supplier Langsung |  |  |  |  |
|  | Samosa Beef Spicy (RM) | FGS-00013 |  | PCS |  |  |  | Supplier Langsung |  |  |  |  |
|  | Ichi Ocha Melati 350 ml | FGS-00015 |  | Dus |  |  |  | Supplier Langsung |  |  |  |  |
|  | Susu Almond - FG | FGS-00017 |  | Botol |  |  |  | Supplier Langsung |  |  |  |  |
|  | Gula Asam 250ml | FGS-00035 |  | Botol |  |  |  | Supplier Langsung |  |  |  |  |
|  | Kunyit Asam 250ml | FGS-00037 |  | Botol |  |  |  | Supplier Langsung |  |  |  |  |
|  | Air Isi Ulang | FGS.00047 |  | Galon |  |  |  | Supplier Langsung |  |  |  |  |
|  | AirAlam 600 ml | FGS.00050 |  | Dus |  |  |  | Supplier Langsung |  |  |  |  |
|  | AirAlam 330 ml | FGS.00053 |  | Dus |  |  |  | Supplier Langsung |  |  |  |  |
|  | Green Tea Latte | FGS.00061 |  | Botol |  |  |  | Supplier Langsung |  |  |  |  |
|  | Dahagaku Lemon Tea Madu 250ml | FGS.00074 |  | Botol |  |  |  | Supplier Langsung |  |  |  |  |
|  | Lunch Box | PCG-00001 |  | PCS |  |  |  | Supplier Langsung |  |  |  |  |
|  | Lunch Box Aqiqah | PCG-00002 |  | PCS |  |  |  | Supplier Langsung |  |  |  |  |
|  | Loyang Mini | PCG-00003 |  | Lusin |  |  |  | Supplier Langsung |  |  |  |  |
|  | Loyang Sedang | PCG-00004 |  | Lusin |  |  |  | Supplier Langsung |  |  |  |  |
|  | Loyang Besar | PCG-00005 |  | Lusin |  |  |  | Supplier Langsung |  |  |  |  |
|  | Box Loyang Mini | PCG-00006 |  | PCS |  |  |  | Supplier Langsung |  |  |  |  |
|  | Box Loyang Sedang | PCG-00007 |  | PCS |  |  |  | Supplier Langsung |  |  |  |  |
|  | Box Loyang Besar | PCG-00008 |  | PCS |  |  |  | Supplier Langsung |  |  |  |  |
|  | Cup Sambal Dine in | PCG-00009 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | Cup Sambal Take Away | PCG-00010 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | Cup Sambal Loyang Mini | PCG-00011 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | Cup Sambal Loyang Sedang | PCG-00012 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | Cup Sambal Loyang Besar | PCG-00013 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | Mika Bento | PCG-00027 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | Rice Bowl 600 ml | PCG-00030 |  | PCS |  |  |  | Supplier Langsung |  |  |  |  |
|  | Plastik Gelas Cup TA | PCG.00015 |  | Bal |  |  |  | Supplier Langsung |  |  |  |  |
|  | Plastik Merah | PCG.00017 |  | Bal |  |  |  | Supplier Langsung |  |  |  |  |
|  | Plastik Wrapping | PCG.00019 |  | Roll |  |  |  | Supplier Langsung |  |  |  |  |
|  | Alumunium Foil | PCG.00020 |  | Roll |  |  |  | Supplier Langsung |  |  |  |  |
|  | Sedotan | PCG.00023 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | Plastik 20x35 | PCG.00025 |  | Bal |  |  |  | Supplier Langsung |  |  |  |  |
|  | Plastik Klip | PCG.00029 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | PE 19 (Plastik Take Away) | PCG.00040 |  | Kg |  |  |  | Supplier Langsung |  |  |  |  |
|  | Sendok @100 PCS | PCG.00042 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | Ayam (0,9) - RM | RMT.00001 |  | Ekor |  |  |  | Supplier Langsung |  |  |  |  |
|  | Kambing - RM | RMT.00002 |  | Kg |  |  |  | Supplier Langsung |  |  |  |  |
|  | Ayam (0.9) - WIP | WIP-00001 |  | Bungkus |  |  |  | Supplier Langsung |  |  |  |  |
|  | Kambing - WIP | WIP-00002 |  | Bungkus |  |  |  | DC |  |  |  |  |
|  | Iga Sapi Original - WIP | WIP.00015 |  | Bungkus |  |  |  | DC |  |  |  |  |
|  | Bumbu Nasi - WIP | WIP-00004 |  | Bungkus |  |  |  | DC |  |  |  |  |
|  | Sambal - WIP | WIP-00005 |  | Bungkus |  |  |  | DC |  |  |  |  |
|  | Rendang | FGS.00060 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | Rabeg | WIP.00009 |  | Pack |  |  |  | Supplier Langsung |  |  |  |  |
|  | Kayu Manis - WIP (Bks) | WIP-00004-2 |  | Bungkus |  |  |  | Supplier Langsung |  |  |  |  |
|  | Bumbu Presto | WIP-00023-2 |  | Bungkus |  |  |  | Supplier Langsung |  |  |  |  |
|  | Oregano - WIP (Bks) | WIP-00039 |  | Bungkus |  |  |  | Supplier Langsung |  |  |  |  |
|  | Beras Yaman Rice | RMT.00004-1 |  | Kg |  |  |  | Supplier Langsung |  |  |  |  |
## Sheet: OUTLET_PARAMS
| Parameter | Nilai | Catatan |
| --- | --- | --- |
| Jumlah outlet aktif * | 59 |  |
| Pola kirim DC * | Senin, Selasa, Kamis, Jumat | Boleh sesuaikan bila ada perubahan jadwal |
| Cut-off request outlet ke DC * | H-1 pkl. 19.00 | Contoh: H-1 15:00 WIB |
| Strategi cover stok outlet (hari) * | 4-5 | Sesuai asumsi saat ini |
| Weekend demand naik? * | Ya | Jika Ya, isi % kenaikan di bawah |
| Estimasi kenaikan demand weekend (%) | 30%-50% | Contoh: 10%–25% |
| Hari puncak penjualan | Jumat-Minggu | Contoh: Jumat–Minggu |
| Catatan operasional khusus | jam operasional bisa berbeda antar outlet, promo berlaku di hampir semua outlet (kadang ada outlet yg tdk ikut program promo) | Misal: promo rutin, event, jam operasional berbeda |
## Sheet: STOCK_OPNAME
| Parameter | Nilai | Catatan |
| --- | --- | --- |
| Frekuensi Stock Opname per outlet * | Bulanan | Mingguan / 2-mingguan / Bulanan |
| Scope SO * | Full item | Full item / Sampling / Item kritikal saja |
| Input hasil SO ke Accurate * | Ya | Sudah disebut: hasil SO naik di Accurate |
| Pelaksanaan SO manual? * | Ya | Normal; yang penting konsisten & tercatat |
| Ada reason code selisih? * | Ya | Waste / Spoilage / Portioning / Hilang / Salah input |
| Siapa PIC approve koreksi stok? * | FAIT | Nama role: Area Manager / Finance / Ops |
| Catatan |  |  |