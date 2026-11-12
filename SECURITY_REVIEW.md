# รายงานตรวจความปลอดภัย Helpdesk

วันที่ตรวจ: 12 พฤศจิกายน 2026 (Asia/Bangkok)

> รายงานด้านล่างเป็นผลก่อนแก้ไข ดูสถานะล่าสุดและสิ่งที่ยังเหลือใน [SECURITY_HARDENING.md](SECURITY_HARDENING.md) ช่องโหว่ role API ได้ปิดแล้ว และ reproduction tests ถูกเปลี่ยนเป็น regression tests ที่ตรวจให้คำขอไม่มีสิทธิ์ถูกปฏิเสธ

**ผล: พบช่องโหว่ระดับวิกฤตที่ควรปิดก่อนเปิดใช้งานบนอินเทอร์เน็ต**

ตรวจ source ปัจจุบัน, Docker configuration, local HTTP API และ npm audit แบบอ่านอย่างเดียว ไม่มีการแก้สิทธิ์ผู้ใช้จริง อัปโหลดไฟล์โจมตี ทดสอบโหลด หรือสแกน production การตรวจครั้งนี้ไม่ได้เปลี่ยน application/configuration ที่ใช้งานอยู่ เพิ่มเฉพาะรายงานและการทดสอบจำลองช่องโหว่

## 1. วิกฤต — เปลี่ยนสิทธิ์ผู้ใช้โดยไม่ต้อง Login

- หลักฐาน: `backend/src/role/role.controller.ts:9` และ `:16` ไม่มี authentication/role guards; `RoleModule` ยังถูกโหลดใน application
- เส้นทาง: `PATCH /api/roles/assign` และ `PATCH /api/roles/removeRoleFromUserByEmail`
- Service ค้นผู้ใช้ตาม email และบันทึก role ลงฐานข้อมูลโดยตรง ไม่มีการตรวจผู้เรียกเพิ่มเติม
- ผลกระทบ: ผู้ที่เข้าถึง API และทราบอีเมลบัญชีในระบบสามารถเพิ่ม ADMIN หรือถอดสิทธิ์บุคคลอื่นได้ การมี Sidebar ตามสิทธิ์ไม่ป้องกันการเรียก API โดยตรง
- ยืนยันด้วย Nest HTTP integration tests แยกจากระบบจริง: คำขอไม่มี cookie ทั้งสองเส้นทางได้ HTTP 200 และเรียก mock service สำเร็จ ไม่เชื่อมต่อฐานข้อมูล
- แก้: ถ้าไม่มีผู้ใช้งาน API เก่านี้ ให้ถอดเส้นทางออก มิฉะนั้นใช้ `AuthenticatedGuard`, `RolesGuard`, `@Roles(ADMIN)` ที่ controller และ validate DTO รวมถึงบันทึกผู้แก้สิทธิ์
- เกณฑ์ผ่านหลังแก้: anonymous และ USER/AGENT ต้องได้ 401/403 และ service ไม่ถูกเรียก; ADMIN เท่านั้นจึงทำรายการได้

## 2. สูง — Secrets อยู่ในไฟล์ที่ Git ติดตาม

- หลักฐาน: `git ls-files` พบ `docker-compose.server.yml` และ `docker-compose.yml`; ใน server configuration มีค่า literal ของ Google client secret, JWT secret, database password และ Telegram bot token
- `.gitignore` มีชื่อไฟล์แล้วแต่ไม่ทำให้ไฟล์ที่ติดตามอยู่หลุดจาก Git ไม่มีการคัดลอกค่า secret ลงรายงานนี้
- ผลกระทบขึ้นกับว่า credentials ยังใช้งานได้หรือไม่และใครเข้าถึง repository/history ได้ ยังไม่ได้ทดสอบ credentials กับบริการภายนอก
- แก้: หมุนเวียน credentials ที่ยังใช้งานอยู่ ย้ายไป deployment secrets/environment ที่ไม่ติดตามใน Git ตรวจประวัติ Git และสิทธิ์เข้าถึง repository การลบข้อความจาก commit ล่าสุดอย่างเดียวไม่เพิกถอน credentials เดิม

## 3. สูง — ไฟล์แนบอาจทำให้เกิด stored XSS บน origin ของ API

