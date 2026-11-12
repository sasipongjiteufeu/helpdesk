# ผลการแก้ไขความปลอดภัย

อัปเดต 12 พฤศจิกายน 2026 — ใช้แทนสถานะช่องโหว่เดิมใน SECURITY_REVIEW.md

## แก้และเปิดใช้ใน Docker local แล้ว

- Legacy role APIs ตรวจ Login และ ADMIN ทั้งเพิ่มและถอดสิทธิ์ พร้อม validation
- Ticket assignment ตรวจผู้เรียกและบทบาทผู้รับมอบหมาย; Agent ที่ไม่เกี่ยวข้องแก้เนื้อหา Ticket ไม่ได้
- Google OAuth ใช้ session-backed state และ S256 PKCE พร้อม account picker; invalid/missing state ถูกปฏิเสธ
- Logout ใช้ POST; mutation requests ตรวจ Origin/Referer ให้ตรง FRONTEND_URL และปฏิเสธเมื่อไม่มีข้อมูลยืนยัน origin
- ปิด debug session endpoint; API ใช้ no-store
- Session secret ต้องยาวอย่างน้อย 32 ตัวใน production; local ได้สร้าง secret สุ่มใหม่แล้ว
- Session ย้ายจาก MemoryStore เป็น MySQL table `helpdesk_sessions` พร้อม expiry 8 ชั่วโมงและการล้างข้อมูลหมดอายุ โดยไม่เปิด TypeORM synchronize
- Production configuration ใช้ Secure + SameSite=Lax, จำกัด trust proxy เป็น loopback และ backend bind loopback; local HTTP ยังคงใช้ cookie non-Secure ตามสภาพแวดล้อม
- เปิด ValidationPipe และแยก DTO ของ create/update/status/assignment เพื่อไม่ให้ status-only request ถูกบังคับส่ง title/detail
- ตรวจ signature ไฟล์ PNG/JPEG/GIF/WebP; SVG/HTML ไม่ผ่านในช่องรูปภาพ ส่วนไฟล์แนบอื่นจำกัด PDF/ZIP/text ตามเงื่อนไขที่กำหนด
- ไฟล์ที่ไม่ใช่รูปภาพ รวมถึงไฟล์เก่าที่เป็น HTML/SVG จะถูกส่งแบบดาวน์โหลด พร้อม sandbox CSP, nosniff และ no-store
- จำกัด upload ต่อไฟล์ 5 MB, จำนวนสูงสุด 10 ไฟล์, จำกัด fields/parts และลบไฟล์ใหม่เมื่อ validation หรือ service operation ล้มเหลว
- Public GET/POST ใช้นโยบายเดียวกัน คืนเลขคำร้อง/status/วันที่และข้อความทั่วไป ไม่คืนหัวข้อ/รายละเอียดจริง
- เพิ่ม rate limits สำหรับ API และ OAuth; cache มีขนาดสูงสุดและลบ expired entries เมื่อเขียน
- เพิ่ม security headers ฝั่ง API และ frontend รวม CSP/frame protection/nosniff/referrer policy
- MySQL/phpMyAdmin ของ local bind ที่ 127.0.0.1 แล้ว ไม่เปิดทุก network interface
- เพิ่ม persistent bind mount ของ uploads, Docker ignore files และใช้ npm ci; runtime backend ตัด devDependencies ออก
- ย้าย secrets ที่เป็น literal ใน compose ไป ignored environment files โดยไม่พิมพ์ค่าลงรายงาน และไม่เปลี่ยนรหัสผ่านฐานข้อมูลจริง

## การตรวจสอบ

- Backend suite: 20 suites / 55 tests ผ่าน รวม regression tests ของ role authorization, ticket permissions, OAuth state/PKCE, Origin checks, logout, file validation และ mail transport แบบไม่ส่งเมลจริง
- ปรับ test fixtures เก่าที่ขาด dependency mocks และ assertions ของ filter ที่ยังอิงพฤติกรรมเก่า โดยไม่ย้อนแก้ production filter ให้ตาม tests เก่า
- Backend และ frontend build ผ่าน; frontend navigation checks ผ่าน
- `node scripts/check-local-security.mjs` ผ่านกับ Docker local: anonymous role APIs ถูกปฏิเสธ, callback state ผิดถูกปฏิเสธ, CSRF checks, POST logout, cookie expiry, debug 404, redacted public data, invalid pagination 400 และ security headers
- Docker Compose local และ server configs ผ่าน `config --quiet`

## ผล dependency audit หลังอัปเดต

| Scope | Critical | High | Moderate | Low |
| --- | ---: | ---: | ---: | ---: |
| Frontend ทั้งหมด | 0 | 0 | 0 | 0 |
| Backend production (`--omit=dev`) | 0 | 0 | 3 | 0 |
| Backend รวม build/test | 0 | 0 | 24 | 5 |

