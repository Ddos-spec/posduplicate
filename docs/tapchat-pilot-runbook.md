# Tapchat Pilot Runbook — MyCommerSocial

Tujuan: menjadikan **Tapchat** sebagai pilot pertama untuk jalur social inbox MyCommerSocial dengan risiko kecil dan feedback cepat.

## Scope pilot yang disarankan
- 1 akun Tapchat
- 1 workspace
- 1 Instagram Business
- 1 Facebook Page
- Plan awal: **Lite**

## Portal
- Register: https://app.tapchat.id/register
- Site/Pricing: https://tapchat.id/

## Field yang tampil di halaman register Tapchat
Terpantau pada **2 Mei 2026**:
- `name`
- `phone`
- `Business Name`
- `email`
- `password`
- `confirm Password`

Selain itu ada opsi masuk dengan:
- Google
- Facebook

## Flow pilot
1. Buka `https://app.tapchat.id/register`
2. Buat akun Tapchat
3. Login ke workspace Tapchat
4. Hubungkan minimal:
   - 1 Instagram Business
   - atau 1 Facebook Page
5. Kembali ke MyCommerSocial → `Connections Hub`
6. Buka **Complete setup** pada **Social Hub**
7. Isi:
   - Workspace label
   - Connection reference jika ada
   - Vendor workspace URL
   - Vendor workspace email
   - Subscription plan
   - Subscription status
   - Renewal date
   - Billing owner
   - Aset/channel aktif
   - Operator note

## Exit criteria
Pilot dianggap selesai jika:
- Social Hub status = `Connected`
- Vendor portal sudah tercatat
- Workspace & email operasional terisi
- Plan & subscription status tercatat
- Minimal 1 aset aktif tercatat
- Connection reference tersimpan
- Pilot readiness score naik ke **100%**

## Catatan
- MyCommerSocial hanya menjadi dashboard/orchestration layer
- Billing Tapchat dibayar langsung oleh user ke vendor
- Jika callback/reference belum otomatis kembali, operator tetap bisa finalisasi manual dari dashboard