- หลักฐาน: `backend/src/ticket/ticket.controller.ts:40`, `:371` รับ `pictures` โดยไม่มี allowlist ชนิดไฟล์; service เก็บ `f.mimetype` ตามผู้ส่ง (`ticket.service.ts:355`, `:886`)
- Download endpoints ใช้ MIME ดังกล่าวเป็น `Content-Type` และ `sendFile` (`ticket.controller.ts:220`, `:245`) ไม่มีการบังคับดาวน์โหลดหรือ sandbox สำหรับ active content
- ผลกระทบที่เป็นไปได้: ผู้ใช้ที่ Login สามารถแนบ HTML/SVG แล้วชักจูงเจ้าหน้าที่เปิด URL ไฟล์โดยตรง ซึ่งอาจรัน script ด้วย origin ของ backend และเรียก API ในนามเจ้าหน้าที่ แม้ cookie เป็น HttpOnly ก็ไม่ได้หยุด script จากการส่งคำขอที่แนบ cookie
- สถานะ: ยืนยันเส้นทางจาก source ยังไม่ได้รัน payload ในเบราว์เซอร์หรืออัปโหลดเข้าระบบจริง
- มีขนาดจำกัด 5 MB ต่อไฟล์อยู่แล้วใน `ticket.module.ts`; ไม่ใช่กรณีไม่มีข้อจำกัดใดเลย แต่ PATCH ไม่กำหนดจำนวนไฟล์สูงสุด และยังไม่มีโควตารวม
- แก้: ตรวจชนิดจริงจากเนื้อไฟล์, จำกัดชนิดและจำนวนไฟล์ทั้ง create/update, re-encode รูปที่อนุญาต; ไฟล์อื่นให้ดาวน์โหลดหรือใช้ origin แยก พร้อม `nosniff` และนโยบาย CSP ที่เหมาะสม ลบไฟล์ที่ upload สำเร็จแต่ operation ถูกปฏิเสธ
- อ้างอิง: [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)

## 4. สูง — OAuth ไม่มีการผูกคำขอและ callback ด้วย state

- หลักฐาน: `backend/src/google.strategy.ts:9` ไม่เปิด state/PKCE; คำตอบ local `GET /api/auth/google` เป็น HTTP 302 โดย URL ไม่มีทั้ง `state` และ `code_challenge`
- `prompt=select_account` ที่เพิ่งเพิ่มช่วยให้เลือกบัญชี แต่ไม่ได้ป้องกัน login CSRF
- ผลกระทบ: callback ไม่ได้พิสูจน์ว่ากระบวนการ Login เริ่มจาก browser/session เดียวกัน เสี่ยง login CSRF; ยังไม่ได้ทดสอบโจมตีโดยใช้บัญชี Google จริง
- แก้: เปิด session-backed OAuth state ที่ตรวจใน callback และพิจารณา PKCE ตามความสามารถของ strategy ทดสอบ missing/invalid/replayed state ต้องถูกปฏิเสธ และการ Login ปกติยังผ่าน
- อ้างอิง: [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server)

## 5. สูง — การตั้งค่า session สำหรับ production ยังไม่ครบ

- `backend/src/main.ts:19` มี fallback secret เป็นค่าคงที่ที่เดาได้; compose ที่ตรวจไม่มีการส่ง `SESSION_SECRET` ชัดเจน ยังไม่ได้อ่าน environment ภายใน process เพื่อยืนยัน runtime secret
- `docker-compose.server.yml:26` ตั้ง `COOKIE_SECURE=false` ทั้งที่ FRONTEND_URL เป็น HTTPS; อย่าสับสนกับ local HTTP ซึ่งต้องใช้ cookie แบบ non-Secure
- `backend/src/auth/session-cookie.ts:3` ชื่อ `__host.sid` ไม่ใช่ prefix มาตรฐาน `__Host-` จึงไม่ได้รับข้อบังคับพิเศษของ prefix ดังกล่าว
- ใช้ default MemoryStore และอายุ cookie 7 วัน ไม่มี idle timeout ที่กำหนดชัดเจน
- แก้: production ต้องมี secret แบบสุ่มและ fail startup ถ้าขาด, ใช้ Secure cookie กับ HTTPS, ตั้ง trust proxy ให้ตรง topology ก่อนเปิด Secure หลัง reverse proxy, ใช้ session store ที่รองรับ production และกำหนด timeout ที่เหมาะสม
- การใช้ secret อ่อนเพียงอย่างเดียวไม่ได้แปลว่าปลอม user session ใดก็ได้ทันที เพราะ session ID ยังต้องสัมพันธ์กับข้อมูลใน server store

## 6. สูงตามเงื่อนไขใช้งาน — npm audit พบแพ็กเกจมี advisories

