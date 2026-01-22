
## Gemini Added Memories
- Avoid chaining shell commands with '&&'. Execute commands one by one to prevent parsing errors and be more careful about copying the correct command into the tool.

## ⚠️ CRITICAL RULE: FNB Middleware (JANGAN DISENTUH!)

**DILARANG KERAS** menambahkan `roleMiddleware`, `requireRole`, `requireOwner`, atau `requireManager` ke route FNB Module (`backend/src/modules/fnb/routes/**`).

**Alasan:** Owner project SENGAJA tidak pakai role middleware di FNB. Cuma pakai `authMiddleware` + `tenantMiddleware`.

**Yang BOLEH:**
- Edit middleware di modul Accounting (udah pake role middleware)
- Edit middleware di modul Admin (udah pake superAdminOnly)
- Edit logic di controller level

**Yang DILARANG:**
- Tambah role middleware ke FNB routes
- Ubah strategi auth FNB
- Saranin role-based access di FNB

Jika ada requirement soal access control di FNB, TANYA owner dulu sebelum implementasi!

## Project Principles (MANDATORY)
- **WYSIWYG (What You See Is What You Get):** The Demo pages (`/demo/*`) MUST BE visually identical to the Real application pages.
- **No Simplified UI:** Do not create "lite" versions for demos. Use the exact same components and layout as the real app.
- **Mock Implementation:** To achieve WYSIWYG without backend, copy the real page logic but replace API calls (`api.get`, `api.post`) with local State/Mock Data.
- **Feature Parity:** If a button exists in the Real App, it must exist in the Demo (even if it just shows a toast "Simulated Action").
