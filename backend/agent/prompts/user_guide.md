
# FounderStack Agent — User Guide

This guide will help you get the most value from your AI agent.

the agent is designed to **execute work for you**, not to chat unlike ChatGPT.

Think of it as an intelligent operator connected to your CRM.

You tell it what you want done → it performs the action.

Examples:

* Create a new contact
* Add follow-up tasks
* Update deal progress
* Search information
* Organize your pipeline

The clearer your instruction, the better the result.

⚠️ AI can make mistakes. Always review important data.

---

# Core Design Principles

Understanding how the system works will help you use it effectively.

## 1. Action-First (Not Chat-First)

This AI is not meant for long conversations.

Its purpose is to:

> Save you time by doing actions instantly.

If you find yourself chatting without a goal, you are not using it optimally.

---

## 2. No Memory Between Messages

Each message starts a new session.

This is intentional and provides:

* the AI does NOT have a chat history like chatgpt, no one can aacess your conv or your data
* Higher accuracy
* No context confusion over time

Always include the information needed inside your request.

---

## 3. People-First System

Everything must be associated with a person.

This is the most important rule.

❌ Wrong
Add company TechCorp with a follow-up task.

✅ Correct
Add person Ahmad Omar, CEO at TechCorp, with a follow-up task.

Exception:
You can search tasks by company name across associated people.

---

# Voice vs Text Messages

Both voice and text are powerful — they serve different purposes.

## Voice Messages — Best For

* Creating new people
* Explaining complex situations
* Brain-dumping information quickly
* When you are busy or mobile

Voice is more natural and faster for humans.

---

## Text Messages — Best For

* Precise actions
* Searching information
* Updating fields
* Adding links, emails, numbers
* Quick task management

Text is more precise for the AI.

---

# Records Overview

## 1. Person Record

This is the central object in the system.

Important fields:

### Convert

Helps you track how close this person is to becoming a customer.

Think of it as your conversion progress indicator.

---

### Last Action

A one-line summary of the most recent interaction.

Useful before:

* Follow-ups
* Calls
* Meetings

It helps you remember context instantly.

---

### Recommended Action

Your personal reminder for the next step.

Keep it short (one line).

Example:

> Send proposal after pricing confirmation.

Note:

Currently the AI cannot automatically decide this from context.
You must tell the AI your thoughts, and it will store them.

---

## 2. Tasks

Tasks help you manage execution.

When searching tasks, always mention the status.

Example:

❌ Give me my tasks
✅ Show tasks with status todo

Available statuses:

* todo
* in progress
* done

---

# Powerful Workflows

These workflows provide the biggest time savings.

## 1. Paste Conversation → Create Everything

You can paste a full conversation with a lead and let the AI handle the rest & decide every thing:

* Create the person
* Decide stage
* Decide type
* Add notes
* Suggest tasks

you may ask what is the deffrence? let me show you:
normally in a voice or txt (without pasting the conv) msg you will decide what is the stage of this person? (qualified? lead?), what is the type? (cold lead? warm? hot? ..) also you will have to mention what is the last action you took, recomded action, and other fields... even tell what to add for tasks and notes... 

Example prompt:

This is a LinkedIn conversation I had:

[PASTE FULL CONVERSATION]

Create a CRM record.
Decide stage and type.
Add notes and suggest tasks.
Everything in English.

This is one of the most powerful ways to use the system.

---

## 2. Quick Updates

Examples:

* Update last action for Ahmad Homsi to “sent proposal”
* Add task follow up tomorrow for Sarah Omar
* Mark task proposal review as done

Fast and precise.

---

## 3. Information Retrieval

Examples:

* Show tasks with status todo
* Show people in negotiation stage
* What is the last action for Ahmad Homsi?

Instant visibility without opening dashboards.

---

# Pro Tips

## 1. Be Direct and Specific

The AI performs best with clear instructions.

Good:

> Add task follow up proposal tomorrow for Ahmad Homsi

Less good:

> I think maybe I should follow up with Ahmad Homsi

---

## 2. Use Text When Precision Matters

Especially for:

* Emails
* Phone numbers
* Links
* Names
* Status updates

Voice may introduce spelling errors.

---

## 3. Let AI Decide When Possible

You don’t always need to define everything manually.

You can say:

> Decide the stage and suggest tasks

This reduces thinking effort. and the decisions you are making in a day, this is important for ya, belive me :)