ผล `npm audit --omit=dev` ณ วันที่ตรวจ:

| ชุด | Critical | High | Moderate | Low | รวมรายการแพ็กเกจที่ถูกแจ้ง |
| --- | ---: | ---: | ---: | ---: | ---: |
| Backend | 1 | 14 | 8 | 1 | 24 |
| Frontend | 0 | 10 | 1 | 0 | 11 |

- ตัวอย่าง backend: NestJS, Axios, Nodemailer, TypeORM และ proxy-addr; frontend: Axios, React Router และ build dependencies ที่ถูก resolve เข้ามาในต้นไม้ dependencies
- ตัวเลขเป็นรายการแพ็กเกจตาม npm ไม่ใช่จำนวนช่องโหว่อิสระหรือจำนวนช่องทางโจมตีที่ยืนยันแล้ว
- ตัวอย่าง critical: [proxy-addr IP spoofing advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h); ต้องมีเงื่อนไข trust configuration ที่เกี่ยวข้อง ไม่ได้ยืนยันว่าโจมตี application นี้ได้
- แอป frontend นี้เป็น static SPA; advisories ที่เกี่ยวกับ SSR/server actions/dev server ไม่ได้แปลว่ามีช่องทางดังกล่าวใน Nginx production
- แก้: อัปเดตแบบควบคุมพร้อมตรวจ changelog/build/regression tests และ audit ซ้ำ ไม่ใช้ `npm audit fix --force` โดยไม่ทบทวน breaking changes

## 7. กลาง — ข้อมูล Ticket ถูกเปิดเป็นสาธารณะ

- Local anonymous `GET /api/tickets/public?limit=1` ได้ HTTP 200 และมี `id,title,detail,status,createdAt,updatedAt` โดยไม่บันทึกค่าของ Ticket ลงรายงาน
- `ticket.service.ts:403` และ `:445` เลือก title/detail; GET public ยังดึงทุกสถานะ ต่างจาก POST public ที่จำกัดงานปิดตามวัน
- เป็นฟังก์ชันที่ออกแบบไว้ แต่รายละเอียดแบบ free text อาจมีข้อมูลส่วนบุคคลหรือข้อมูลภายใน ไม่ควรถือว่าเป็นการ bypass guard ของ Ticket detail
- แก้: ให้ public แสดงสถิติ/status/ข้อความสรุปที่ปลอดภัย หรือจำกัดรายละเอียดเฉพาะผู้ Login ตามนโยบายองค์กร และให้ GET/POST ใช้นโยบายเดียวกัน

## 8. กลาง — นโยบายสิทธิ์ Agent ไม่สอดคล้องกัน

- `ticket.service.ts:901` เมธอด assign ไม่รับตัวตนผู้เรียก ตรวจแค่ ticket/assignee มีอยู่; controller อนุญาต AGENT/ADMIN
- Agent จึงสามารถมอบหมาย Ticket อื่นให้ตนเองหรือบัญชีที่ไม่มี AGENT ได้ จากนั้นเงื่อนไข assigned agent ใน changeStatus ยอมให้เปลี่ยนสถานะ
- `updateFor` ที่ `:866` ให้ AGENT ทุกคนแก้เนื้อหาได้ แม้ข้อกำหนดของฟังก์ชันอื่นจำกัดเฉพาะ assigned/collaborating agents
- ต้องยืนยันนโยบาย: หาก Agent ทุกคนมีสิทธิ์ย้ายงาน/แก้ทุก Ticket โดยตั้งใจ ไม่ใช่ช่องโหว่ตามนโยบายนั้น แต่ถ้าต้องการจำกัดผู้รับผิดชอบ route assign จะข้ามข้อจำกัดดังกล่าว
- แก้: ใช้ authorization policy เดียวกันทุก mutation ตรวจบทบาทผู้รับมอบหมายและบันทึกประวัติการย้ายงาน

## 9. กลาง — Validation และการป้องกัน request abuse ยังไม่ครอบคลุม

