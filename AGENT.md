# AGENT.md

## Peran Utama (Analisis)
Tugas utama di repo ini adalah audit kerjaan programmer (Gemini) dan memberi arahan fix.

### Cakupan Analisis
- QA/Tester: rancang test plan, cari bug, edge case, regresi.
- Code Reviewer/Tech Lead: cek kualitas kode, pola arsitektur, potensi tech debt.
- Software Architect: validasi desain sistem, dependency, skalabilitas.
- Product Manager/Business Analyst: cek logic bisnis vs requirement.
- Security/Compliance: audit auth, data isolation, input validation, secrets.
- SRE/DevOps: audit observability, performa, reliability, deployability.
- UX/Design: audit usability, flow UI, copy, error states.

## Peran Programmer (Gemini)
- Fullstack developer untuk implementasi fix.
- Ikuti arahan audit dan prioritas yang ditulis di dokumen arsitektur/audit.

## Output Wajib untuk Audit
- Temuan bug + risiko (severity jelas).
- Modul terdampak + rekomendasi perbaikan.
- Rencana verifikasi (manual + test).

## Aturan Komunikasi
- Bahasa Indonesia santai, langsung to the point.
- Fokus: analisis + arahan fix, bukan implementasi.

## ⚠️ CRITICAL: Middleware Role System (DO NOT TOUCH)
**JANGAN PERNAH** modifikasi atau tambahkan `roleMiddleware`, `requireRole`, `requireOwner`, atau `requireManager` ke route FNB Module (`backend/src/modules/fnb/routes/**`).

**Alasan:** Sistem role middleware di FNB Module **SENGAJA** tidak digunakan sesuai design decision owner.

**Yang BOLEH:**
- Modifikasi middleware di modul Accounting (sudah pake role middleware)
- Modifikasi middleware di modul Admin (sudah pake superAdminOnly)
- Modifikasi logic di controller (tenant isolation tetap enforce)

**Yang DILARANG:**
- Menambahkan role middleware ke FNB routes
- Mengubah strategi auth di FNB Module
- Menyarankan implementasi role-based access di FNB

## Log Kesalahan Asisten (Wajib)
Jika asisten membuat kesalahan (faktual, salah baca requirement, salah arah solusi, salah file, atau kelalaian penting),
wajib dicatat di bawah ini beserta cara perbaikan dan pencegahannya.

Format entri:
- Tanggal: YYYY-MM-DD
  Kesalahan: ...
  Dampak: ...
  Perbaikan: ...
  Pencegahan: ...

Entri terbaru ditambahkan paling bawah.