---

# Known Limitations

## 1. Associating With Existing Companies

Currently, the agent cannot attach a new person to an already existing company.

Workaround:

* Create the person with a new company
* Or create without a company and update later manually

---

## 2. Arabic / English Name Differences

If a record was created in Arabic, searching using English pronunciation may fail (and vice versa).

ex: let say you have a company named "فاوندر ستاك" if you used the voice and said the word founderstack (arabic or english) the agent may not be able to perform your desired action.

This applies to:

* Companies
* People
* Tasks

Using consistent naming improves accuracy.



# دليل مستخدم — تمّ Agent

سيساعدك هذا الدليل في تحقيق أقصى استفادة من العميل الذكي (AI Agent) الخاص بك.

هذا العميل مصمم **لتنفيذ المهام نيابة عنك**، وليس لمجرد الدردشة كما هو الحال في ChatGPT.

تعامل معه كمشغل ذكي (Intelligent Operator) متصل بنظام الـ CRM الخاص بك.

أخبره بما تريد القيام به ← وسيقوم هو بالتنفيذ.

كلما كانت تعليماتك أوضح، كانت النتيجة أفضل.

⚠️ **ملاحظة:** الذكاء الاصطناعي قد يخطئ أحياناً. يرجى دائماً مراجعة البيانات الهامة.

---

# مبادئ التصميم الأساسية

فهم كيفية عمل النظام سيساعدك على استخدامه بفعالية قصوى.

## 1. الأولوية للتنفيذ (Action-First)

هذا الوكيل ليس مخصصاً للمحادثة. الغرض منه هو:

> توفير وقتك عبر تنفيذ الإجراءات والمهام فوراً.

---

## 2. لا توجد ذاكرة بين الرسائل (No Memory)

كل رسالة ترسلها تبدأ جلسة عمل جديدة. تم تصميم النظام بهذا الشكل عمداً لضمان:

* **الخصوصية:** لا يملك الـ AI تاريخاً للمحادثات مثل ChatGPT؛ لا أحد يمكنه الوصول إلى محادثاتك أو بياناتك.
* **دقة أعلى:** تجنب خلط السياق بمرور الوقت.
* **نصيحة:** احرص دائماً على تضمين المعلومات الضرورية داخل طلبك.

---

## 3. "الأشخاص أولاً" (People-First)

كل إجراء في النظام يجب أن يكون مرتبطاً بشخص (Person). هذه هي القاعدة الأهم.

❌ **خطأ:**
*أضف شركة TechCorp مع مهمة متابعة.*

✅ **صح:**
*أضف الشخص "أحمد عمر"، مديراً تنفيذياً في شركة TechCorp، مع مهمة متابعة.*

**استثناء:** يمكنك البحث عن المهام باسم الشركة عبر الأشخاص المرتبطين بها.

---

# الرسائل الصوتية vs الرسائل النصية

كلاهما قوي، لكن لكل منهما غرض مختلف.

## الرسائل الصوتية — الأفضل لـ:

* إنشاء سجلات لأشخاص جدد.
* شرح المواقف المعقدة.
* تفريغ الأفكار والمعلومات (Brain-dumping) بسرعة.
* عندما تكون مشغولاً أو في حالة تنقل.
* *الصوت أسرع وأكثر طبيعية للبشر.*

---

## الرسائل النصية — الأفضل لـ:

* الإجراءات الدقيقة.
* البحث عن المعلومات.
* تحديث الحقول (Fields).
* إضافة الروابط، الإيميلات، والأرقام.
* إدارة المهام السريعة.
* *النص أكثر دقة بالنسبة للذكاء الاصطناعي.*

---

# نظرة عامة على السجلات (Records)

## 1. سجل الشخص (Person Record)

هذا هو الكيان المركزي في النظام. الحقول الهامة تشمل:

### التحويل (Convert)

يساعدك على تتبع مدى قرب هذا الشخص من أن يصبح عميلاً. فكر فيه كمؤشر لتقدم عملية التحويل.

### الإجراء الأخير (Last Action)

ملخص من سطر واحد لآخر تفاعل تم مع الشخص. مفيد جداً قبل:

* المتابعات (Follow-ups).
* المكالمات والاجتماعات.
* يساعدك على تذكر السياق فوراً.

### الإجراء الموصى به (Recommended Action)