Production ที่เหลือเป็น chain ของ TypeORM → glob/minimatch; npm เสนออัปเกรด TypeORM ข้าม major จึงยังไม่ฝืนเปลี่ยน ORM โดยไม่ทดสอบ migration และ query compatibility ครบ การมี advisory ไม่ได้แปลว่าทุกเส้นทางถูกโจมตีได้ใน application นี้

Nodemailer อัปเกรดเป็น 10.5.0 (ต้อง Node >=20 ซึ่ง Docker นี้รองรับ) และทดสอบสร้างข้อความอีเมลผ่าน stream transport โดยไม่ส่งออกไปยังผู้ใช้

## สิ่งที่ยังต้องทำในบัญชีภายนอก / production

1. **หมุนเวียน credentials เดิม**: Google OAuth client secret, SMTP app password, Telegram bot token, database passwords และ JWT secret ที่ยังใช้งานอยู่ การย้ายไฟล์ไม่เพิกถอนค่าเดิมและไม่ลบออกจาก Git history ไม่ได้หมุนเวียนผ่านบริการเหล่านี้ในงานนี้
2. ไฟล์ `.env.production.local` เป็นไฟล์ ignored ที่เก็บค่าเดิมเพื่อไม่ให้ credentials สูญหาย ให้แทนด้วยค่าใหม่ก่อนนำขึ้น server; ห้าม commit/upload ลง ticket หรือส่งในแชต
3. ตรวจประวัติ repository และผู้มีสิทธิ์เข้าถึง หลัง revoke secrets จึงวางแผนล้างประวัติ Git แบบประสานงานกับผู้ร่วมงาน งานนี้ไม่ rewrite Git history
4. ตรวจ Google Cloud authorized redirect URI ให้ตรง URL ภายนอกจริงใน `docker-compose.server.yml`; reverse proxy ของ production ไม่ได้ตรวจจากเครื่องนี้
5. Production ใช้ `TRUST_PROXY=loopback` และ HOST=127.0.0.1 สำหรับ reverse proxy ที่รันบนเครื่องเดียวกัน ถ้ารูปแบบ deployment ต่างกันต้องกำหนด CIDR ที่เชื่อถือจริง ห้ามเปิด trust proxy ทุกที่
6. ติดตั้ง HTTPS/HSTS ที่ reverse proxy จริงและตรวจ CORS/CSP กับ domain ที่ใช้จริง; local HTTP ไม่มี HSTS โดยตั้งใจ
7. สำรอง DB และ uploads ก่อน deploy จริง ตรวจให้ schema มี migrations ครบ เพราะ synchronize ถูกปิดใน production แล้ว บัญชี DB ต้องสร้างตาราง `helpdesk_sessions` ได้ หรือให้ DBA สร้างตาม schema ใน `mysql-session.store.ts` ก่อน
8. ตรวจ Google Login ด้วยบัญชีจริง, upload/download รูป/ไฟล์เก่า, การประเมินคะแนน, chat, admin reports และการส่ง SMTP/Telegram บน staging; งานนี้ยังไม่ได้ใช้บัญชี Google จริงหรือส่งข้อความภายนอก
9. พิจารณา malware scanning, โควตาไฟล์ต่อผู้ใช้/พื้นที่รวม และ audit log แบบถาวรสำหรับการเปลี่ยนสิทธิ์/ย้ายงาน ซึ่งยังไม่ได้เพิ่มครบในรอบนี้

## คำสั่งใช้งาน

Local (ใช้ `.env` ที่ ignored อยู่แล้ว):

```powershell
docker compose -f docker-compose.yml up -d --build
node scripts/check-local-security.mjs
```

Production — หลังหมุนเวียน secrets, สำรองข้อมูล, ตรวจ proxy และเตรียม migrations แล้วเท่านั้น:

```powershell
docker compose --env-file .env.production.local -f docker-compose.server.yml config --quiet
docker compose --env-file .env.production.local -f docker-compose.server.yml up -d --build
```

ก่อน recreate backend เก่าที่ไม่มี volume ให้คัดลอก `/app/uploads` ไป `storage/uploads` ก่อน เพื่อให้ bind mount ใหม่ใช้ไฟล์เดิมได้ ใน local ที่ตรวจครั้งนี้ container เดิมไม่มี directory `/app/uploads` จึงไม่มีไฟล์จาก directory นี้ให้คัดลอก

`scripts/secure-config.mjs` เป็นตัวช่วย migration ที่ใช้ไปแล้ว ไม่ต้องรันซ้ำเพื่อ deploy; มันเก็บค่าเดิมลง ignored files และสร้าง session secrets แต่ไม่ได้ติดต่อบริการภายนอกเพื่อ revoke/rotate credentials

การอัปเดตในงานนี้มีผลกับ Docker local เท่านั้น ยังไม่ได้ deploy ไป production และไม่ใช่การรับรองว่าไม่มีช่องโหว่อื่น