- main.ts ไม่มี global ValidationPipe; หลาย DTO มี decorators แต่ controller ไม่เรียก pipe จึงไม่ได้ตรวจจริงทุก route เช่น create/update Ticket, status และแก้ roles ใน admin
- ไม่พบ app-level rate limiting หรือ CSRF token/origin validation สำหรับ mutation; CORS ไม่ใช่ตัวแทน CSRF protection ส่วน SameSite=Lax ช่วยจำกัดบางกรณีอยู่แล้ว
- `GET /api/auth/logout` เปลี่ยนสถานะ session ผ่าน GET สามารถถูกบังคับ logout ด้วย top-level navigation ได้
- `cache/app-cache.service.ts:11` เป็น Map ไม่มี max entries และลบ expired entry เฉพาะเมื่อมีการอ่าน key เดิม; public pagination สร้าง key ได้หลายค่า เสี่ยง memory growth ยังไม่ได้ load test
- แก้: validation แบบ whitelist/transform ที่เลือกให้เหมาะกับ DTO, CSRF protection สำหรับ cookie-auth mutations, เปลี่ยน logout เป็น POST, rate limits/quotas, จำกัดขนาด cache และ evict expired entries

## 10. กลาง/ต่ำ — Debug endpoint, browser cache และ deployment hardening

- `/api/auth/debug/session` ได้ HTTP 200 โดยไม่ Login และคืนโครงสร้าง session; source จะคืน user object ด้วยเมื่อมี session ไม่ใช่หลักฐานว่าอ่าน session ของผู้อื่นได้ แต่ endpoint นี้ไม่จำเป็นใน production
- ไฟล์แนบตั้ง `Cache-Control: private, max-age=86400` เก็บได้ 1 วัน แม้ Logout แล้ว browser อาจมีสำเนาเดิม เหมาะพิจารณา `private, no-store` หากมีข้อมูลอ่อนไหว
- Local frontend ไม่ส่ง CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy หรือ HSTS; ยังไม่ได้ตรวจ headers ที่ reverse proxy ของ production จึงไม่ยืนยันว่าขาดใน production ด้วย HSTS ควรใช้บน HTTPS เท่านั้น
- `app.module.ts:28` เปิด `synchronize: true` แม้ production เสี่ยง schema เปลี่ยนโดยไม่ผ่าน migration
- Default compose เปิด MySQL `3306:3306` และ phpMyAdmin `8081:80` โดยไม่ bind loopback; การเข้าถึงจากภายนอกขึ้นกับ firewall/network ไม่ได้ทดสอบจากภายนอก
- แก้: ปิด debug endpoint, ตั้ง cache/headers ตามชนิดข้อมูล, ใช้ migrations, จำกัด DB/admin ports ให้ internal network หรือ localhost

## สิ่งที่ตรวจพบว่าป้องกันอยู่แล้ว

- Anonymous `/api/admin/users` และ `/api/tickets/1` ได้ HTTP 403 ใน local runtime
- Ticket detail/messages/images มี guard และมีการตรวจ owner/agent/admin ใน service หลายจุด
- Session serializer โหลด roles จากฐานข้อมูลใหม่ ไม่ได้เชื่อ role จาก Sidebar
- Logout ที่แก้ก่อนหน้า destroy session, expire cookie และ frontend โหลดใหม่; ไม่ใช่การเพิกถอน session ของบัญชี Google
- ไม่พบ `dangerouslySetInnerHTML`/`innerHTML` ใน source frontend ที่ค้น; ไม่ถือเป็นการรับรองว่าไม่มี XSS เพราะเส้นทางไฟล์แนบยังมีความเสี่ยง

## ลำดับแก้ที่แนะนำ

1. ปิด legacy role routes ที่ไม่มี guard และตรวจประวัติการเปลี่ยนสิทธิ์; หมุนเวียน secrets ที่ยังใช้งานอยู่
2. ปิดเส้นทาง active content ของไฟล์แนบ เพิ่ม OAuth state และแก้ production session configuration
3. อัปเดต dependencies พร้อม regression tests; ทำ authorization/validation/CSRF ให้ครบ
4. ปรับ public data, debug/cache/headers, database exposure และเพิ่ม audit logging

## ข้อจำกัดและการทวนสอบ

ไม่มีบัญชีทดสอบครบทุก role และไม่ได้ทดสอบ browser exploit, TLS/firewall ของ production, Google Cloud configuration หรือตรวจว่า secret ถูกนำไปใช้แล้วหรือไม่ จึงไม่ใช่การรับรองความปลอดภัยครบระบบ

Reproduction test: `cd backend` แล้ว `npm test -- --runInBand role.security-audit.spec.ts` (2 tests ผ่าน หมายถึงจำลองช่องโหว่ปัจจุบันสำเร็จ ไม่ใช่ผ่านเกณฑ์ความปลอดภัย) หลังปิดช่องโหว่ต้องเปลี่ยน tests นี้ให้ assert 401/403 และไม่เรียก service
