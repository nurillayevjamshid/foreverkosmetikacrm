# CosmeticaCRM - Men Kosmetika Biznesi Boshqaruvi
<!-- Project updated and moved to a new folder -->

Bu loyiha kosmetika biznesi uchun CRM tizimi bo'lib, sotuvlar, kirim-chiqimlar va mahsulotlarni boshqarishga yordam beradi.

## 🚀 GitHub Actions orqali Deploy qilish

Ushbu loyiha GitHub Pages orqali avtomatik ravishda deploy qilinadigan qilib sozlangan. Har safar `main` branchga kod push qilinganda loyiha avtomatik ravishda yangilanadi.

### Qanday qilib sozlash kerak?

1. Kodni GitHub-dagi repozitoriyangizga push qiling:
   ```bash
   git add .
   git commit -m "Deployment sozlamalari"
   git push origin main
   ```

2. GitHub-da repozitoriyangizga kiring va **Settings** bo'limiga o'ting.
3. Chap tarafdagi menyudan **Pages** bo'limini tanlang.
4. **Build and deployment** bo'limida:
   - **Source**: "GitHub Actions" ni tanlang.
5. Tayyor! Endi har bir yangi o'zgarish avtomatik ravishda saytingizga joylanadi.

### 🛠 Texnologiyalar
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Database/Auth**: Firebase Firestore & Firebase Auth
- **CI/CD**: GitHub Actions

---
© 2026 Forever Kosmetika
