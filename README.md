# Level Bot (Phase 1)

هذا المشروع ينفذ المرحلة الأولى فقط من نظام Level Bot.

الميزات الحالية:
- Discord bot باستخدام discord.js
- قاعدة بيانات عبر Prisma (افتراضياً SQLite، يمكن استخدام Postgres عبر DATABASE_URL)
- نظام Text XP مع Cooldown
- نظام Voice XP مع جلسات محفوظة في قاعدة البيانات
- نظام مستويات بسيط يعتمد على Total XP
- Slash commands: /level, /level @user, /top voice, /top text, /top level

الملفات المهمة:
- src/bot - كود البوت
- prisma/schema.prisma - نموذج قاعدة البيانات
- .env.example - متغيرات البيئة

بدء التشغيل محلياً:
1. انسخ .env.example إلى .env واملأ القيم (أهمها TOKEN وDATABASE_URL)
2. npm install
3. npx prisma generate
4. npx prisma migrate dev --name init
5. تشغيل البوت في الوضع التطويري: npm run dev

ملاحظات:
- لا تضع Bot Token داخل الكود. ضع قيمة TOKEN في متغيرات البيئة.
- في بيئة الإنتاج يوصى باستخدام PostgreSQL ووضع DATABASE_URL المناسب.

