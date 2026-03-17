# Aras Antivirus

Aras Antivirüs — Geliştiriciler için güvenlik ve sistem temizleme aracı.

## Özellikler

- **Gerçek zamanlı dosya ve işlem izleme**  - **Ağ ve USB cihaz koruması**  
- **Disk, dosya ve klasör tarama** (özel PowerShell betikleriyle)  
- **Karanlık moda uyumlu modern arayüz** (React + Vite + TailwindCSS)  
- **Elektrodasyon ile masaüstü uygulaması** (Electron)  
- **Karantina ve temizleme operasyonları**  
- **Performans kontrolü ve loglama** (electron‑log)  
- **Zustand ile durum yönetimi**  
- **Yerleşik güvenlik şemaları** (backend/schemas)  
- **Çoklu dil desteği (Türkçe hazır)**  

## Kurulum / Başlarken

1. **Depoyu klonlayın**

```bash
git clone https://github.com/your-username/aras-antivirus.git
cd aras-antivirus
```

2. **Bağımlılıkları yükleyin**

```bash
npm install
```

3. **Geliştirme ortamını başlatın**

```bash
npm run dev
```

> Bu komut, renderer (Vite) ve main (TypeScript + Electron) süreçlerini eş zamanlı olarak çalıştırır.

4. **Derleme (production)**

```bash
npm run build   # renderer ve main kodlarını derler
npm run dist    # electron-builder ile dağıtım paketi oluşturur
```

## Kullanım

- Uygulama başlatıldığında **anasayfa** üzerinden tarama türlerini seçebilirsiniz (Hızlı Tarama, Tam Tarama, Özel Yol).  
- **Canlı Koruma** sekmesinden ağ, USB, işlem ve disk izleme özelliklerini aç/kapatabilirsiniz.  
- Tespit edilen tehditler **Karantina** listesinde görüntülenir; burada geri yükleme veya kalıcı silme işlemleri yapılabilir.  
- **Ayarlar** menüsünden güncelleme aralığı, log seviyesi ve bildirim tercihlerini yapılandırabilirsiniz.  
- Komut satırından ayrıca `scripts/check-perf.ps1` gibi PowerShell betiklerini çalıştırarak performans ve güvenlik denetleri yapabilirsiniz.

## Teknoloji Yığını- **Masaüstü Çerçevesi:** Electron (v30)  
- **Kullanıcı Arayüzü:** React 18 + React Router DOM + Lucide React  
- **Stil:** TailwindCSS + PostCSS + Autoprefixer  
- **Derleme Araçları:** Vite, TypeScript  
- **Durum Yönetimi:** Zustand  
- **Loglama:** electron‑log  
- **Paketleme:** electron‑builder  
- **Güvenlik Mantığı:** PowerShell scripts (backend/ps)  
- **Build Scripts:** concurrently, tsc  

## Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Daha fazla bilgi için `LICENSE` dosyasına bakınız. (Lisans dosyası mevcut değilse, varsayılan olarak MIT kabul edilir.)