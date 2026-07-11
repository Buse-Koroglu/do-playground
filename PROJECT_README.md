# Pet Adopt — Proje İskeleti

Bu proje bilinçli olarak **`docker-compose.yml`, Kubernetes manifestleri ve CI/CD pipeline'ı içermez.**
Bu kısımlar DevOps pratiği amacıyla ayrı olarak sizin tarafınızdan yazılacaktır.

## Klasör Yapısı

```
pet-adopt/
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── index.js
│   │   └── auth.js
│   ├── uploads/          # fotoğrafların yükleneceği klasör (persistent volume adayı)
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── api.js
│   ├── index.html
│   ├── vite.config.js
│   ├── nginx.conf
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
└── README.md
```

## Compose Dosyanızı Yazarken İhtiyacınız Olacak Bilgiler

### Database (Postgres)
- İmaj: `postgres:15-alpine`
- Port: `5432`
- Gerekli env: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- Persistent volume gerekir (örn: `postgres_data:/var/lib/postgresql/data`)

### Backend
- Port: `5000`
- Environment variables:
  - `DATABASE_URL=postgresql://<user>:<pass>@<db_service_name>:5432/<db_name>`
  - `JWT_SECRET=<herhangi bir string>`
  - `PORT=5000`
- Volume: `./backend/uploads:/app/uploads` (fotoğrafların container silinse bile kalıcı olması için)
- `/health` endpoint'i mevcut — healthcheck için kullanılabilir
- Container ilk ayağa kalktığında `npm start` komutu otomatik olarak `prisma migrate deploy` çalıştırır — yani **db servisi hazır olmadan backend başlarsa migration patlar**. Bu yüzden compose'da `depends_on` + healthcheck kombinasyonu kurmanız gerekecek (Hafta 1 konusu).

### Frontend
- Port: `80` (host tarafında istediğiniz porta map edebilirsiniz, örn. `3000:80`)
- **Build-time argüman:** `VITE_API_URL` — Dockerfile içinde `ARG` olarak tanımlı, yani compose'da `build.args` altında vermeniz gerekir, normal `environment:` ile çalışmaz (Vite env değişkenleri build sırasında gömülür, runtime'da değil).

## İlk Kurulum Migration Notu

Bu projede henüz `prisma/migrations/` klasörü yok çünkü migration dosyaları elle yazılmaz, otomatik üretilir.
Backend container'ını ilk kez local'de (compose dışında) çalıştırdığınızda şunu bir kere manuel çalıştırmanız gerekir:

```bash
cd backend
npx prisma migrate dev --name init
```

Bu, `prisma/migrations/` klasörünü ve ilk SQL migration dosyasını oluşturur. Bu dosyayı repoya commit edin — compose ile container ayağa kalktığında `prisma migrate deploy` bu hazır migration'ı uygulayacak.

## Bilinçli Olarak Basit Bırakılanlar

- Dockerfile'lar tek-stage (backend) — Ay 1 Hafta 3'te multi-stage'e çevirmeniz için
- Non-root user tanımlı değil — güvenlik pratiği olarak sizin eklemeniz için
- `.dockerignore` dosyaları yok — sizin eklemeniz için
- Resource limit, restart policy yok — compose'da sizin tanımlamanız için