تذكيرك الشخصي بالخطوة التالية. اجعله قصيراً (سطر واحد).
**مثال:** "إرسال العرض المالي بعد تأكيد الأسعار".
*ملاحظة: حالياً لا يستطيع الـ AI تحديد هذا تلقائياً من السياق. يجب أن تخبره بأفكارك وسيقوم هو بتخزينها.*

---

## 2. المهام (Tasks)

تساعدك المهام على إدارة التنفيذ. عند البحث عن المهام، اذكر الحالة (Status) دائماً.

**مثال:**
❌ *أعطني مهامي.*
✅ *أعرض لي المهام التي حالتها (todo).*

**الحالات المتاحة:**

* todo (للتنفيذ)
* in progress (قيد التنفيذ)
* done (تم الإنجاز)

---

# سير العمل الاحترافي (Powerful Workflows)

هذه الأساليب توفر لك أكبر قدر من الوقت.

## 1. نسخ المحادثة ← إنشاء كل شيء

يمكنك نسخ محادثة كاملة مع عميل محتمل (Lead) وترك الذكاء الاصطناعي يتولى الباقي ويقرر كل شيء:

* إنشاء سجل الشخص.
* تحديد المرحلة (Stage).
* تحديد النوع (Type).
* إضافة الملاحظات واقتراح المهام.

**ما الفرق؟** عادةً في الرسائل الصوتية أو النصية العادية، سيتعين عليك تحديد المرحلة (stage)=(Qualified? Lead?) والنوع(type)=(Cold? Warm?) وذكر الإجراء الأخير والموصى به... إلخ. **لكن هنا، الوكيل هو من يقرر.**

**مثال لطلب (Prompt):**

> "هذه محادثة أجريتها على LinkedIn:
> [انسخ المحادثة هنا]
> أنشئ سجلاً في الـ CRM. حدد المرحلة والنوع. أضف الملاحظات واقترح المهام. اجعل كل شيء باللغة الإنجليزية."

---

## 2. التحديثات السريعة

أمثلة:

* تحديث الإجراء الأخير "last action" لأحمد حمصي إلى "تم إرسال العرض".
* أضف مهمة متابعة غداً لسارة عمر.
* حدد مهمة "مراجعة العرض" كمنجزة (done).

---

## 3. استرجاع المعلومات

أمثلة:

* عرض المهام بحالة todo.
* عرض الأشخاص في مرحلة التفاوض (negotiation stage).
* ما هو "الإجراء الأخير" لأحمد حمصي؟

---

# نصائح احترافية (Pro Tips)

## 1. كن مباشراً ومحدداً

الذكاء الاصطناعي يعمل بشكل أفضل مع التعليمات الواضحة.

* **جيد:** "أضف مهمة متابعة العرض غداً لأحمد حمصي".
* **أقل جودة:** "أعتقد أنني ربما يجب أن أتابع مع أحمد حمصي".

## 2. استخدم النص عندما تهم الدقة

خاصة عند إدخال: (الإيميلات، أرقام الهواتف، الروابط، الأسماء، تحديثات الحالة). الصوت قد يتسبب في أخطاء إملائية.

## 3. اترك القرار للذكاء الاصطناعي عندما يكون ذلك ممكناً

لست مضطراً دائماً لتعريف كل شيء يدوياً. يمكنك قول:

> "قرر المرحلة واقترح المهام المناسبة."
> هذا يقلل من مجهود التفكير واتخاذ القرارات اليومية، وهو أمر مهم جداً لإنتاجيتك.

---

# القيود المعروفة

## 1. الربط بالشركات الموجودة مسبقاً

حالياً، لا يمكن للعميل ربط شخص جديد بشركة موجودة بالفعل في النظام تلقائياً.
**الحل البديل:**

* أنشئ الشخص مع شركة جديدة.
* أو أنشئه بدون شركة وقم بتحديثها لاحقاً يدوياً.

## 2. اختلاف الأسماء بين العربية والإنجليزية

إذا تم إنشاء سجل باللغة العربية، فقد يفشل البحث عنه باستخدام النطق الإنجليزي (والعكس صحيح).
**مثال:** إذا كان لديك شركة باسم "فاوندر ستاك" واستخدمت الصوت وقلت "FounderStack"، قد لا يتمكن العميل من العثور عليها.
*ينطبق هذا على: الشركات، الأشخاص، والمهام.* لذا، استخدام تسمية متسقة يحسن الدقة.
